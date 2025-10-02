const WHISPER_ENV = import.meta.env as Record<string, string | undefined>;

const trimOrUndefined = (value: string | undefined): string | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const isLocalhost = (): boolean => {
  if (typeof window === "undefined") {
    return false;
  }

  const { hostname } = window.location;
  return hostname === "localhost" || hostname === "127.0.0.1";
};

export const WHISPER_CDN_BASE_URL = "https://ai-models.b-cdn.net";
export const WHISPER_LOCAL_MODEL_URL = "http://localhost:3001/onnx-community/whisper-small";
export const WHISPER_LOCAL_CHUNK_SERVER_URL = "http://localhost:3001";

export const getPreferredWhisperModelUrl = (): string => {
  const envUrl = trimOrUndefined(WHISPER_ENV.VITE_WHISPER_MODEL_URL);
  if (envUrl) {
    return envUrl;
  }

  if (isLocalhost()) {
    return WHISPER_LOCAL_MODEL_URL;
  }

  return WHISPER_CDN_BASE_URL;
};

export const getPreferredChunkServerUrl = (): string => {
  const envUrl = trimOrUndefined(WHISPER_ENV.VITE_WHISPER_CHUNK_SERVER_URL);
  if (envUrl) {
    return envUrl;
  }

  if (isLocalhost()) {
    return WHISPER_LOCAL_CHUNK_SERVER_URL;
  }

  return WHISPER_CDN_BASE_URL;
};

export const shouldUseChunkedDownload = (baseUrl?: string): boolean => {
  const envFlag = trimOrUndefined(WHISPER_ENV.VITE_WHISPER_CHUNKED);
  if (envFlag === "true") {
    return true;
  }

  if (envFlag === "false") {
    return false;
  }

  const resolvedUrl = baseUrl ?? getPreferredChunkServerUrl();
  return /^https?:\/\/(localhost|127\.0\.0\.1)/.test(resolvedUrl);
};

export type WhisperModelVariant = "tiny" | "small";

export const buildWhisperModelMap = (
  preferredUrl: string
): Record<WhisperModelVariant, string> => {
  const variantPattern = /whisper-(small|tiny|base)/;

  const smallUrl = variantPattern.test(preferredUrl)
    ? preferredUrl.replace(variantPattern, "whisper-small")
    : preferredUrl;

  const tinyUrl = variantPattern.test(preferredUrl)
    ? preferredUrl.replace(variantPattern, "whisper-tiny")
    : preferredUrl;

  return {
    small: smallUrl,
    tiny: tinyUrl,
  };
};
