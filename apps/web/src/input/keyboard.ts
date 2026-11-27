import { ZOOM_STEP, type Point, type Viewport } from '@ai-hq/domain';

/** Camera and debug actions provided by the store. */
export interface KeyboardCameraActions {
  panBy(delta: Point): void;
  zoomAt(anchor: Point, factor: number): void;
  recenter(): void;
  /** Turns debug mode on or off (FR-023). */
  toggleDebug(): void;
  getViewport(): Viewport;
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
  return target instanceof Element && target.closest('input, textarea, select, [contenteditable]') !== null;
}

export function createKeyboardInput(actions: KeyboardCameraActions): KeyboardInput {
  const held = new Set<string>();

  return {
    handleKeyDown(event) {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
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
