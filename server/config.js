export const PORT =
  process.env.PORT || 3000;

export const SESSION_MS =
  3 * 60 * 60 * 1000; // 3 hours

export const CLOCK_SLACK_MS =
  60 * 1000;

export const HEARTBEAT_MS =
  15 * 1000;

export const SWEEP_MS =
  30 * 1000;

export const JOIN_TIMEOUT_MS =
  10 * 1000;

export const ID_PATTERN =
  /^[A-Za-z0-9_-]{8,64}$/;