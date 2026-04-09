export const SETUP_PROGRESS_CHANGED_EVENT = 'spark:setup-progress-changed';

export function dispatchSetupProgressChanged() {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new Event(SETUP_PROGRESS_CHANGED_EVENT));
}
