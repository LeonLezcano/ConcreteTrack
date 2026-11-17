/**
 * concreteTrackCache.service.js - Persistencia Offline-First, Outbox FIFO y Centinela Anti-Siembras
 * AiAppFactory Standard (Engine #123)
 */

const STORAGE_KEYS = {
  DISPATCHES: 'concretetrack_dispatches',
  WAIVERS: 'concretetrack_waivers',
  CYLINDERS: 'concretetrack_cylinders',
  ACOPIOS: 'concretetrack_acopios',
  OUTBOX: 'concretetrack_outbox',
  PURGED_FLAG: 'concretetrack_demo_purged'
};

export class ConcreteTrackCacheService {
  constructor(storage = typeof localStorage !== 'undefined' ? localStorage : null, onError = null) {
    this.storage = storage || new MemoryStorageFallback();
    this.onError = typeof onError === 'function' ? onError : null;
    this.lastError = null;
  }

  setErrorHandler(handler) {
    this.onError = typeof handler === 'function' ? handler : null;
  }

  getLastError() {
    return this.lastError;
  }

  clearLastError() {
    this.lastError = null;
  }

  _reportError(message, err) {
    const detail = err?.message ? `${message} (${err.message})` : message;
    this.lastError = detail;
    if (this.onError) {
      this.onError(detail, err);
    }
  }

  _safeSetItem(key, value) {
    try {
      this.storage.setItem(key, String(value));
      return true;
    } catch (err) {
      this._reportError('No se pudo guardar en almacenamiento local (espacio insuficiente o bloqueado).', err);
      return false;
    }
  }

  isDemoPurged() {
    return this.storage.getItem(STORAGE_KEYS.PURGED_FLAG) === 'true';
  }

  setDemoPurged(val = true) {
    this._safeSetItem(STORAGE_KEYS.PURGED_FLAG, val ? 'true' : 'false');
  }

  /**
   * Carga elementos por clave respetando la purga
   * @param {string} key
   * @param {Array} fallbackDemo
   * @returns {Array}
   */
  getItems(key, fallbackDemo = []) {
    const raw = this.storage.getItem(key);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed;
        }
        this._reportError(`Formato corrupto en almacenamiento local para ${key}.`);
        return [];
      } catch (err) {
        this._reportError(`Error al leer datos guardados en ${key}.`, err);
        return [];
      }
    }
    if (this.isDemoPurged()) {
      return [];
    }
    // Si no está purgado y no hay datos, guarda y devuelve la siembra inicial
    if (fallbackDemo && fallbackDemo.length > 0) {
      this.saveItems(key, fallbackDemo);
      return fallbackDemo;
    }
    return [];
  }

  saveItems(key, items) {
    return this._safeSetItem(key, JSON.stringify(items));
  }

  getDispatches(fallback = []) {
    return this.getItems(STORAGE_KEYS.DISPATCHES, fallback);
  }

  saveDispatches(items) {
    return this.saveItems(STORAGE_KEYS.DISPATCHES, items);
  }

  getWaivers(fallback = []) {
    return this.getItems(STORAGE_KEYS.WAIVERS, fallback);
  }

  saveWaivers(items) {
    return this.saveItems(STORAGE_KEYS.WAIVERS, items);
  }

  getCylinders(fallback = []) {
    return this.getItems(STORAGE_KEYS.CYLINDERS, fallback);
  }

  saveCylinders(items) {
    return this.saveItems(STORAGE_KEYS.CYLINDERS, items);
  }

  getAcopios(fallback = []) {
    return this.getItems(STORAGE_KEYS.ACOPIOS, fallback);
  }

  saveAcopios(items) {
    return this.saveItems(STORAGE_KEYS.ACOPIOS, items);
  }

  // --- Outbox FIFO para eventos sin señal ---
  getOutbox() {
    const raw = this.storage.getItem(STORAGE_KEYS.OUTBOX);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
      this._reportError('Formato corrupto en la cola local de sincronización.');
      return [];
    } catch (err) {
      this._reportError('Error al leer la cola local de eventos.', err);
      return [];
    }
  }

  pushOutbox(action) {
    const outbox = this.getOutbox();
    const item = {
      id: `EVT-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      action
    };
    outbox.push(item);
    this._safeSetItem(STORAGE_KEYS.OUTBOX, JSON.stringify(outbox));
    return item;
  }

  flushOutbox() {
    const outbox = this.getOutbox();
    this._safeSetItem(STORAGE_KEYS.OUTBOX, JSON.stringify([]));
    return outbox;
  }

  purgeAllData() {
    this.storage.removeItem(STORAGE_KEYS.DISPATCHES);
    this.storage.removeItem(STORAGE_KEYS.WAIVERS);
    this.storage.removeItem(STORAGE_KEYS.CYLINDERS);
    this.storage.removeItem(STORAGE_KEYS.ACOPIOS);
    this.storage.removeItem(STORAGE_KEYS.OUTBOX);
    this.setDemoPurged(true);
    this.clearLastError();
  }
}

class MemoryStorageFallback {
  constructor() {
    this.map = new Map();
  }
  getItem(key) {
    return this.map.get(key) || null;
  }
  setItem(key, value) {
    this.map.set(key, String(value));
  }
  removeItem(key) {
    this.map.delete(key);
  }
  clear() {
    this.map.clear();
  }
}
