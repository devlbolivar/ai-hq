import { ZOOM_STEP, type Point } from '@ai-hq/domain';

/** Camera actions the mouse drives; the store provides them. */
export interface MouseCameraActions {
  panBy(delta: Point): void;
  zoomAt(anchor: Point, factor: number): void;
}

/** The fields of a `PointerEvent` the mouse input reads. */
export interface PointerInfo {
  readonly button: number;
  readonly clientX: number;
  readonly clientY: number;
  readonly target: EventTarget | null;
}

/** The fields of a `WheelEvent` the mouse input reads. */
export interface WheelInfo {
  readonly clientX: number;
  readonly clientY: number;
  readonly deltaY: number;
  readonly deltaMode: number;
  readonly target: EventTarget | null;
  preventDefault(): void;
}

export interface MouseInput {
  handlePointerDown(event: PointerInfo): void;
  handlePointerMove(event: PointerInfo): void;
  handlePointerUp(event: PointerInfo): void;
  handleWheel(event: WheelInfo): void;
}

/** A press must move more than this before it counts as a drag (research R6). */
export const DRAG_THRESHOLD_PX = 4;

const PRIMARY_BUTTON = 0;
/** Pixels (deltaMode 0) and lines (deltaMode 1) that make one wheel notch; pages count as one. */
const PX_PER_NOTCH = 100;
const LINES_PER_NOTCH = 3;

function startsOnUiControl(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest('[data-ui-control]') !== null;
}

function wheelNotches({ deltaY, deltaMode }: WheelInfo): number {
  if (deltaMode === 1) return deltaY / LINES_PER_NOTCH;
  if (deltaMode === 2) return deltaY;
  return deltaY / PX_PER_NOTCH;
}

/**
 * Translates pointer and wheel events into camera actions. `element` is the canvas host; wheel
 * anchors are made relative to it.
 */
export function createMouseInput(actions: MouseCameraActions, element?: Element): MouseInput {
  let press: { start: Point; last: Point; dragging: boolean } | null = null;

  return {
    handlePointerDown(event) {
      if (event.button !== PRIMARY_BUTTON || startsOnUiControl(event.target)) return;
      const at = { x: event.clientX, y: event.clientY };
      press = { start: at, last: at, dragging: false };
    },
    handlePointerMove(event) {
      if (!press) return;
      const at = { x: event.clientX, y: event.clientY };
      if (!press.dragging) {
        const moved = Math.hypot(at.x - press.start.x, at.y - press.start.y);
        if (moved <= DRAG_THRESHOLD_PX) return;
        press.dragging = true;
      }
      actions.panBy({ x: at.x - press.last.x, y: at.y - press.last.y });
      press.last = at;
    },
    handlePointerUp() {
      press = null;
    },
    handleWheel(event) {
      if (event.deltaY === 0 || startsOnUiControl(event.target)) return;
      event.preventDefault();
      const origin = element?.getBoundingClientRect() ?? { left: 0, top: 0 };
      actions.zoomAt(
        { x: event.clientX - origin.left, y: event.clientY - origin.top },
        ZOOM_STEP ** -wheelNotches(event),
      );
    },
  };
}

/**
 * Wires `input` to the canvas host: presses and wheel on the element, the rest of the drag on the
 * window so it continues outside the canvas. Returns a detach function.
 */
export function attachMouse(element: HTMLElement, input: MouseInput): () => void {
  const onDown = (e: Event) => input.handlePointerDown(e as PointerEvent);
  const onMove = (e: Event) => input.handlePointerMove(e as PointerEvent);
  const onUp = (e: Event) => input.handlePointerUp(e as PointerEvent);
  const onWheel = (e: Event) => input.handleWheel(e as WheelEvent);
  const win = element.ownerDocument.defaultView ?? window;

  element.addEventListener('pointerdown', onDown);
  element.addEventListener('wheel', onWheel, { passive: false });
  win.addEventListener('pointermove', onMove);
  win.addEventListener('pointerup', onUp);
  win.addEventListener('pointercancel', onUp);

  return () => {
    element.removeEventListener('pointerdown', onDown);
    element.removeEventListener('wheel', onWheel);
    win.removeEventListener('pointermove', onMove);
    win.removeEventListener('pointerup', onUp);
    win.removeEventListener('pointercancel', onUp);
  };
}
