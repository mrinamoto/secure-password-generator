export function safeParse(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

export function readStorage(storageName, key, fallback) {
  try {
    const storage = globalThis.window?.[storageName];
    if (!storage) return fallback;
    return safeParse(storage.getItem(key), fallback);
  } catch {
    return fallback;
  }
}

export function writeStorage(storageName, key, value) {
  try {
    const storage = globalThis.window?.[storageName];
    if (!storage) return false;
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
