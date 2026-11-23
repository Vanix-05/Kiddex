// "New code" for one Student (lost card or forgotten PIN code). Pure, so
// `npm run test-students` can check exactly what changes and what is kept.

/**
 * The changes saved with a new one-time code:
 * - the new code and when it was made (the old code stops working),
 * - no PIN code any more (the Student makes a new one with the code),
 * - tokenVersion + 1, so any open Student login ends,
 * - the wrong-tries count and lock cleared.
 * NOT changed on purpose: registeredAt, the buddy, the setup and all progress.
 */
export function newCodeChanges(code: string, now: Date) {
  return {
    oneTimeCode: code,
    codeMadeAt: now,
    pinHash: null,
    tokenVersion: { increment: 1 },
    failedLogins: 0,
    lockedUntil: null,
  };
}
