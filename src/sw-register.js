/**
 * sw-register.js - Registro no bloqueante del Service Worker Offline-First
 */
export function registerConcreteTrackSW() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  if (!window.location.protocol.startsWith('http')) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      // Fallo no bloqueante si el navegador restringe SW en contexto local
    });
  });
}

registerConcreteTrackSW();
