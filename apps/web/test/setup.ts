/**
 * jsdom does not implement `HTMLDialogElement.showModal`/`close` (research R14). This minimal stub
 * toggles `open` and fires `close` so the agent editor can be tested with Testing Library.
 */
if (typeof HTMLDialogElement !== 'undefined' && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    if (!this.open) return;
    this.open = false;
    this.dispatchEvent(new Event('close'));
  };
}
