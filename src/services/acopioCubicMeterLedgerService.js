/**
 * acopioCubicMeterLedgerService.js — Cuenta Corriente de Acopios en m³ y Adicionales
 * AiAppFactory Standard (Engine #161)
 */

export class AcopioCubicMeterLedgerService {
  /**
   * Crea un nuevo contrato de acopio de hormigón
   * @param {object} params
   * @param {string} params.contractId
   * @param {string} params.clientName
   * @param {string} params.projectName
   * @param {string} params.concreteType - H-21, H-25, H-30, etc.
   * @param {number} params.totalPurchasedM3 - Metros cúbicos contratados
   * @param {number} params.unitPriceArs - Precio congelado por m³
   * @returns {object}
   */
  static createAcopioContract({
    contractId,
    clientName,
    projectName,
    concreteType = 'H-25',
    totalPurchasedM3,
    unitPriceArs
  }) {
    const totalM3 = Math.max(0, Number(totalPurchasedM3) || 0);
    const price = Math.max(0, Number(unitPriceArs) || 0);

    return {
      contractId: contractId || `ACP-${Date.now().toString(36).toUpperCase()}`,
      clientName,
      projectName,
      concreteType,
      totalPurchasedM3: totalM3,
      deliveredM3: 0,
      balanceM3: totalM3,
      unitPriceArs: price,
      totalContractArs: totalM3 * price,
      dispatches: [],
      createdAt: new Date().toISOString(),
      status: 'ACTIVE'
    };
  }

  /**
   * Imputa un despacho sobre un contrato de acopio y liquida recargos
   * @param {object} contract - Contrato de acopio activo
   * @param {object} dispatch - Datos del remito/despacho
   * @param {number} dispatch.deliveredM3 - Volumen efectivamente entregado
   * @param {boolean} [dispatch.pumpService=false] - Si requirió bomba de hormigón
   * @param {number} [dispatch.pumpFeeArs=120000] - Costo fijo de servicio de bombeo
   * @param {number} [dispatch.demurrageArs=0] - Importe de estadía punitoria en obra
   * @param {number} [dispatch.mixerCapacityM3=8] - Capacidad nominal del camión
   * @param {number} [dispatch.minLoadM3=5] - Carga mínima para no cobrar falso flete/vacío
   * @param {number} [dispatch.voidRatePerM3Ars=25000] - Tarifa por metro cúbico de flete vacío
   * @returns {object}
   */
  static applyDispatchToAcopio(contract, {
    remitoNumber,
    deliveredM3,
    pumpService = false,
    pumpFeeArs = 120000,
    demurrageArs = 0,
    mixerCapacityM3 = 8,
    minLoadM3 = 5,
    voidRatePerM3Ars = 25000
  }) {
    if (!contract) {
      throw new Error('Contrato de acopio no válido');
    }

    const volume = Math.max(0, Number(deliveredM3) || 0);
    const newDelivered = contract.deliveredM3 + volume;
    const newBalance = Math.max(0, contract.totalPurchasedM3 - newDelivered);

    // Cálculo de Falso Flete / Vacío de Camión si cargó menos del mínimo establecido
    let voidM3Charge = 0;
    if (volume < minLoadM3) {
      const missingM3 = minLoadM3 - volume;
      voidM3Charge = missingM3 * voidRatePerM3Ars;
    }

    const pumpCharge = pumpService ? Math.max(0, Number(pumpFeeArs) || 0) : 0;
    const demurrageCharge = Math.max(0, Number(demurrageArs) || 0);
    const totalExtraFeesArs = pumpCharge + voidM3Charge + demurrageCharge;

    const dispatchRecord = {
      remitoNumber,
      timestamp: new Date().toISOString(),
      volumeM3: volume,
      pumpService,
      pumpCharge,
      voidM3Charge,
      demurrageCharge,
      totalExtraFeesArs,
      contractBalanceAfterM3: newBalance
    };

    contract.deliveredM3 = newDelivered;
    contract.balanceM3 = newBalance;
    contract.dispatches.push(dispatchRecord);

    if (contract.balanceM3 <= 0) {
      contract.status = 'COMPLETED';
    }

    return {
      updatedContract: contract,
      dispatchRecord,
      isFullyExhausted: contract.balanceM3 <= 0
    };
  }
}
