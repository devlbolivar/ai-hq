/** Idle pause before an autonomous decision (FR-016). */
export const IDLE_PAUSE_MS = [3000, 8000] as const;
/** Autonomous activity durations (FR-017). */
export const WORK_MS = [10000, 20000] as const;
export const BREAK_MS = [5000, 10000] as const;
/** Celebration after a natural end of `working` (FR-017). */
export const CELEBRATE_MS = 1000;
