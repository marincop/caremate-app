// CareMate AI - speech input service.
//
// Two layers, picked at runtime:
//   - Web: the browser Web Speech API (SpeechRecognition / webkitSpeechRecognition).
//   - Native (iOS/Android): the optional `expo-speech-recognition` package, loaded
//     dynamically so the app still builds and runs when it is not installed.
//
// Nothing here may crash the app. When no engine exists we report "unsupported"
// and the caller falls back to typing.

import type { Lang } from "../i18n";

export interface StartListeningOptions {
  /** BCP-47 tag, e.g. "zh-TW". */
  lang: string;
  /** Live (interim) transcript, already joined with the finalized part. */
  onPartial?: (text: string) => void;
  /**
   * Called once when the session ends, with the finalized transcript.
   * An empty string means "ended without recognizing anything" - the caller
   * should just stop its listening UI and leave the input untouched.
   */
  onFinal: (text: string) => void;
  /** Recognition failure (permission denied, no speech, network...). */
  onError?: (error: string) => void;
}

/** UI language -> BCP-47 recognition tag. */
export function speechLangFor(lang: Lang): string {
  switch (lang) {
    case "id":
      return "id-ID";
    case "vi":
      return "vi-VN";
    default:
      return "zh-TW";
  }
}

// ---------------------------------------------------------------------------
// Small typed helpers (the dynamic import has no types, so we guard by shape)
// ---------------------------------------------------------------------------

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

function globalRecord(): UnknownRecord {
  return globalThis as unknown as UnknownRecord;
}

// ---------------------------------------------------------------------------
// Web Speech API (structural types - no DOM lib dependency on SpeechRecognition)
// ---------------------------------------------------------------------------

interface WebSpeechAlternative {
  transcript?: string;
}

interface WebSpeechResult {
  isFinal?: boolean;
  [index: number]: WebSpeechAlternative | undefined;
}

interface WebSpeechResultList {
  length: number;
  [index: number]: WebSpeechResult | undefined;
}

interface WebSpeechEvent {
  resultIndex?: number;
  results?: WebSpeechResultList;
}

interface WebSpeechErrorEvent {
  error?: string;
  message?: string;
}

interface WebSpeechRecognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort?: () => void;
  onresult: ((event: WebSpeechEvent) => void) | null;
  onerror: ((event: WebSpeechErrorEvent) => void) | null;
  onend: (() => void) | null;
}

type WebSpeechRecognitionCtor = new () => WebSpeechRecognition;

function getWebRecognitionCtor(): WebSpeechRecognitionCtor | null {
  const g = globalRecord();
  const candidate = g.SpeechRecognition ?? g.webkitSpeechRecognition;
  return typeof candidate === "function" ? (candidate as WebSpeechRecognitionCtor) : null;
}

// ---------------------------------------------------------------------------
// Native module (expo-speech-recognition) - optional dependency
// ---------------------------------------------------------------------------

interface NativePermission {
  granted?: boolean;
}

interface NativeSubscription {
  remove?: () => void;
}

interface NativeSpeechModule {
  start?: (options: UnknownRecord) => void;
  stop?: () => void;
  abort?: () => void;
  requestPermissionsAsync?: () => Promise<NativePermission>;
  addListener?: (event: string, listener: (payload: unknown) => void) => NativeSubscription | void;
}

function asNativeSpeechModule(value: unknown): NativeSpeechModule | null {
  if (!isRecord(value)) return null;
  if (typeof value.start !== "function" || typeof value.stop !== "function") return null;
  return value as unknown as NativeSpeechModule;
}

const NATIVE_MODULE_NAME = "expo-speech-recognition";

let nativeProbe: Promise<NativeSpeechModule | null> | null = null;

function loadNativeSpeechModule(): Promise<NativeSpeechModule | null> {
  if (!nativeProbe) {
    nativeProbe = (async () => {
      try {
        // Non-literal specifier: TypeScript cannot resolve it, and Metro leaves it
        // as a runtime async import that simply rejects when the package is absent.
        const specifier: string = NATIVE_MODULE_NAME;
        const mod: unknown = await import(specifier);
        if (!isRecord(mod)) return null;
        return (
          asNativeSpeechModule(mod) ??
          asNativeSpeechModule(mod.ExpoSpeechRecognitionModule) ??
          asNativeSpeechModule(mod.default)
        );
      } catch {
        return null;
      }
    })();
  }
  return nativeProbe;
}

// ---------------------------------------------------------------------------
// Session state
// ---------------------------------------------------------------------------

interface SpeechSession {
  opts: StartListeningOptions;
  /** Finalized transcript chunks. */
  finalText: string;
  /** Last live transcript (final + interim) shown to the user. */
  liveText: string;
  done: boolean;
}

let session: SpeechSession | null = null;
let webRecognition: WebSpeechRecognition | null = null;
let nativeSubscriptions: NativeSubscription[] = [];
let nativeActive = false;
let nativeModule: NativeSpeechModule | null = null;

function finishSession(): void {
  const active = session;
  if (!active || active.done) return;
  active.done = true;
  const text = (active.finalText || active.liveText).trim();
  active.opts.onFinal(text);
}

function cleanupNativeListeners(): void {
  for (const sub of nativeSubscriptions) {
    try {
      sub.remove?.();
    } catch {
      // Ignore a listener that was already torn down.
    }
  }
  nativeSubscriptions = [];
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** True when a speech engine is usable in this environment right now. */
export function isSpeechAvailable(): boolean {
  if (getWebRecognitionCtor()) return true;
  return nativeModule !== null;
}

/**
 * Async availability check. On native the engine lives in an optional package,
 * so the caller probes once on mount and enables the mic when it resolves true.
 */
export async function ensureSpeechReady(): Promise<boolean> {
  if (getWebRecognitionCtor()) return true;
  nativeModule = await loadNativeSpeechModule();
  return nativeModule !== null;
}

function startWeb(ctor: WebSpeechRecognitionCtor, opts: StartListeningOptions): boolean {
  let recognition: WebSpeechRecognition;
  try {
    recognition = new ctor();
  } catch {
    return false;
  }

  const active: SpeechSession = { opts, finalText: "", liveText: "", done: false };
  session = active;

  recognition.lang = opts.lang;
  recognition.interimResults = true;
  recognition.continuous = false;
  recognition.maxAlternatives = 1;

  recognition.onresult = (event) => {
    const results = event.results;
    if (!results) return;
    const startIndex = typeof event.resultIndex === "number" ? event.resultIndex : 0;
    let interim = "";
    for (let i = startIndex; i < results.length; i += 1) {
      const result = results[i];
      if (!result) continue;
      const transcript = result[0]?.transcript ?? "";
      if (!transcript) continue;
      if (result.isFinal) active.finalText += transcript;
      else interim += transcript;
    }
    const live = `${active.finalText}${interim}`.trim();
    if (!live || live === active.liveText) return;
    active.liveText = live;
    opts.onPartial?.(live);
  };

  recognition.onerror = (event) => {
    if (active.done) return;
    active.done = true;
    opts.onError?.(event?.error ?? event?.message ?? "speech-error");
  };

  recognition.onend = () => {
    webRecognition = null;
    finishSession();
  };

  try {
    recognition.start();
  } catch {
    webRecognition = null;
    session = null;
    opts.onError?.("speech-start-failed");
    return false;
  }

  webRecognition = recognition;
  return true;
}

async function startNative(opts: StartListeningOptions): Promise<boolean> {
  const mod = nativeModule ?? (await loadNativeSpeechModule());
  nativeModule = mod;
  if (!mod) return false;

  try {
    if (typeof mod.requestPermissionsAsync === "function") {
      const permission = await mod.requestPermissionsAsync();
      if (permission && permission.granted === false) {
        opts.onError?.("permission-denied");
        return true;
      }
    }
  } catch {
    // Some builds grant the permission implicitly; let start() decide instead.
  }

  const active: SpeechSession = { opts, finalText: "", liveText: "", done: false };
  session = active;
  cleanupNativeListeners();

  const listen = (event: string, handler: (payload: unknown) => void) => {
    if (typeof mod.addListener !== "function") return;
    const sub = mod.addListener(event, handler);
    if (sub) nativeSubscriptions.push(sub);
  };

  listen("result", (payload) => {
    if (!isRecord(payload)) return;
    let transcript = "";
    if (Array.isArray(payload.results)) {
      const first = payload.results[0];
      if (isRecord(first) && typeof first.transcript === "string") transcript = first.transcript;
    }
    if (payload.isFinal === true) {
      if (transcript) active.finalText = transcript;
      finishSession();
      return;
    }
    if (!transcript) return;
    const live = `${active.finalText}${transcript}`.trim();
    if (!live || live === active.liveText) return;
    active.liveText = live;
    opts.onPartial?.(live);
  });

  listen("error", (payload) => {
    if (active.done) return;
    active.done = true;
    const code = isRecord(payload) && typeof payload.error === "string" ? payload.error : "speech-error";
    opts.onError?.(code);
  });

  listen("end", () => {
    nativeActive = false;
    finishSession();
  });

  try {
    mod.start?.({ lang: opts.lang, interimResults: true, continuous: false });
  } catch {
    cleanupNativeListeners();
    session = null;
    opts.onError?.("speech-start-failed");
    return true;
  }

  nativeActive = true;
  return true;
}

/**
 * Start listening. Resolves once the engine has been handed the request; the
 * transcript arrives through the callbacks. Rejects only when no engine exists.
 */
export async function startListening(opts: StartListeningOptions): Promise<void> {
  stopListening();

  const webCtor = getWebRecognitionCtor();
  if (webCtor) {
    if (startWeb(webCtor, opts)) return;
  }

  const started = await startNative(opts);
  if (!started) {
    opts.onError?.("speech-unsupported");
    throw new Error("Speech recognition is not available in this environment.");
  }
}

/** Stop the current session, if any. Safe to call at any time. */
export function stopListening(): void {
  const recognition = webRecognition;
  webRecognition = null;
  if (recognition) {
    try {
      recognition.stop();
    } catch {
      // Already ended - nothing to do.
    }
  }

  if (nativeActive) {
    nativeActive = false;
    const mod = nativeModule;
    try {
      mod?.stop?.();
    } catch {
      // Already ended - nothing to do.
    }
  }
  cleanupNativeListeners();

  // Close the session with the best transcript we have. `finishSession` is
  // idempotent, so a late "end" event from the engine is harmless.
  finishSession();
  session = null;
}
