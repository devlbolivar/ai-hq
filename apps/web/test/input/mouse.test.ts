import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  initialCamera,
  marketingLayout,
  screenToGrid,
  tileCenter,
  worldToScreen,
  ZOOM_STEP,
  type Coord,
} from '@ai-hq/domain';
import {
  attachMouse,
  createMouseInput,
  DRAG_THRESHOLD_PX,
  type MouseActions,
} from '../../src/input/mouse';

const camera = initialCamera({ width: 1280, height: 800 }, marketingLayout);

function makeActions({ debug = false } = {}) {
  return {
    panBy: vi.fn(),
    zoomAt: vi.fn(),
    pointerMove: vi.fn(),
    pointerLeave: vi.fn(),
    isDebugEnabled: vi.fn(() => debug),
    getCamera: vi.fn(() => camera),
    getLayout: vi.fn(() => marketingLayout),
    selectTile: vi.fn(),
  } satisfies MouseActions;
}

/** Screen position (relative to the canvas host) of the center of `tile`. */
function screenOf(tile: Coord) {
  return worldToScreen(camera, tileCenter(tile, marketingLayout.tile));
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
    expect(actions.zoomAt).toHaveBeenLastCalledWith(
      { x: 10, y: 20 },
      expect.closeTo(1 / ZOOM_STEP, 10),
    );
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

describe('mouse input — hover (FR-017–FR-019)', () => {
  function hostAt(left: number, top: number) {
    const host = document.createElement('div');
    host.innerHTML = '<canvas></canvas>';
    host.getBoundingClientRect = () => ({ left, top }) as DOMRect;
    document.body.appendChild(host);
    return { host, canvasEl: host.querySelector('canvas') };
  }

  it('a move without a pressed button updates the hover with host-relative coordinates', () => {
    const { host, canvasEl } = hostAt(50, 30);
    const actions = makeActions();
    const mouse = createMouseInput(actions, host);
    mouse.handlePointerMove(pointer(150, 130, { target: canvasEl }));
    expect(actions.pointerMove).toHaveBeenCalledWith({ x: 100, y: 100 });
    expect(actions.panBy).not.toHaveBeenCalled();
  });

  it('updates hover below the threshold, during a drag and at release', () => {
    const actions = makeActions();
    const mouse = createMouseInput(actions);
    mouse.handlePointerDown(pointer(100, 100));
    mouse.handlePointerMove(pointer(102, 101));
    expect(actions.pointerMove).toHaveBeenCalledTimes(1);
    mouse.handlePointerMove(pointer(140, 100));
    mouse.handlePointerMove(pointer(160, 100));
    expect(actions.panBy).toHaveBeenCalledTimes(2);
    expect(actions.pointerMove).toHaveBeenNthCalledWith(2, { x: 140, y: 100 });
    expect(actions.pointerMove).toHaveBeenLastCalledWith({ x: 160, y: 100 });
    mouse.handlePointerUp(pointer(163, 101));
    expect(actions.pointerMove).toHaveBeenLastCalledWith({ x: 163, y: 101 });
  });

  it('a move over a [data-ui-control] or outside the host clears the hover once', () => {
    const { host, canvasEl } = hostAt(0, 0);
    document.body.insertAdjacentHTML('beforeend', '<button data-ui-control>Recentrar</button>');
    const button = document.querySelector('button');
    const actions = makeActions();
    const mouse = createMouseInput(actions, host);

    mouse.handlePointerMove(pointer(10, 10, { target: canvasEl }));
    mouse.handlePointerMove(pointer(20, 20, { target: button }));
    mouse.handlePointerMove(pointer(21, 21, { target: button }));
    mouse.handlePointerMove(pointer(22, 22, { target: document.body }));
    expect(actions.pointerMove).toHaveBeenCalledTimes(1);
    expect(actions.pointerLeave).toHaveBeenCalledTimes(1);

    mouse.handlePointerMove(pointer(30, 30, { target: canvasEl }));
    expect(actions.pointerMove).toHaveBeenCalledTimes(2);
  });

  it('leaving the host clears the hover', () => {
    const actions = makeActions();
    const mouse = createMouseInput(actions);
    mouse.handlePointerMove(pointer(10, 10));
    mouse.handlePointerLeave();
    expect(actions.pointerLeave).toHaveBeenCalledTimes(1);
  });
});

describe('mouse input — debug tile picking (US4, FR-023)', () => {
  function click(mouse: ReturnType<typeof createMouseInput>, x: number, y: number, extra = {}) {
    mouse.handlePointerDown(pointer(x, y, extra));
    mouse.handlePointerUp(pointer(x, y, extra));
  }

  it('in debug mode a click without drag selects the tile under the pointer via screenToGrid', () => {
    const actions = makeActions({ debug: true });
    const mouse = createMouseInput(actions);
    const at = screenOf({ x: 8, y: 11 });
    click(mouse, at.x, at.y);
    expect(actions.selectTile).toHaveBeenCalledTimes(1);
    expect(actions.selectTile).toHaveBeenCalledWith({ x: 8, y: 11 });
    expect(actions.selectTile).toHaveBeenCalledWith(screenToGrid(camera, at, marketingLayout));
  });

  it('uses coordinates relative to the canvas host', () => {
    const host = document.createElement('div');
    host.getBoundingClientRect = () => ({ left: 50, top: 30 }) as DOMRect;
    document.body.appendChild(host);
    const actions = makeActions({ debug: true });
    const mouse = createMouseInput(actions, host);
    const at = screenOf({ x: 3, y: 9 });
    click(mouse, at.x + 50, at.y + 30, { target: host });
    expect(actions.selectTile).toHaveBeenCalledWith({ x: 3, y: 9 });
  });

  it('a press that moves 4 px or less still counts as a click', () => {
    const actions = makeActions({ debug: true });
    const mouse = createMouseInput(actions);
    const at = screenOf({ x: 9, y: 6 });
    mouse.handlePointerDown(pointer(at.x, at.y));
    mouse.handlePointerMove(pointer(at.x + 3, at.y + 2));
    mouse.handlePointerUp(pointer(at.x + 3, at.y + 2));
    expect(actions.selectTile).toHaveBeenCalledWith({ x: 9, y: 6 });
    expect(actions.panBy).not.toHaveBeenCalled();
  });

  it('a drag pans and selects nothing', () => {
    const actions = makeActions({ debug: true });
    const mouse = createMouseInput(actions);
    const at = screenOf({ x: 9, y: 6 });
    mouse.handlePointerDown(pointer(at.x, at.y));
    mouse.handlePointerMove(pointer(at.x + 30, at.y));
    mouse.handlePointerMove(pointer(at.x, at.y));
    mouse.handlePointerUp(pointer(at.x, at.y));
    expect(actions.panBy).toHaveBeenCalledTimes(2);
    expect(actions.selectTile).not.toHaveBeenCalled();
  });

  it('clicks outside the grid are ignored', () => {
    const actions = makeActions({ debug: true });
    const mouse = createMouseInput(actions);
    expect(screenToGrid(camera, { x: 5, y: 5 }, marketingLayout)).toBeNull();
    click(mouse, 5, 5);
    expect(actions.selectTile).not.toHaveBeenCalled();
  });

  it('clicks select nothing while debug mode is off', () => {
    const actions = makeActions();
    const mouse = createMouseInput(actions);
    const at = screenOf({ x: 8, y: 11 });
    click(mouse, at.x, at.y);
    expect(actions.selectTile).not.toHaveBeenCalled();
  });

  it('ignores clicks on a [data-ui-control], with other buttons, or without a press', () => {
    document.body.innerHTML = '<button data-ui-control>Modo depuración</button>';
    const button = document.querySelector('button');
    const actions = makeActions({ debug: true });
    const mouse = createMouseInput(actions);
    const at = screenOf({ x: 8, y: 11 });
    click(mouse, at.x, at.y, { target: button });
    click(mouse, at.x, at.y, { button: 2 });
    mouse.handlePointerUp(pointer(at.x, at.y));
    expect(actions.selectTile).not.toHaveBeenCalled();
  });

  it('keeps hovering while debug mode is on', () => {
    const actions = makeActions({ debug: true });
    const mouse = createMouseInput(actions);
    mouse.handlePointerMove(pointer(200, 200));
    expect(actions.pointerMove).toHaveBeenCalledWith({ x: 200, y: 200 });
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

  it.each([false, true])('discards a cancelled debug gesture (dragging: %s)', (dragging) => {
    const host = canvas();
    const actions = makeActions({ debug: true });
    const detach = attachMouse(host, createMouseInput(actions, host));
    const at = screenOf({ x: 8, y: 11 });
    const point = { clientX: at.x, clientY: at.y };
    try {
      fire(host, 'pointerdown', point);
      if (dragging) fire(host, 'pointermove', { ...point, clientX: at.x + 10 });
      fire(host, 'pointercancel', point);
      fire(host, 'pointermove', { ...point, clientX: at.x + 20 });
      fire(host, 'pointerup', point);
      expect(actions.selectTile).not.toHaveBeenCalled();
      expect(actions.panBy).toHaveBeenCalledTimes(dragging ? 1 : 0);
    } finally {
      detach();
    }
  });

  it('a click (host pointerdown, window pointerup) picks a tile in debug mode', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const actions = makeActions({ debug: true });
    const detach = attachMouse(host, createMouseInput(actions, host));
    const at = screenOf({ x: 8, y: 11 });

    fire(host, 'pointerdown', { button: 0, clientX: at.x, clientY: at.y });
    fire(window, 'pointerup', { button: 0, clientX: at.x, clientY: at.y });
    expect(actions.selectTile).toHaveBeenCalledWith({ x: 8, y: 11 });
    detach();
  });

  it('hovers on window pointermove without a button and clears on host pointerleave', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const actions = makeActions();
    const detach = attachMouse(host, createMouseInput(actions, host));

    fire(host, 'pointermove', { clientX: 40, clientY: 25 });
    expect(actions.pointerMove).toHaveBeenCalledWith({ x: 40, y: 25 });
    host.dispatchEvent(new MouseEvent('pointerleave'));
    expect(actions.pointerLeave).toHaveBeenCalledTimes(1);

    detach();
    fire(host, 'pointermove', { clientX: 50, clientY: 25 });
    host.dispatchEvent(new MouseEvent('pointerleave'));
    expect(actions.pointerMove).toHaveBeenCalledTimes(1);
    expect(actions.pointerLeave).toHaveBeenCalledTimes(1);
  });
});
