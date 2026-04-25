const configuredApiBaseUrl = process.env.REACT_APP_API_BASE_URL;
const isBrowser = typeof window !== "undefined";
const localHostname =
  isBrowser &&
  (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

export const API_BASE_URL =
  configuredApiBaseUrl ||
  (localHostname ? `http://${window.location.hostname}:5000/api` : "/api");
export const STORAGE_KEY = "sevalink-auth";

export function getStoredSession() {
  const value = localStorage.getItem(STORAGE_KEY);
  return value ? JSON.parse(value) : null;
}

export function setStoredSession(session) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearStoredSession() {
  localStorage.removeItem(STORAGE_KEY);
}

export function readJsonStorage(key, fallbackValue) {
  const rawValue = localStorage.getItem(key);
  return rawValue ? JSON.parse(rawValue) : fallbackValue;
}

export function writeJsonStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function getAssetUrl(path) {
  if (!path) {
    return "";
  }

  if (path.startsWith("http")) {
    return path;
  }

  const assetHost =
    process.env.REACT_APP_ASSET_BASE_URL ||
    API_BASE_URL.replace(/\/api\/?$/, "") ||
    "";

  return assetHost ? `${assetHost}${path}` : path;
}
