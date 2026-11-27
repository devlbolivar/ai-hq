import { afterEach, describe, expect, it, vi } from 'vitest';
import { ZOOM_STEP } from '@ai-hq/domain';
import {
  attachMouse,
  createMouseInput,
  DRAG_THRESHOLD_PX,
  type MouseCameraActions,
} from '../../src/input/mouse';

function makeActions() {
  return { panBy: vi.fn(), zoomAt: vi.fn() } satisfies MouseCameraActions;
}

const canvas = () => document.body;

function pointer(clientX: number, clientY: number, overrides: Record<string, unknown> = {}) {
  return { button: 0, clientX, clientY, target: canvas(), ...overrides };
}

function wheel(clientX: number, clientY: number, deltaY: number, overrides = {}) {
  return {
    clientX,
    clientY,
    deltaY,
    deltaMode: 0,
    target: canvas(),
    preventDefault: vi.fn(),
    ...overrides,
  };
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('mouse input — drag to pan (FR-013)', () => {
  it('uses a 4 px drag threshold', () => {
    expect(DRAG_THRESHOLD_PX).toBe(4);
  });

  it('pans by the full pointer delta once the threshold is passed, then incrementally', () => {
    const actions = makeActions();
    const mouse = createMouseInput(actions);
    mouse.handlePointerDown(pointer(100, 100));
    mouse.handlePointerMove(pointer(110, 105));
    expect(actions.panBy).toHaveBeenLastCalledWith({ x: 10, y: 5 });
    mouse.handlePointerMove(pointer(130, 95));
    expect(actions.panBy).toHaveBeenLastCalledWith({ x: 20, y: -10 });
    mouse.handlePointerUp(pointer(130, 95));
    mouse.handlePointerMove(pointer(200, 200));
    expect(actions.panBy).toHaveBeenCalledTimes(2);
  });

  it('does not pan for movements of 4 px or less', () => {
    const actions = makeActions();
    const mouse = createMouseInput(actions);
    mouse.handlePointerDown(pointer(100, 100));
    mouse.handlePointerMove(pointer(103, 102));
    mouse.handlePointerMove(pointer(104, 100));
    mouse.handlePointerUp(pointer(104, 100));
    expect(actions.panBy).not.toHaveBeenCalled();
  });

  it('ignores moves without a pressed primary button', () => {
    const actions = makeActions();
    const mouse = createMouseInput(actions);
    mouse.handlePointerMove(pointer(300, 300));
    mouse.handlePointerDown(pointer(100, 100, { button: 2 }));
    mouse.handlePointerMove(pointer(200, 200));
    mouse.handlePointerDown(pointer(100, 100, { button: 1 }));
    mouse.handlePointerMove(pointer(200, 200));
    expect(actions.panBy).not.toHaveBeenCalled();
  });

  it('ignores drags that start on a [data-ui-control] element', () => {
    document.body.innerHTML = '<button data-ui-control><span>Recentrar</span></button>';
    const label = document.querySelector('span');
    const actions = makeActions();
    const mouse = createMouseInput(actions);
    mouse.handlePointerDown(pointer(100, 100, { target: label }));
    mouse.handlePointerMove(pointer(200, 200));
    expect(actions.panBy).not.toHaveBeenCalled();
  });
});

describe('mouse input — wheel zoom (FR-014)', () => {
  it('zooms in one ZOOM_STEP per notch at the cursor', () => {
    const actions = makeActions();
    const mouse = createMouseInput(actions);
    const event = wheel(320, 240, -100);
    mouse.handleWheel(event);
    expect(actions.zoomAt).toHaveBeenCalledWith({ x: 320, y: 240 }, expect.closeTo(ZOOM_STEP, 10));
    expect(event.preventDefault).toHaveBeenCalled();
  });

  it('zooms out one step per notch and scales with the notch count', () => {
    const actions = makeActions();
    const mouse = createMouseInput(actions);
    mouse.handleWheel(wheel(10, 20, 100));
    expect(actions.zoomAt).toHaveBeenLastCalledWith({ x: 10, y: 20 }, expect.closeTo(1 / ZOOM_STEP, 10));
    mouse.handleWheel(wheel(10, 20, -200));
    expect(actions.zoomAt).toHaveBeenLastCalledWith(
      { x: 10, y: 20 },
      expect.closeTo(ZOOM_STEP ** 2, 10),
    );
  });

  it('treats 3 lines (deltaMode 1) as one notch', () => {
    const actions = makeActions();
    const mouse = createMouseInput(actions);
    mouse.handleWheel(wheel(0, 0, -3, { deltaMode: 1 }));
    expect(actions.zoomAt).toHaveBeenLastCalledWith({ x: 0, y: 0 }, expect.closeTo(ZOOM_STEP, 10));
  });

  it('uses coordinates relative to the canvas element', () => {
    const host = document.createElement('div');
    host.getBoundingClientRect = () => ({ left: 50, top: 30 }) as DOMRect;
    const actions = makeActions();
    const mouse = createMouseInput(actions, host);
    mouse.handleWheel(wheel(150, 130, -100));
    expect(actions.zoomAt).toHaveBeenCalledWith({ x: 100, y: 100 }, expect.closeTo(ZOOM_STEP, 10));
  });

  it('ignores wheel without vertical delta and wheel over a [data-ui-control]', () => {
    document.body.innerHTML = '<button data-ui-control>Recentrar</button>';
    const button = document.querySelector('button');
    const actions = makeActions();
    const mouse = createMouseInput(actions);
    mouse.handleWheel(wheel(0, 0, 0));
    mouse.handleWheel(wheel(0, 0, -100, { target: button }));
    expect(actions.zoomAt).not.toHaveBeenCalled();
  });
});

describe('attachMouse', () => {
  function fire(target: EventTarget, type: string, init: MouseEventInit) {
    target.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, ...init }));
  }

  it('listens for pointerdown and wheel on the element and the rest of the drag on the window', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const actions = makeActions();
    const detach = attachMouse(host, createMouseInput(actions, host));

    fire(host, 'pointerdown', { button: 0, clientX: 10, clientY: 10 });
    fire(window, 'pointermove', { clientX: 30, clientY: 10 });
    fire(window, 'pointerup', { clientX: 30, clientY: 10 });
    expect(actions.panBy).toHaveBeenCalledWith({ x: 20, y: 0 });

    const wheelEvent = new WheelEvent('wheel', { deltaY: -100, cancelable: true, bubbles: true });
    host.dispatchEvent(wheelEvent);
    expect(actions.zoomAt).toHaveBeenCalledTimes(1);
    expect(wheelEvent.defaultPrevented).toBe(true);

    detach();
    fire(host, 'pointerdown', { button: 0, clientX: 10, clientY: 10 });
    fire(window, 'pointermove', { clientX: 90, clientY: 10 });
    host.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, cancelable: true }));
    expect(actions.panBy).toHaveBeenCalledTimes(1);
    expect(actions.zoomAt).toHaveBeenCalledTimes(1);
  });
});
