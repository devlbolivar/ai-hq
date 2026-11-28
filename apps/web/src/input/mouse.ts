import { ZOOM_STEP, type Point } from '@ai-hq/domain';

/** Store actions the mouse drives: camera (drag, wheel), hover (move, leave) and clicks. */
export interface MouseActions {
  panBy(delta: Point): void;
  zoomAt(anchor: Point, factor: number): void;
  /** Pointer position relative to the canvas host. */
  pointerMove(screenPoint: Point): void;
  pointerLeave(): void;
  /** A click without drag at a host-relative point: the store decides what it picks (FR-026). */
  clickAt(screenPoint: Point): void;
  /** While the editor dialog is open no office gesture acts (FR-029). */
  isEditorOpen(): boolean;
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
  handlePointerCancel(): void;
  handleWheel(event: WheelInfo): void;
  handlePointerLeave(): void;
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
 * Translates pointer and wheel events into camera, hover and click actions. `element` is the
 * canvas host; wheel anchors, hover and click points are made relative to it.
 */
export function createMouseInput(actions: MouseActions, element?: Element): MouseInput {
  let press: { start: Point; last: Point; dragging: boolean } | null = null;
  let hovering = false;

  const relative = (clientX: number, clientY: number): Point => {
    const origin = element?.getBoundingClientRect() ?? { left: 0, top: 0 };
    return { x: clientX - origin.left, y: clientY - origin.top };
  };

  /** Over the scene: inside the host (when known) and not over a UI control on top of it. */
  const overScene = (target: EventTarget | null): boolean =>
    !startsOnUiControl(target) &&
    (!element || (target instanceof Node && element.contains(target)));

  const leave = () => {
    if (!hovering) return;
    hovering = false;
    actions.pointerLeave();
  };

  const hover = (event: PointerInfo) => {
    if (actions.isEditorOpen() || !overScene(event.target)) return leave();
    hovering = true;
    actions.pointerMove(relative(event.clientX, event.clientY));
  };

  return {
    handlePointerDown(event) {
      if (actions.isEditorOpen()) return;
      if (event.button !== PRIMARY_BUTTON || startsOnUiControl(event.target)) return;
      const at = { x: event.clientX, y: event.clientY };
      press = { start: at, last: at, dragging: false };
    },
    handlePointerMove(event) {
      // The editor opened mid-gesture: the press no longer acts behind the modal.
      if (actions.isEditorOpen()) press = null;
      if (!press) return hover(event);
      const at = { x: event.clientX, y: event.clientY };
      if (!press.dragging) {
        const moved = Math.hypot(at.x - press.start.x, at.y - press.start.y);
        if (moved <= DRAG_THRESHOLD_PX) return hover(event);
        press.dragging = true;
      }
      actions.panBy({ x: at.x - press.last.x, y: at.y - press.last.y });
      press.last = at;
      hover(event);
    },
    handlePointerUp(event) {
      if (actions.isEditorOpen()) press = null;
      if (press?.dragging) hover(event);
      const click = press !== null && !press.dragging;
      press = null;
      if (click) actions.clickAt(relative(event.clientX, event.clientY));
    },
    handlePointerCancel() {
      press = null;
    },
    handleWheel(event) {
      if (actions.isEditorOpen()) return;
      if (event.deltaY === 0 || startsOnUiControl(event.target)) return;
      event.preventDefault();
      actions.zoomAt(relative(event.clientX, event.clientY), ZOOM_STEP ** -wheelNotches(event));
    },
    handlePointerLeave: leave,
  };
}

/**
 * Wires `input` to the canvas host: presses, wheel and leave on the element, moves (hover and the
 * rest of the drag) on the window so a drag continues outside the canvas. Returns a detach function.
 */
export function attachMouse(element: HTMLElement, input: MouseInput): () => void {
  const onDown = (e: Event) => input.handlePointerDown(e as PointerEvent);
  const onMove = (e: Event) => input.handlePointerMove(e as PointerEvent);
  const onUp = (e: Event) => input.handlePointerUp(e as PointerEvent);
  const onWheel = (e: Event) => input.handleWheel(e as WheelEvent);
  const onLeave = () => input.handlePointerLeave();
  const win = element.ownerDocument.defaultView ?? window;

  element.addEventListener('pointerdown', onDown);
  element.addEventListener('wheel', onWheel, { passive: false });
  element.addEventListener('pointerleave', onLeave);
  win.addEventListener('pointermove', onMove);
  win.addEventListener('pointerup', onUp);
  win.addEventListener('pointercancel', input.handlePointerCancel);

  return () => {
    element.removeEventListener('pointerdown', onDown);
    element.removeEventListener('wheel', onWheel);
    element.removeEventListener('pointerleave', onLeave);
    win.removeEventListener('pointermove', onMove);
    win.removeEventListener('pointerup', onUp);
    win.removeEventListener('pointercancel', input.handlePointerCancel);
  };
}
