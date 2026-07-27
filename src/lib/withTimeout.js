// src/lib/withTimeout.js
// Wraps a promise so it rejects after `ms` milliseconds if it hasn't
// resolved yet. Needed because on mobile networks, fetch calls can
// sometimes hang indefinitely instead of failing cleanly — a plain
// try/catch does nothing for a promise that never settles at all.
export function withTimeout(promise, ms = 8000, label = "request") {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ]);
}