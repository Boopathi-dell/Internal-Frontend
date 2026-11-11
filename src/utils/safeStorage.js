const memorySession = new Map();
const memoryLocal = new Map();

function safeRead(storageGetter, memFallback, key, fallback = "") {
  try {
    const val = storageGetter().getItem(key);
    if (val !== null && val !== undefined) return val;
  } catch {
    // Blocked in private browsing / restricted mobile WebViews
  }
  return memFallback.has(key) ? memFallback.get(key) : fallback;
}

function safeWrite(storageGetter, memFallback, key, value) {
  const strVal = String(value ?? "");
  memFallback.set(key, strVal);
  try {
    storageGetter().setItem(key, strVal);
  } catch {
    // Keep working seamlessly via in-memory fallback when storage is unavailable
  }
}

function safeDelete(storageGetter, memFallback, key) {
  memFallback.delete(key);
  try {
    storageGetter().removeItem(key);
  } catch {
    // Ignore storage removal errors
  }
}

export const safeGetSession = (key, fallback = "") =>
  safeRead(() => window.sessionStorage, memorySession, key, fallback);

export const safeSetSession = (key, value) =>
  safeWrite(() => window.sessionStorage, memorySession, key, value);

export const safeRemoveSession = (key) =>
  safeDelete(() => window.sessionStorage, memorySession, key);

export const safeGetLocal = (key, fallback = "") =>
  safeRead(() => window.localStorage, memoryLocal, key, fallback);

export const safeSetLocal = (key, value) =>
  safeWrite(() => window.localStorage, memoryLocal, key, value);

export const safeRemoveLocal = (key) =>
  safeDelete(() => window.localStorage, memoryLocal, key);

export const safeParseArray = (raw) => {
  if (!raw) return [];
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const safeFormatDate = (value, fallback = "") => {
  if (!value) return fallback;
  const d = new Date(value);
  if (isNaN(d.getTime())) return fallback;
  try {
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return d.toDateString();
  }
};

export const safeFormatDateTime = (value, fallback = "") => {
  if (!value) return fallback;
  const d = new Date(value);
  if (isNaN(d.getTime())) return fallback;
  try {
    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return d.toDateString();
  }
};

/**
 * Checks whether browser Notification API is safe to read/invoke on the current device.
 */
export const getNotificationPermissionSafe = () => {
  try {
    if (typeof window !== "undefined" && "Notification" in window && window.Notification) {
      return window.Notification.permission || "default";
    }
  } catch {
    // Some mobile WebViews throw on accessing Notification
  }
  return "default";
};

export const requestNotificationPermissionSafe = async () => {
  try {
    if (typeof window === "undefined" || !("Notification" in window) || !window.Notification) {
      return "denied";
    }
    if (typeof window.Notification.requestPermission !== "function") {
      return "denied";
    }
    const result = window.Notification.requestPermission();
    if (result && typeof result.then === "function") {
      return await result;
    }
    return result || getNotificationPermissionSafe();
  } catch {
    return "denied";
  }
};
