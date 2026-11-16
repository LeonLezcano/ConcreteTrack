/**
 * cylinderCompressionLabEngine.js — Laboratorio de Ensayos de Probetas CIRSOC 201
 * AiAppFactory Standard (Engine #309 / #159)
 * Norma IRAM 1524 (Moldeo), IRAM 1536 (Asentamiento) e IRAM 1546 (Compresión)
 */

import { CryptoSeal } from '../utils/cryptoSeal.js';

export const CYLINDER_DIMENSIONS = {
  STANDARD_15_30: {
    diameterCm: 15,
    heightCm: 30,
    areaMm2: (Math.PI * Math.pow(150, 2)) / 4 // ~17671.46 mm²
  },
  SMALL_10_20: {
    diameterCm: 10,
    heightCm: 20,
    areaMm2: (Math.PI * Math.pow(100, 2)) / 4 // ~7853.98 mm²
  }
};

export const SLUMP_CLASSES = {
  SECO: { min: 0, max: 2, label: 'Seco / Muy Firme' },
  PLASTICO: { min: 3, max: 8, label: 'Plástico / Estructuras Comunes' },
  BLANDO: { min: 9, max: 15, label: 'Blando / Bombeable Estándar' },
  FLUIDO: { min: 16, max: 22, label: 'Fluido / Alta Densidad de Armadura' }
};

export class CylinderCompressionLabEngine {
  /**
   * Clasifica el asentamiento en Cono de Abrams
   * @param {number} slumpCm - Asentamiento medido en cm
   * @returns {object}
   */
  static evaluateSlump(slumpCm) {
    const s = Number(slumpCm) || 0;
    let category = 'DESCONOCIDO';
    let label = 'Fuera de rango estándar';

    if (s <= 2) {
      category = 'SECO';
      label = SLUMP_CLASSES.SECO.label;
    } else if (s <= 8) {
      category = 'PLASTICO';
      label = SLUMP_CLASSES.PLASTICO.label;
    } else if (s <= 15) {
      category = 'BLANDO';
      label = SLUMP_CLASSES.BLANDO.label;
    } else {
      category = 'FLUIDO';
      label = SLUMP_CLASSES.FLUIDO.label;
    }

    return {
      slumpCm: s,
      category,
      label,
      isPumpable: s >= 8 && s <= 16
    };
  }

  /**
   * Calcula la tensión de rotura a la compresión en Megapascales (MPa)
   * @param {object} params
   * @param {number} params.forceKn - Fuerza de rotura registrada por la prensa en Kilonewtons (kN)
   * @param {string} [params.dimensionType='STANDARD_15_30'] - STANDARD_15_30 o SMALL_10_20
   * @param {number} [params.customAreaMm2] - Área personalizada en mm² si aplica
   * @returns {object}
   */
  static calculateStrengthMpa({ forceKn, dimensionType = 'STANDARD_15_30', customAreaMm2 = null }) {
    const force = Math.max(0, Number(forceKn) || 0);
    const dim = CYLINDER_DIMENSIONS[dimensionType] || CYLINDER_DIMENSIONS.STANDARD_15_30;
    const area = customAreaMm2 ? Number(customAreaMm2) : dim.areaMm2;

    if (area <= 0) {
      throw new Error('Área de sección transversal inválida para cálculo de compresión');
    }

    // 1 kN = 1000 N. Tensión = N / mm² = MPa
    const forceN = force * 1000;
    const strengthMpa = forceN / area;

    return {
      forceKn: force,
      areaMm2: Number(area.toFixed(2)),
      dimensionType,
      strengthMpa: Number(strengthMpa.toFixed(2))
    };
  }

  /**
   * Evalúa el dictamen de conformidad según CIRSOC 201 a los 7 o 28 días
   * @param {object} params
   * @param {string} params.nominalType - H-17, H-21, H-25, H-30, H-35, H-40
   * @param {number} params.strengthMpa - Resistencia obtenida en el ensayo (MPa)
   * @param {number} params.ageDays - Edad de la probeta al momento del ensayo (7 o 28 días)
   * @returns {object}
   */
  static evaluateCompliance({ nominalType = 'H-25', strengthMpa, ageDays = 28 }) {
    const nominalValues = {
      'H-17': 17,
      'H-21': 21,
      'H-25': 25,
      'H-30': 30,
      'H-35': 35,
      'H-40': 40
    };

    const targetNominal = nominalValues[nominalType] || 25;
    const actualStrength = Math.max(0, Number(strengthMpa) || 0);

    // A los 7 días se espera reglamentariamente entre 65% y 75% del valor nominal
    const expectedAtAge = ageDays <= 7 ? targetNominal * 0.70 : targetNominal;
    const compliancePercentage = (actualStrength / expectedAtAge) * 100;

    let result = 'NO_CONFORME_RECHAZADO';
    let alertLevel = 'RED';
    let judgmentText = 'NO CONFORME: Resistencia insuficiente según CIRSOC 201. Requiere calado de testigos in-situ.';

    if (actualStrength >= expectedAtAge) {
      result = 'CONFORME_APROBADO';
      alertLevel = 'GREEN';
      judgmentText = `CONFORME: Resistencia obtenida (${actualStrength} MPa) supera el requerimiento reglamentario (${Number(expectedAtAge.toFixed(1))} MPa).`;
    } else if (compliancePercentage >= 90) {
      result = 'CONDICIONAL_MARGINAL';
      alertLevel = 'YELLOW';
      judgmentText = `MARGINAL: Resistencia obtenida (${actualStrength} MPa) se sitúa entre el 90% y 99% de lo requerido. Sujeto a dictamen estructural.`;
    }

    return {
      nominalType,
      targetNominalMpa: targetNominal,
      ageDays,
      expectedAtAgeMpa: Number(expectedAtAge.toFixed(1)),
      actualStrengthMpa: actualStrength,
      compliancePercentage: Number(compliancePercentage.toFixed(1)),
      result,
      alertLevel,
      judgmentText,
      isApproved: result === 'CONFORME_APROBADO'
    };
  }

  /**
   * Genera el certificado oficial de ensayo con sello criptográfico
   * @param {object} testData
   * @returns {Promise<object>}
   */
  static async createCertifiedReport(testData) {
    const timestamp = new Date().toISOString();
    const payload = {
      certificateId: `LAB-CIRSOC-${Date.now().toString(36).toUpperCase()}`,
      ...testData,
      issuedAt: timestamp,
      standard: 'CIRSOC 201 - IRAM 1546'
    };

    const cryptoSeal = await CryptoSeal.hashSHA256(payload);

    return {
      ...payload,
      cryptoSeal,
      status: 'OFFICIALLY_CERTIFIED'
    };
  }
}
