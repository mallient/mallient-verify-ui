// sessionTimer.ts
export function startSessionTimer({
  idleMinutes,
  warningMinutes,
  onTimeoutWarning,
  onSessionExpired,
  onTick
}: {
  idleMinutes: number;
  warningMinutes: number;
  onTimeoutWarning: () => void;
  onSessionExpired: () => void;
  onTick?: (timeLeftMs: number) => void;
}) {
  const idleMs = idleMinutes * 60 * 1000;
  const warnMs = warningMinutes * 60 * 1000;

  let timeoutId: NodeJS.Timeout;
  let warningId: NodeJS.Timeout;
  let intervalId: NodeJS.Timeout;
  let startTime = Date.now();

  const resetTimers = () => {
    clearTimeout(timeoutId);
    clearTimeout(warningId);
    clearInterval(intervalId);

    startTime = Date.now();
    const endTime = startTime + idleMs;

    console.log(`[SessionTimer] Reset at ${new Date(startTime).toLocaleTimeString()}`);

    // Emit tick updates every second
    intervalId = setInterval(() => {
      const timeLeft = Math.max(0, endTime - Date.now());
      onTick?.(timeLeft);
    }, 1000);

    warningId = setTimeout(() => {
      console.warn("[SessionTimer] Warning triggered");
      onTimeoutWarning();
    }, idleMs - warnMs);

    timeoutId = setTimeout(() => {
      console.error("[SessionTimer] Session expired");
      clearInterval(intervalId);
      onSessionExpired();
    }, idleMs);
  };

  const events = ["keydown", "click", "scroll"];
  events.forEach(e => window.addEventListener(e, resetTimers));
  resetTimers();

  return () => {
    events.forEach(e => window.removeEventListener(e, resetTimers));
    clearTimeout(timeoutId);
    clearTimeout(warningId);
    clearInterval(intervalId);
  };
}
