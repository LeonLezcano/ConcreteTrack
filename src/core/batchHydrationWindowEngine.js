/**
 * batchHydrationWindowEngine.js — Motor de Ventana de Fraguado y Estadía Punitoria
 * AiAppFactory Standard (Engine #307)
 * Reglamentación CIRSOC 201 / IRAM 1666
 */

export const CIRSOC_LIMITS = {
  MAX_HYDRATION_MINUTES: 120, // 2 horas límite absoluto de fraguado
  WARNING_HYDRATION_MINUTES: 90, // Alerta amarilla de trabajabilidad
  FREE_UNLOADING_MINUTES: 45, // Franquicia de descarga sin cargo en obra
  MAX_DRUM_REVOLUTIONS: 300 // Límite de revoluciones de amasado
};

export const HYDRATION_STATES = {
  FRESH_OPTIMAL: 'FRESH_OPTIMAL', // 0 a 89 min (Óptimo)
  WORKABILITY_WARNING: 'WORKABILITY_WARNING', // 90 a 119 min (Marginal)
  EXPIRED_BLOCKED: 'EXPIRED_BLOCKED', // >= 120 min (Rechazo reglamentario)
  DISCHARGED: 'DISCHARGED'
};

export class BatchHydrationWindowEngine {
  /**
   * Evalúa el estado de hidratación del hormigón y tiempo restante
   * @param {Date|number|string} batchTimestamp - Hora de contacto cemento-agua en planta dosificadora
   * @param {Date|number|string} [currentTimestamp] - Hora actual o de corte
   * @returns {object}
   */
  static evaluateHydration(batchTimestamp, currentTimestamp = new Date()) {
    const tStart = new Date(batchTimestamp).getTime();
    const tNow = new Date(currentTimestamp).getTime();

    if (isNaN(tStart) || isNaN(tNow)) {
      throw new Error('Marcas de tiempo inválidas para evaluar hidratación');
    }

    const elapsedMs = Math.max(0, tNow - tStart);
    const elapsedMinutes = Math.floor(elapsedMs / (1000 * 60));
    const remainingMinutes = CIRSOC_LIMITS.MAX_HYDRATION_MINUTES - elapsedMinutes;

    let state = HYDRATION_STATES.FRESH_OPTIMAL;
    let alertLevel = 'GREEN';
    let message = 'Hormigón fresco dentro de ventana óptima de colocación';

    if (elapsedMinutes >= CIRSOC_LIMITS.MAX_HYDRATION_MINUTES) {
      state = HYDRATION_STATES.EXPIRED_BLOCKED;
      alertLevel = 'RED';
      message = 'RECHAZO REGLAMENTARIO CIRSOC 201: Se superó el límite de 120 minutos de hidratación. Riesgo de fraguado en trompo.';
    } else if (elapsedMinutes >= CIRSOC_LIMITS.WARNING_HYDRATION_MINUTES) {
      state = HYDRATION_STATES.WORKABILITY_WARNING;
      alertLevel = 'YELLOW';
      message = 'ALERTA TRABAJABILIDAD: Superados los 90 minutos. Proceder a descarga inmediata.';
    }

    return {
      elapsedMinutes,
      remainingMinutes: Math.max(0, remainingMinutes),
      isExpired: elapsedMinutes >= CIRSOC_LIMITS.MAX_HYDRATION_MINUTES,
      isWarning: elapsedMinutes >= CIRSOC_LIMITS.WARNING_HYDRATION_MINUTES && elapsedMinutes < CIRSOC_LIMITS.MAX_HYDRATION_MINUTES,
      state,
      alertLevel,
      message,
      maxLimitMinutes: CIRSOC_LIMITS.MAX_HYDRATION_MINUTES
    };
  }

  /**
   * Calcula la estadía punitoria en obra por demora en descarga
   * @param {Date|number|string} arrivalTime - Hora de llegada del mixer a obra
   * @param {Date|number|string} finishTime - Hora de finalización de descarga y lavado
   * @param {number} [ratePerMinute=1500] - Tarifa de estadía por minuto en ARS
   * @param {number} [freeMinutes=45] - Minutos libres de franquicia
   * @returns {object}
   */
  static calculateDemurrage(arrivalTime, finishTime, ratePerMinute = 1500, freeMinutes = CIRSOC_LIMITS.FREE_UNLOADING_MINUTES) {
    const tArr = new Date(arrivalTime).getTime();
    const tFin = new Date(finishTime).getTime();

    if (isNaN(tArr) || isNaN(tFin)) {
      throw new Error('Marcas de tiempo inválidas para calcular estadía');
    }

    const totalMinutes = Math.max(0, Math.floor((tFin - tArr) / (1000 * 60)));
    const excessMinutes = Math.max(0, totalMinutes - freeMinutes);
    const demurrageAmount = excessMinutes * Math.max(0, ratePerMinute);

    return {
      totalMinutesInObra: totalMinutes,
      freeMinutes,
      excessMinutes,
      ratePerMinute,
      hasDemurrage: excessMinutes > 0,
      demurrageAmount
    };
  }

  /**
   * Valida revoluciones del tambor motohormigonero
   * @param {number} revolutions
   * @returns {object}
   */
  static validateDrumRevolutions(revolutions) {
    const revs = Number(revolutions) || 0;
    const isExceeded = revs > CIRSOC_LIMITS.MAX_DRUM_REVOLUTIONS;
    return {
      revolutions: revs,
      limit: CIRSOC_LIMITS.MAX_DRUM_REVOLUTIONS,
      isExceeded,
      warning: isExceeded
        ? `Límite IRAM 1666 excedido: ${revs} revs superan las ${CIRSOC_LIMITS.MAX_DRUM_REVOLUTIONS} vueltas máximas.`
        : 'Revoluciones dentro de parámetro reglamentario.'
    };
  }
}
