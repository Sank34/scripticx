// Keep a fixed delivery deadline: continuous typing must not postpone a broadcast.
export function createLiveUpdateScheduler(deliver: () => void, interval = 50) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return {
    schedule() {
      if (timer !== null) return;
      timer = setTimeout(() => { timer = null; deliver(); }, interval);
    },
    cancel() {
      if (timer !== null) clearTimeout(timer);
      timer = null;
    },
    flush() {
      if (timer === null) return;
      clearTimeout(timer);
      timer = null;
      deliver();
    },
  };
}
