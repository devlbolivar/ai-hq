import { describe, expect, it } from 'vitest';

describe('test setup — HTMLDialogElement stub (research R14)', () => {
  it('opens a dialog with showModal() and closes it with close()', () => {
    const dialog = document.createElement('dialog');
    document.body.appendChild(dialog);
    let closed = 0;
    dialog.addEventListener('close', () => closed++);

    dialog.showModal();
    expect(dialog.open).toBe(true);

    dialog.close();
    expect(dialog.open).toBe(false);
    expect(closed).toBe(1);
    dialog.remove();
  });
});
