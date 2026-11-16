/**
 * formatters.js — Formateadores estandarizados para la industria hormigonera
 * AiAppFactory Standard
 */

export class Formatters {
  /**
   * Formatea volumen en metros cúbicos (m³)
   * @param {number} val
   * @param {number} decimals
   * @returns {string}
   */
  static formatCubicMeters(val, decimals = 1) {
    const num = Number(val) || 0;
    return `${num.toLocaleString('es-AR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    })} m³`;
  }

  /**
   * Formatea resistencia a la compresión en Megapascales (MPa)
   * @param {number} val
   * @param {number} decimals
   * @returns {string}
   */
  static formatMegaPascals(val, decimals = 1) {
    const num = Number(val) || 0;
    return `${num.toLocaleString('es-AR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    })} MPa`;
  }

  /**
   * Formatea asentamiento en cono de Abrams (cm)
   * @param {number} val
   * @returns {string}
   */
  static formatSlump(val) {
    const num = Number(val) || 0;
    return `${num.toFixed(0)} cm`;
  }

  /**
   * Formatea moneda argentina (ARS)
   * @param {number} val
   * @returns {string}
   */
  static formatCurrencyARS(val) {
    const num = Number(val) || 0;
    return num.toLocaleString('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0
    });
  }

  /**
   * Formatea moneda extranjera (USD)
   * @param {number} val
   * @returns {string}
   */
  static formatCurrencyUSD(val) {
    const num = Number(val) || 0;
    return num.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2
    });
  }

  /**
   * Formatea fecha y hora en formato argentino
   * @param {Date|string|number} date
   * @returns {string}
   */
  static formatDateTime(date) {
    if (!date) return '-';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Formatea duración en minutos a string "Xh Ym"
   * @param {number} minutes
   * @returns {string}
   */
  static formatMinutes(minutes) {
    const total = Math.max(0, Math.floor(Number(minutes) || 0));
    const h = Math.floor(total / 60);
    const m = total % 60;
    if (h === 0) return `${m} min`;
    return `${h}h ${m}m`;
  }
}

export const formatM3 = Formatters.formatCubicMeters;
export const formatMPa = Formatters.formatMegaPascals;
export const formatSlump = Formatters.formatSlump;
export const formatARS = Formatters.formatCurrencyARS;
export const formatUSD = Formatters.formatCurrencyUSD;
export const formatMinutes = Formatters.formatMinutes;
export const formatDateTime = Formatters.formatDateTime;

