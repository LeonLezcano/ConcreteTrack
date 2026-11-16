/**
 * waterAdditionWaiverEngine.js — Motor de Deslinde Legal por Adición de Agua en Obra
 * AiAppFactory Standard (Engine #274 / #245)
 * Deslinde de Garantía Estructural CIRSOC 201
 */

import { CryptoSeal } from '../utils/cryptoSeal.js';

export const CONCRETE_TYPES = {
  'H-17': { nominalMpa: 17, cementKgPerM3: 280, defaultAc: 0.55 },
  'H-21': { nominalMpa: 21, cementKgPerM3: 320, defaultAc: 0.50 },
  'H-25': { nominalMpa: 25, cementKgPerM3: 350, defaultAc: 0.48 },
  'H-30': { nominalMpa: 30, cementKgPerM3: 380, defaultAc: 0.44 },
  'H-35': { nominalMpa: 35, cementKgPerM3: 420, defaultAc: 0.40 },
  'H-40': { nominalMpa: 40, cementKgPerM3: 450, defaultAc: 0.38 }
};

export class WaterAdditionWaiverEngine {
  /**
   * Calcula el impacto técnico de agregar agua en obra sobre la resistencia
   * @param {object} params
   * @param {string} params.concreteType - Tipo de hormigón (H-21, H-25, etc.)
   * @param {number} params.volumeM3 - Volumen transportado en el mixer (m³)
   * @param {number} params.litersAdded - Litros de agua solicitados a agregar
   * @returns {object}
   */
  static calculateWaterImpact({ concreteType = 'H-25', volumeM3 = 8, litersAdded = 0 }) {
    const spec = CONCRETE_TYPES[concreteType] || CONCRETE_TYPES['H-25'];
    const vol = Math.max(0.1, Number(volumeM3) || 8);
    const addedLts = Math.max(0, Number(litersAdded) || 0);

    const totalCementKg = spec.cementKgPerM3 * vol;
    const initialWaterLts = totalCementKg * spec.defaultAc;
    const finalWaterLts = initialWaterLts + addedLts;

    const initialAc = spec.defaultAc;
    const finalAc = totalCementKg > 0 ? (finalWaterLts / totalCementKg) : initialAc;
    const deltaAc = finalAc - initialAc;

    // Regla empírica CIRSOC: Cada 10 litros de agua por m³ reducen aprox 2.0 MPa la resistencia a 28 días
    const ltsPerM3 = addedLts / vol;
    const estimatedLossMpa = Math.min(spec.nominalMpa, ltsPerM3 * 0.20);
    const estimatedFinalMpa = Math.max(5, spec.nominalMpa - estimatedLossMpa);
    const lossPercentage = (estimatedLossMpa / spec.nominalMpa) * 100;

    const isSevereImpact = addedLts > (vol * 15); // Más de 15 Lts por m³ es daño estructural crítico

    return {
      concreteType,
      volumeM3: vol,
      litersAdded: addedLts,
      litersPerM3: Number(ltsPerM3.toFixed(1)),
      totalCementKg,
      initialAc: Number(initialAc.toFixed(3)),
      finalAc: Number(finalAc.toFixed(3)),
      deltaAc: Number(deltaAc.toFixed(3)),
      nominalMpa: spec.nominalMpa,
      estimatedLossMpa: Number(estimatedLossMpa.toFixed(1)),
      estimatedFinalMpa: Number(estimatedFinalMpa.toFixed(1)),
      lossPercentage: Number(lossPercentage.toFixed(1)),
      isSevereImpact,
      severityLevel: addedLts === 0 ? 'NONE' : isSevereImpact ? 'CRITICAL' : 'MODERATE',
      waiverRequired: addedLts > 0
    };
  }

  /**
   * Genera el acta digital de deslinde de responsabilidad estructural
   * @param {object} params
   * @param {string} params.remitoNumber - Número de remito de entrega
   * @param {string} params.mixerPlate - Patente del camión mixer
   * @param {string} params.driverName - Nombre del chofer
   * @param {string} params.clientName - Empresa cliente o constructora
   * @param {string} params.siteAddress - Dirección o nombre de la obra
   * @param {string} params.requesterName - Nombre de quien solicita el agua (Director de Obra / Capataz)
   * @param {string} params.requesterDni - DNI de quien solicita
   * @param {string} params.requesterRole - Cargo (ej. Jefe de Obra)
   * @param {string} params.signatureData - Firma táctil en base64 o coordenadas
   * @param {object} params.impact - Resultado de calculateWaterImpact
   * @returns {Promise<object>}
   */
  static async createWaiverActa({
    remitoNumber,
    mixerPlate,
    driverName,
    clientName,
    siteAddress,
    requesterName,
    requesterDni,
    requesterRole = 'Jefe de Obra',
    signatureData,
    impact
  }) {
    if (!remitoNumber || !requesterName || !requesterDni || !signatureData) {
      throw new Error('Datos incompletos para emitir el acta de deslinde de adición de agua');
    }

    const timestamp = new Date().toISOString();
    const payloadToSign = {
      remitoNumber,
      mixerPlate,
      driverName,
      clientName,
      siteAddress,
      requesterName,
      requesterDni,
      requesterRole,
      timestamp,
      impact: {
        concreteType: impact.concreteType,
        volumeM3: impact.volumeM3,
        litersAdded: impact.litersAdded,
        initialAc: impact.initialAc,
        finalAc: impact.finalAc,
        estimatedLossMpa: impact.estimatedLossMpa,
        estimatedFinalMpa: impact.estimatedFinalMpa
      },
      legalText: 'El solicitante expresamente exige el agregado de agua en obra al motohormigonero, asumiendo de manera exclusiva toda responsabilidad civil, técnica y estructural derivada de la alteración de la relación agua/cemento y la pérdida resultante de resistencia en megapascales, liberando de toda garantía a la planta hormigonera elaboradora conforme al Reglamento CIRSOC 201 e IRAM 1666.'
    };

    const cryptoHash = await CryptoSeal.hashSHA256(payloadToSign);

    return {
      actaId: `WAIV-${remitoNumber}-${Date.now().toString(36).toUpperCase()}`,
      ...payloadToSign,
      signatureData,
      cryptoHash,
      createdAt: timestamp,
      status: 'SEALED_VALID'
    };
  }
}
