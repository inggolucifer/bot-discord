const Mutex = require('./mutex'); // Assuming you have a basic in-memory mutex or similar

// Simple in-memory locking mechanism to prevent race conditions (Spam clicks/Duplication)
// For a production app with multiple node instances, use Redis. For a single VPS, in-memory is fine.
const locks = new Map();

class LockManager {
  static async acquire(key, timeoutMs = 5000) {
    if (!locks.has(key)) {
      locks.set(key, Promise.resolve());
    }

    let release;
    const lockPromise = new Promise(resolve => {
      release = resolve;
    });

    const previousLock = locks.get(key);

    // Chain the new lock
    const nextLock = previousLock.then(() => lockPromise);
    locks.set(key, nextLock);

    // Wait for the previous lock to release
    await previousLock;

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
      if (locks.get(key) instanceof Promise) {
          releaseFunction();
          // Cleanup if queue is empty (optional optimization)
      }
  }
}

module.exports = LockManager;