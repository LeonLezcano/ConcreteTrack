/**
 * concreteTrackCache.service.js — Persistencia Offline-First, Outbox FIFO y Centinela Anti-Siembras
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
  constructor(storage = typeof localStorage !== 'undefined' ? localStorage : null) {
    this.storage = storage || new MemoryStorageFallback();
  }

  isDemoPurged() {
    return this.storage.getItem(STORAGE_KEYS.PURGED_FLAG) === 'true';
  }

  setDemoPurged(val = true) {
    this.storage.setItem(STORAGE_KEYS.PURGED_FLAG, val ? 'true' : 'false');
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
        return JSON.parse(raw);
      } catch {
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
    this.storage.setItem(key, JSON.stringify(items));
  }

  getDispatches(fallback = []) {
    return this.getItems(STORAGE_KEYS.DISPATCHES, fallback);
  }

  saveDispatches(items) {
    this.saveItems(STORAGE_KEYS.DISPATCHES, items);
  }

  getWaivers(fallback = []) {
    return this.getItems(STORAGE_KEYS.WAIVERS, fallback);
  }

  saveWaivers(items) {
    this.saveItems(STORAGE_KEYS.WAIVERS, items);
  }

  getCylinders(fallback = []) {
    return this.getItems(STORAGE_KEYS.CYLINDERS, fallback);
  }

  saveCylinders(items) {
    this.saveItems(STORAGE_KEYS.CYLINDERS, items);
  }

  getAcopios(fallback = []) {
    return this.getItems(STORAGE_KEYS.ACOPIOS, fallback);
  }

  saveAcopios(items) {
    this.saveItems(STORAGE_KEYS.ACOPIOS, items);
  }

  // --- Outbox FIFO para eventos sin señal ---
  getOutbox() {
    const raw = this.storage.getItem(STORAGE_KEYS.OUTBOX);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  pushOutbox(action) {
    const outbox = this.getOutbox();
    const item = {
      id: `EVT-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 5)}`,
      timestamp: new Date().toISOString(),
      action
    };
    outbox.push(item);
    this.storage.setItem(STORAGE_KEYS.OUTBOX, JSON.stringify(outbox));
    return item;
  }

  flushOutbox() {
    const outbox = this.getOutbox();
    this.storage.setItem(STORAGE_KEYS.OUTBOX, JSON.stringify([]));
    return outbox;
  }

  purgeAllData() {
    this.storage.removeItem(STORAGE_KEYS.DISPATCHES);
    this.storage.removeItem(STORAGE_KEYS.WAIVERS);
    this.storage.removeItem(STORAGE_KEYS.CYLINDERS);
    this.storage.removeItem(STORAGE_KEYS.ACOPIOS);
    this.storage.removeItem(STORAGE_KEYS.OUTBOX);
    this.setDemoPurged(true);
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
