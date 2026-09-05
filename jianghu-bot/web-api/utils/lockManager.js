// Simple in-memory locking mechanism to prevent race conditions (Spam clicks/Duplication)
// For a production app with multiple node instances, use Redis. For a single VPS, in-memory is fine.
const locks = new Map();

class LockManager {
  static async acquire(key, timeoutMs = 5000) {
    if (locks.has(key)) {
      // Lock is already held by someone else, return false to trigger 429
      return false;
    }

    let release;
    const lockPromise = new Promise(resolve => {
      release = resolve;
    });

    locks.set(key, lockPromise);

    // Timeout fallback just in case something gets permanently stuck
    const timeout = setTimeout(() => {
        console.warn(`Lock timeout triggered for key: ${key}`);
        this.release(key, release);
    }, timeoutMs);

    return () => {
        clearTimeout(timeout);
        this.release(key, release);
    };
  }

  static release(key, releaseFunction) {
      if (locks.has(key)) {
          locks.delete(key);
          if (typeof releaseFunction === 'function') releaseFunction();
      }
  }
}

module.exports = LockManager;