const STORAGE_KEY = 'plant-therapy-session';

const sessionStore = {
  save(key, value) {
    try {
      const existing = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '{}');
      existing[key] = value;
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    } catch {
      // sessionStorage unavailable or quota exceeded — silently ignore
    }
  },

  load(key, defaultValue = undefined) {
    try {
      const existing = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '{}');
      return key in existing ? existing[key] : defaultValue;
    } catch {
      return defaultValue;
    }
  },

  clear() {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  },
};

export default sessionStore;
