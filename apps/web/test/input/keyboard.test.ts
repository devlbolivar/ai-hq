import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ZOOM_STEP } from '@ai-hq/domain';
import { attachKeyboard, createKeyboardInput, KEY_PAN_SPEED } from '../../src/input/keyboard';

function setup() {
  const actions = {
    panBy: vi.fn(),
    zoomAt: vi.fn(),
    recenter: vi.fn(),
    toggleDebug: vi.fn(),
    getViewport: vi.fn(() => ({ width: 1280, height: 800 })),
  };
  return { actions, input: createKeyboardInput(actions) };
}

function keyEvent(key: string, options: KeyboardEventInit = {}, type = 'keydown') {
  return new KeyboardEvent(type, { key, cancelable: true, bubbles: true, ...options });
}

describe('keyboard camera input', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
  });

  afterEach(() => container.remove());

  it.each([
    ['ArrowUp', 0, 60],
    ['w', 0, 60],
    ['W', 0, 60],
    ['ArrowDown', 0, -60],
    ['s', 0, -60],
    ['S', 0, -60],
    ['ArrowLeft', 60, 0],
    ['a', 60, 0],
    ['A', 60, 0],
    ['ArrowRight', -60, 0],
    ['d', -60, 0],
    ['D', -60, 0],
  ])('pans for held %s at 600 px/s with one delta per tick', (key, x, y) => {
    const { actions, input } = setup();
    expect(KEY_PAN_SPEED).toBe(600);
    const down = keyEvent(key);
    const repeat = keyEvent(key, { repeat: true });
    input.handleKeyDown(down);
    input.handleKeyDown(repeat);
    expect(down.defaultPrevented).toBe(true);
    expect(repeat.defaultPrevented).toBe(true);
    expect(actions.panBy).not.toHaveBeenCalled();

    input.tick(100);
    input.tick(50);
    expect(actions.panBy.mock.calls).toEqual([[{ x, y }], [{ x: x / 2, y: y / 2 }]]);

    input.handleKeyUp(keyEvent(key, {}, 'keyup'));
    input.tick(100);
    expect(actions.panBy).toHaveBeenCalledTimes(2);
  });

  it('combines axes, cancels opposing directions, and skips zero deltas', () => {
    const { actions, input } = setup();
    input.tick(100);
    expect(actions.panBy).not.toHaveBeenCalled();

    input.handleKeyDown(keyEvent('ArrowRight'));
    input.handleKeyDown(keyEvent('ArrowUp'));
    input.tick(0);
    expect(actions.panBy).not.toHaveBeenCalled();
    input.tick(100);
    expect(actions.panBy.mock.calls).toEqual([[{ x: -60, y: 60 }]]);

    input.handleKeyDown(keyEvent('a'));
    input.handleKeyDown(keyEvent('s'));
    input.tick(100);
    expect(actions.panBy).toHaveBeenCalledTimes(1);
  });

  it('keeps panning when one of two held keys for the same direction is released', () => {
    const { actions, input } = setup();
    input.handleKeyDown(keyEvent('ArrowRight'));
    input.handleKeyDown(keyEvent('D'));
    input.tick(100);
    input.handleKeyUp(keyEvent('d', {}, 'keyup'));
    input.tick(100);
    expect(actions.panBy.mock.calls).toEqual([[{ x: -60, y: 0 }], [{ x: -60, y: 0 }]]);
  });

  it.each([
    ['+', ZOOM_STEP],
    ['=', ZOOM_STEP],
    ['-', 1 / ZOOM_STEP],
  ])('zooms at the current viewport center on each %s keydown', (key, factor) => {
    const { actions, input } = setup();
    const down = keyEvent(key);
    const repeat = keyEvent(key, { repeat: true });
    input.handleKeyDown(down);
    actions.getViewport.mockReturnValue({ width: 800, height: 600 });
    input.handleKeyDown(repeat);
    expect(down.defaultPrevented).toBe(true);
    expect(repeat.defaultPrevented).toBe(true);
    expect(actions.zoomAt.mock.calls).toEqual([
      [{ x: 640, y: 400 }, factor],
      [{ x: 400, y: 300 }, factor],
    ]);
  });

  it('recenters on 0 and prevents its default', () => {
    const { actions, input } = setup();
    const event = keyEvent('0');
    input.handleKeyDown(event);
    expect(event.defaultPrevented).toBe(true);
    expect(actions.recenter).toHaveBeenCalledTimes(1);
  });

  it.each(['g', 'G'])('toggles debug mode on %s and prevents its default (FR-023)', (key) => {
    const { actions, input } = setup();
    const event = keyEvent(key);
    input.handleKeyDown(event);
    expect(event.defaultPrevented).toBe(true);
    expect(actions.toggleDebug).toHaveBeenCalledTimes(1);
    input.handleKeyUp(keyEvent(key, {}, 'keyup'));
    input.handleKeyDown(keyEvent(key));
    expect(actions.toggleDebug).toHaveBeenCalledTimes(2);
    input.tick(100);
    expect(actions.panBy).not.toHaveBeenCalled();
  });

  it('does not toggle debug again on auto-repeat while G is held', () => {
    const { actions, input } = setup();
    input.handleKeyDown(keyEvent('g'));
    const repeat = keyEvent('g', { repeat: true });
    input.handleKeyDown(repeat);
    expect(actions.toggleDebug).toHaveBeenCalledTimes(1);
    expect(repeat.defaultPrevented).toBe(true);
  });

  it.each(['Escape', 'q'])('leaves %s untouched', (key) => {
    const { actions, input } = setup();
    const event = keyEvent(key);
    input.handleKeyDown(event);
    input.tick(100);
    expect(event.defaultPrevented).toBe(false);
    expect(actions.panBy).not.toHaveBeenCalled();
    expect(actions.zoomAt).not.toHaveBeenCalled();
    expect(actions.recenter).not.toHaveBeenCalled();
    expect(actions.toggleDebug).not.toHaveBeenCalled();
  });

  it.each([
    ['<input>', 'input'],
    ['<textarea></textarea>', 'textarea'],
    ['<select></select>', 'select'],
    ['<div contenteditable></div>', 'div'],
    ['<div contenteditable><span></span></div>', 'span'],
  ])('ignores keydown from %s', (markup, selector) => {
    const { actions, input } = setup();
    container.innerHTML = markup;
    const target = container.querySelector(selector)!;
    container.addEventListener('keydown', input.handleKeyDown);
    for (const key of ['ArrowRight', '+', '0', 'g']) {
      expect(target.dispatchEvent(keyEvent(key))).toBe(true);
    }
    input.tick(100);
    expect(actions.panBy).not.toHaveBeenCalled();
    expect(actions.zoomAt).not.toHaveBeenCalled();
    expect(actions.recenter).not.toHaveBeenCalled();
    expect(actions.toggleDebug).not.toHaveBeenCalled();
  });

  it.each([{ ctrlKey: true }, { metaKey: true }, { altKey: true }])(
    'ignores modified keydown (%j)',
    (modifier) => {
      const { actions, input } = setup();
      for (const key of ['ArrowRight', '+', '=', '-', '0', 'g']) {
        const event = keyEvent(key, modifier);
        input.handleKeyDown(event);
        expect(event.defaultPrevented).toBe(false);
      }
      input.tick(100);
      expect(actions.panBy).not.toHaveBeenCalled();
      expect(actions.zoomAt).not.toHaveBeenCalled();
      expect(actions.recenter).not.toHaveBeenCalled();
      expect(actions.toggleDebug).not.toHaveBeenCalled();
    },
  );

  it('releases a held key even when keyup comes from an editable target with a modifier', () => {
    const { actions, input } = setup();
    const field = document.createElement('input');
    container.append(field);
    container.addEventListener('keyup', input.handleKeyUp);
    input.handleKeyDown(keyEvent('ArrowRight'));
    field.dispatchEvent(keyEvent('ArrowRight', { ctrlKey: true }, 'keyup'));
    input.tick(100);
    expect(actions.panBy).not.toHaveBeenCalled();
  });

  it('releases all held keys', () => {
    const { actions, input } = setup();
    input.handleKeyDown(keyEvent('ArrowUp'));
    input.handleKeyDown(keyEvent('ArrowRight'));
    input.releaseAll();
    input.tick(100);
    expect(actions.panBy).not.toHaveBeenCalled();
  });

  it.each(['input', 'textarea', 'select', '[contenteditable] span'])(
    'releases held directions when focus enters %s until detached',
    (selector) => {
      const { actions, input } = setup();
      container.innerHTML =
        '<input><textarea></textarea><select></select><div contenteditable><span></span></div>';
      const field = container.querySelector(selector)!;
      const detach = attachKeyboard(window, input);
      try {
        container.dispatchEvent(keyEvent('w'));
        container.dispatchEvent(keyEvent('d'));
        field.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
        input.tick(100);
        expect(actions.panBy).not.toHaveBeenCalled();
      } finally {
        detach();
      }
      input.handleKeyDown(keyEvent('w'));
      field.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      input.tick(100);
      expect(actions.panBy).toHaveBeenCalledWith({ x: 0, y: 60 });
    },
  );

  it('wires keydown, keyup and blur on the window and detaches all three', () => {
    const { actions, input } = setup();
    const keyDown = vi.spyOn(input, 'handleKeyDown');
    const keyUp = vi.spyOn(input, 'handleKeyUp');
    const releaseAll = vi.spyOn(input, 'releaseAll');
    const detach = attachKeyboard(window, input);
    try {
      container.dispatchEvent(keyEvent('ArrowRight'));
      input.tick(100);
      container.dispatchEvent(keyEvent('ArrowRight', {}, 'keyup'));
      input.tick(100);
      expect(actions.panBy.mock.calls).toEqual([[{ x: -60, y: 0 }]]);

      container.dispatchEvent(keyEvent('ArrowRight'));
      window.dispatchEvent(new Event('blur'));
      input.tick(100);
      expect(actions.panBy).toHaveBeenCalledTimes(1);
      expect(keyDown).toHaveBeenCalledTimes(2);
      expect(keyUp).toHaveBeenCalledTimes(1);
      expect(releaseAll).toHaveBeenCalledTimes(1);
    } finally {
      detach();
    }

    container.dispatchEvent(keyEvent('ArrowRight'));
    container.dispatchEvent(keyEvent('ArrowRight', {}, 'keyup'));
    window.dispatchEvent(new Event('blur'));
    expect(keyDown).toHaveBeenCalledTimes(2);
    expect(keyUp).toHaveBeenCalledTimes(1);
    expect(releaseAll).toHaveBeenCalledTimes(1);
  });
});
