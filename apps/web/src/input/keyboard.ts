import { ZOOM_STEP, type Point, type Viewport } from '@ai-hq/domain';

/** Camera, debug and selection actions provided by the store. */
export interface KeyboardCameraActions {
  panBy(delta: Point): void;
  zoomAt(anchor: Point, factor: number): void;
  recenter(): void;
  /** Turns debug mode on or off (FR-023). */
  toggleDebug(): void;
  getViewport(): Viewport;
  /** `1`–`9`: the n-th agent (FR-029). */
  selectNumber(n: number): void;
  /** `Tab` (1) / `Shift+Tab` (−1). */
  cycle(direction: 1 | -1): void;
  /** `Esc`. */
  deselect(): void;
}

export interface KeyboardInput {
  handleKeyDown(event: KeyboardEvent): void;
  handleKeyUp(event: KeyboardEvent): void;
  /** Advance held-key panning by dtMs milliseconds. */
  tick(dtMs: number): void;
  /** Release all held keys on window blur. */
  releaseAll(): void;
}

export const KEY_PAN_SPEED = 600;

const PAN_KEYS = new Set(['arrowup', 'w', 'arrowdown', 's', 'arrowleft', 'a', 'arrowright', 'd']);

function isEditable(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    target.closest('input, textarea, select, [contenteditable]') !== null
  );
}

/**
 * The 002 keys also leave buttons and links alone, so `Tab` keeps moving focus and `Esc`/digits do
 * not hijack a focused control (FR-029); the 001 shortcuts keep their own rule.
 */
function isFocusedControl(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    target.closest('input, textarea, select, button, a[href], [contenteditable]') !== null
  );
}

/** Agent selection (`1`–`9`, `Tab`, `Shift+Tab`, `Esc`); true when the key acted. */
function handleSelectionKey(event: KeyboardEvent, actions: KeyboardCameraActions): boolean {
  if (isFocusedControl(event.target)) return false;
  if (/^[1-9]$/.test(event.key)) actions.selectNumber(Number(event.key));
  else if (event.key === 'Tab') actions.cycle(event.shiftKey ? -1 : 1);
  else if (event.key === 'Escape') actions.deselect();
  else return false;
  return true;
}

export function createKeyboardInput(actions: KeyboardCameraActions): KeyboardInput {
  const held = new Set<string>();

  return {
    handleKeyDown(event) {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (handleSelectionKey(event, actions)) {
        event.preventDefault();
        return;
      }
      if (isEditable(event.target)) return;

      const key = event.key.toLowerCase();
      if (PAN_KEYS.has(key)) {
        held.add(key);
      } else if (key === '+' || key === '=' || key === '-') {
        const { width, height } = actions.getViewport();
        actions.zoomAt({ x: width / 2, y: height / 2 }, key === '-' ? 1 / ZOOM_STEP : ZOOM_STEP);
      } else if (key === '0') {
        actions.recenter();
      } else if (key === 'g') {
        // Holding G must not flicker debug mode on and off.
        if (!event.repeat) actions.toggleDebug();
      } else {
        return;
      }
      event.preventDefault();
    },
    handleKeyUp(event) {
      held.delete(event.key.toLowerCase());
    },
    tick(dtMs) {
      const left = held.has('arrowleft') || held.has('a');
      const right = held.has('arrowright') || held.has('d');
      const up = held.has('arrowup') || held.has('w');
      const down = held.has('arrowdown') || held.has('s');
      const distance = (KEY_PAN_SPEED * dtMs) / 1000;
      const x = (Number(left) - Number(right)) * distance;
      const y = (Number(up) - Number(down)) * distance;
      if (x || y) actions.panBy({ x, y });
    },
    releaseAll() {
      held.clear();
    },
  };
}

/** Wire keyboard and blur listeners to the window and return a detach function. */
export function attachKeyboard(target: Window, input: KeyboardInput): () => void {
  const { handleKeyDown, handleKeyUp, releaseAll } = input;
  const onFocusIn = (event: FocusEvent) => {
    if (isEditable(event.target)) releaseAll();
  };
  target.addEventListener('focusin', onFocusIn);
  target.addEventListener('keydown', handleKeyDown);
  target.addEventListener('keyup', handleKeyUp);
  target.addEventListener('blur', releaseAll);

  return () => {
    target.removeEventListener('focusin', onFocusIn);
    target.removeEventListener('keydown', handleKeyDown);
    target.removeEventListener('keyup', handleKeyUp);
    target.removeEventListener('blur', releaseAll);
  };
}
