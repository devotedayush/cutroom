/** Production-only app-shell cache; selected media is never cached or uploaded. */
export function registerOfflineShell(): void {
  if (import.meta.env.PROD && "serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("/sw.js")
      .then(async () => {
        await navigator.serviceWorker.ready;
        window.dispatchEvent(new Event("cutroom-offline-ready"));
      })
      .catch(() => {
        // Offline installation is optional; local editing/export still works while the tab is loaded.
      });
  }
}
