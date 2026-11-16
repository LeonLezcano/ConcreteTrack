/**
 * ConcreteTrack Automated Test Suite — 5 Layers & 54 Tests
 * AiAppFactory Testing-First Standard (CIRSOC 201 / IRAM 1666)
 */

import { BatchHydrationWindowEngine, CIRSOC_LIMITS, HYDRATION_STATES } from '../src/core/batchHydrationWindowEngine.js';
import { WaterAdditionWaiverEngine } from '../src/core/waterAdditionWaiverEngine.js';
import { CylinderCompressionLabEngine, CYLINDER_DIMENSIONS } from '../src/core/cylinderCompressionLabEngine.js';
import { AcopioCubicMeterLedgerService } from '../src/services/acopioCubicMeterLedgerService.js';
import { ConcreteTrackCacheService } from '../src/services/concreteTrackCache.service.js';
import { Sanitizer } from '../src/utils/sanitizer.js';
import { CryptoSeal } from '../src/utils/cryptoSeal.js';
import {
  formatM3,
  formatMPa,
  formatSlump,
  formatARS,
  formatUSD,
  formatMinutes,
  formatDateTime
} from '../src/utils/formatters.js';

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failures = [];

async function test(description, fn) {
  totalTests++;
  try {
    await fn();
    passedTests++;
    process.stdout.write(`  [PASS] ${description}\n`);
  } catch (err) {
    failedTests++;
    failures.push({ description, error: err });
    process.stdout.write(`  [FAIL] ${description} -> ${err.message}\n`);
  }
}

function assert(condition, message = 'Assertion failed') {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEqual(actual, expected, message = '') {
  if (actual !== expected) {
    throw new Error(`${message} Expected [${expected}], got [${actual}]`);
  }
}

function assertCloseTo(actual, expected, delta = 0.05, message = '') {
  if (Math.abs(actual - expected) > delta) {
    throw new Error(`${message} Expected [${actual}] to be close to [${expected}] within [${delta}]`);
  }
}

async function runAllTests() {
  console.log('\n======================================================');
  console.log('   CONCRETETRACK — 5-LAYER AUTOMATED TEST SUITE');
  console.log('   CIRSOC 201 / IRAM 1666 Concrete Plant Standard');
  console.log('======================================================\n');

  // ----------------------------------------------------
  // LAYER 1: UNIT & CHAOTIC FUZZING (26 Tests)
  // ----------------------------------------------------
  console.log('--- CAPA 1: Unitarias & Fuzzing Caótico ---');

  await test('L1-01: BatchHydration - Tiempo <90m retorna FRESH_OPTIMAL y alertLevel GREEN', () => {
    const batchTime = new Date('2026-11-16T10:00:00Z');
    const arrivalTime = new Date('2026-11-16T10:45:00Z'); // 45m
    const res = BatchHydrationWindowEngine.evaluateHydration(batchTime, arrivalTime);
    assertEqual(res.state, HYDRATION_STATES.FRESH_OPTIMAL);
    assertEqual(res.alertLevel, 'GREEN');
    assertEqual(res.elapsedMinutes, 45);
    assertEqual(res.remainingMinutes, 75);
    assertEqual(res.isExpired, false);
  });

  await test('L1-02: BatchHydration - Tiempo 90m-119m retorna WORKABILITY_WARNING y alertLevel YELLOW', () => {
    const batchTime = new Date('2026-11-16T10:00:00Z');
    const checkTime = new Date('2026-11-16T11:40:00Z'); // 100m
    const res = BatchHydrationWindowEngine.evaluateHydration(batchTime, checkTime);
    assertEqual(res.state, HYDRATION_STATES.WORKABILITY_WARNING);
    assertEqual(res.alertLevel, 'YELLOW');
    assertEqual(res.isWarning, true);
    assertEqual(res.isExpired, false);
  });

  await test('L1-03: BatchHydration - Tiempo >=120m retorna EXPIRED_BLOCKED y rechazo CIRSOC 201', () => {
    const batchTime = new Date('2026-11-16T10:00:00Z');
    const checkTime = new Date('2026-11-16T12:05:00Z'); // 125m
    const res = BatchHydrationWindowEngine.evaluateHydration(batchTime, checkTime);
    assertEqual(res.state, HYDRATION_STATES.EXPIRED_BLOCKED);
    assertEqual(res.alertLevel, 'RED');
    assertEqual(res.isExpired, true);
    assert(res.message.includes('CIRSOC 201'));
  });

  await test('L1-04: BatchHydration - Franquicia de 45m de descarga en obra no genera estadía', () => {
    const arrivalTime = new Date('2026-11-16T11:00:00Z');
    const finishTime = new Date('2026-11-16T11:35:00Z'); // 35 min
    const demurrage = BatchHydrationWindowEngine.calculateDemurrage(arrivalTime, finishTime, 1500);
    assertEqual(demurrage.hasDemurrage, false);
    assertEqual(demurrage.excessMinutes, 0);
    assertEqual(demurrage.demurrageAmount, 0);
  });

  await test('L1-05: BatchHydration - Demora sobre los 45m genera estadía punitoria en obra', () => {
    const arrivalTime = new Date('2026-11-16T11:00:00Z');
    const finishTime = new Date('2026-11-16T12:15:00Z'); // 75 min (30 min exceso)
    const demurrage = BatchHydrationWindowEngine.calculateDemurrage(arrivalTime, finishTime, 2000);
    assertEqual(demurrage.hasDemurrage, true);
    assertEqual(demurrage.excessMinutes, 30);
    assertEqual(demurrage.demurrageAmount, 60000); // 30 * 2000
  });

  await test('L1-06: BatchHydration - Tambor mixer <=300 revs dentro de tolerancia IRAM 1666', () => {
    const check = BatchHydrationWindowEngine.validateDrumRevolutions(220);
    assertEqual(check.isExceeded, false);
    assertEqual(check.revolutions, 220);
  });

  await test('L1-07: BatchHydration - Tambor mixer >300 revs alerta riesgo de degradación de pasta', () => {
    const check = BatchHydrationWindowEngine.validateDrumRevolutions(340);
    assertEqual(check.isExceeded, true);
    assert(check.warning.includes('IRAM 1666'));
  });

  await test('L1-08: BatchHydration [Fuzzing] - Error descriptivo ante timestamps no parseables', () => {
    let errorThrown = false;
    try {
      BatchHydrationWindowEngine.evaluateHydration('fecha-invalida', 'otra-invalida');
    } catch (e) {
      errorThrown = true;
      assert(e.message.includes('inválidas'));
    }
    assert(errorThrown, 'Debe arrojar excepción ante fecha corrupta');
  });

  await test('L1-09: WaterAddition - Adición de 0 litros no genera penalidad ni acta', () => {
    const impact = WaterAdditionWaiverEngine.calculateWaterImpact({
      concreteType: 'H-25',
      volumeM3: 8,
      litersAdded: 0
    });
    assertEqual(impact.litersAdded, 0);
    assertEqual(impact.estimatedLossMpa, 0);
    assertEqual(impact.waiverRequired, false);
    assertEqual(impact.severityLevel, 'NONE');
  });

  await test('L1-10: WaterAddition - Adición de agua incrementa relación agua/cemento (a/c)', () => {
    const impact = WaterAdditionWaiverEngine.calculateWaterImpact({
      concreteType: 'H-30',
      volumeM3: 8,
      litersAdded: 80
    });
    assert(impact.finalAc > impact.initialAc);
    assert(impact.deltaAc > 0);
    assertEqual(impact.waiverRequired, true);
  });

  await test('L1-11: WaterAddition - Regla empírica CIRSOC: ~2.0 MPa de pérdida por cada 10 L/m³', () => {
    // 8 m3 * 10 L/m3 = 80 L totales adicionados -> debe estimar pérdida de ~2.0 MPa
    const impact = WaterAdditionWaiverEngine.calculateWaterImpact({
      concreteType: 'H-30',
      volumeM3: 8,
      litersAdded: 80
    });
    assertCloseTo(impact.estimatedLossMpa, 2.0, 0.1);
    assertEqual(impact.estimatedFinalMpa, 28.0);
  });

  await test('L1-12: WaterAddition - Detección de impacto severo (>15 L/m³) marca CRITICAL', () => {
    // 8 m3 * 20 L/m3 = 160 L adicionados
    const impact = WaterAdditionWaiverEngine.calculateWaterImpact({
      concreteType: 'H-25',
      volumeM3: 8,
      litersAdded: 160
    });
    assertEqual(impact.isSevereImpact, true);
    assertEqual(impact.severityLevel, 'CRITICAL');
  });

  await test('L1-13: WaterAddition - createWaiverActa genera documento firmado con sello SHA-256', async () => {
    const impact = WaterAdditionWaiverEngine.calculateWaterImpact({
      concreteType: 'H-25',
      volumeM3: 8,
      litersAdded: 80
    });
    const acta = await WaterAdditionWaiverEngine.createWaiverActa({
      remitoNumber: 'REM-2026-991',
      mixerPlate: 'AF-320-ZZ',
      driverName: 'Rubén Gómez',
      clientName: 'Constructora del Sur S.A.',
      siteAddress: 'Calle 50 y 120, La Plata',
      requesterName: 'Arq. Esteban Morales',
      requesterDni: '24.991.200',
      requesterRole: 'Director de Obra',
      signatureData: 'data:image/png;base64,mockSignatureData123456',
      impact
    });
    assertEqual(acta.status, 'SEALED_VALID');
    assert(acta.cryptoHash.length === 64);
    assert(acta.legalText.includes('CIRSOC 201'));
  });

  await test('L1-14: WaterAddition - createWaiverActa rechaza emisión sin firma o solicitante', async () => {
    let errCaught = false;
    try {
      await WaterAdditionWaiverEngine.createWaiverActa({
        remitoNumber: 'REM-1',
        requesterName: '',
        signatureData: null
      });
    } catch {
      errCaught = true;
    }
    assert(errCaught, 'Debe arrojar error si faltan datos requeridos');
  });

  await test('L1-15: CylinderLab - evaluateSlump clasifica correctamente las 4 consistencias', () => {
    assertEqual(CylinderCompressionLabEngine.evaluateSlump(1.5).category, 'SECO');
    assertEqual(CylinderCompressionLabEngine.evaluateSlump(6).category, 'PLASTICO');
    assertEqual(CylinderCompressionLabEngine.evaluateSlump(12).category, 'BLANDO');
    assertEqual(CylinderCompressionLabEngine.evaluateSlump(18).category, 'FLUIDO');
  });

  await test('L1-16: CylinderLab - evaluateSlump define bombeabilidad en rango 8-16 cm', () => {
    assertEqual(CylinderCompressionLabEngine.evaluateSlump(5).isPumpable, false);
    assertEqual(CylinderCompressionLabEngine.evaluateSlump(12).isPumpable, true);
    assertEqual(CylinderCompressionLabEngine.evaluateSlump(20).isPumpable, false);
  });

  await test('L1-17: CylinderLab - calculateStrengthMpa con probeta estándar 15x30 cm', () => {
    // Probeta 15x30: Area = 17671.46 mm². Fuerza P = 530 kN (530.000 N).
    // Tensión = 530000 / 17671.46 = 29.99 MPa (~30 MPa)
    const res = CylinderCompressionLabEngine.calculateStrengthMpa({
      forceKn: 530,
      dimensionType: 'STANDARD_15_30'
    });
    assertCloseTo(res.strengthMpa, 29.99, 0.1);
    assertCloseTo(res.areaMm2, 17671.46, 0.5);
  });

  await test('L1-18: CylinderLab - calculateStrengthMpa con probeta reducida 10x20 cm', () => {
    // Probeta 10x20: Area = 7853.98 mm². Fuerza P = 235 kN (235.000 N).
    // Tensión = 235000 / 7853.98 = 29.92 MPa (~30 MPa)
    const res = CylinderCompressionLabEngine.calculateStrengthMpa({
      forceKn: 235,
      dimensionType: 'SMALL_10_20'
    });
    assertCloseTo(res.strengthMpa, 29.92, 0.1);
    assertCloseTo(res.areaMm2, 7853.98, 0.5);
  });

  await test('L1-19: CylinderLab - evaluateCompliance a 7 días evalúa trayectoria del 70% nominal', () => {
    // Para H-30 a 7 días se espera 30 * 0.70 = 21.0 MPa
    const pass7d = CylinderCompressionLabEngine.evaluateCompliance({
      nominalType: 'H-30',
      strengthMpa: 22.5,
      ageDays: 7
    });
    assertEqual(pass7d.result, 'CONFORME_APROBADO');
    assertEqual(pass7d.alertLevel, 'GREEN');

    const fail7d = CylinderCompressionLabEngine.evaluateCompliance({
      nominalType: 'H-30',
      strengthMpa: 17.0, // Muy bajo para 7 días
      ageDays: 7
    });
    assertEqual(fail7d.result, 'NO_CONFORME_RECHAZADO');
  });

  await test('L1-20: CylinderLab - evaluateCompliance a 28 días aprueba si resistencia >= nominal', () => {
    const res = CylinderCompressionLabEngine.evaluateCompliance({
      nominalType: 'H-30',
      strengthMpa: 31.8,
      ageDays: 28
    });
    assertEqual(res.result, 'CONFORME_APROBADO');
    assertEqual(res.isApproved, true);
  });

  await test('L1-21: CylinderLab - evaluateCompliance rechaza si resistencia es <90% nominal', () => {
    const res = CylinderCompressionLabEngine.evaluateCompliance({
      nominalType: 'H-30',
      strengthMpa: 25.5, // 85% de 30 MPa
      ageDays: 28
    });
    assertEqual(res.result, 'NO_CONFORME_RECHAZADO');
    assertEqual(res.alertLevel, 'RED');
  });

  await test('L1-22: CylinderLab - evaluateCompliance dictamina CONDICIONAL si resistencia está entre 90-99%', () => {
    const res = CylinderCompressionLabEngine.evaluateCompliance({
      nominalType: 'H-30',
      strengthMpa: 28.5, // 95% de 30 MPa
      ageDays: 28
    });
    assertEqual(res.result, 'CONDICIONAL_MARGINAL');
    assertEqual(res.alertLevel, 'YELLOW');
  });

  await test('L1-23: CylinderLab - createCertifiedReport genera certificado oficial con SHA-256', async () => {
    const cert = await CylinderCompressionLabEngine.createCertifiedReport({
      specimenId: 'CYL-2026-004',
      nominalType: 'H-30',
      forceKn: 545,
      strengthMpa: 30.84,
      ageDays: 28,
      operator: 'Téc. Lab. Juan Medina'
    });
    assertEqual(cert.status, 'OFFICIALLY_CERTIFIED');
    assert(cert.cryptoSeal.length === 64);
    assertEqual(cert.standard, 'CIRSOC 201 - IRAM 1546');
  });

  await test('L1-24: CylinderLab [Fuzzing] - calculateStrengthMpa con fuerza 0 kN retorna 0 MPa sin error', () => {
    const res = CylinderCompressionLabEngine.calculateStrengthMpa({
      forceKn: 0,
      dimensionType: 'STANDARD_15_30'
    });
    assertEqual(res.strengthMpa, 0);
  });

  await test('L1-25: CryptoSeal - hashSync genera hash determinista SHA-256 de 64 hex', () => {
    const h1 = CryptoSeal.hashSync('HORMIGON_H30_REMITO_1001');
    const h2 = CryptoSeal.hashSync('HORMIGON_H30_REMITO_1001');
    assertEqual(h1, h2);
    assertEqual(h1.length, 64);
  });

  await test('L1-26: CryptoSeal - hashSHA256 asíncrono coincide en integridad', async () => {
    const payload = { remito: 'REM-500', m3: 8 };
    const hash = await CryptoSeal.hashSHA256(payload);
    assert(typeof hash === 'string');
    assertEqual(hash.length, 64);
  });

  // ----------------------------------------------------
  // LAYER 2: INTEGRATION & OFFLINE PERSISTENCE (10 Tests)
  // ----------------------------------------------------
  console.log('\n--- CAPA 2: Integración & Persistencia Offline-First ---');

  await test('L2-01: AcopioLedger - createAcopioContract inicializa contrato en m³ con saldo', () => {
    const contract = AcopioCubicMeterLedgerService.createAcopioContract({
      contractId: 'ACP-100',
      clientName: 'Ingeniería Urbana S.A.',
      projectName: 'Paso Bajo Nivel',
      concreteType: 'H-30',
      totalPurchasedM3: 150,
      unitPriceArs: 130000
    });
    assertEqual(contract.totalPurchasedM3, 150);
    assertEqual(contract.balanceM3, 150);
    assertEqual(contract.deliveredM3, 0);
    assertEqual(contract.status, 'ACTIVE');
  });

  await test('L2-02: AcopioLedger - applyDispatchToAcopio descuenta m³ y actualiza balance', () => {
    const contract = AcopioCubicMeterLedgerService.createAcopioContract({
      totalPurchasedM3: 50,
      unitPriceArs: 120000
    });
    const result = AcopioCubicMeterLedgerService.applyDispatchToAcopio(contract, {
      remitoNumber: 'REM-01',
      deliveredM3: 8
    });
    assertEqual(result.updatedContract.deliveredM3, 8);
    assertEqual(result.updatedContract.balanceM3, 42);
    assertEqual(result.isFullyExhausted, false);
  });

  await test('L2-03: AcopioLedger - Despachos acumulados hasta saldo cero marcan COMPLETED', () => {
    const contract = AcopioCubicMeterLedgerService.createAcopioContract({
      totalPurchasedM3: 16,
      unitPriceArs: 120000
    });
    AcopioCubicMeterLedgerService.applyDispatchToAcopio(contract, { deliveredM3: 8 });
    const finalResult = AcopioCubicMeterLedgerService.applyDispatchToAcopio(contract, { deliveredM3: 8 });
    assertEqual(finalResult.updatedContract.balanceM3, 0);
    assertEqual(finalResult.updatedContract.status, 'COMPLETED');
    assertEqual(finalResult.isFullyExhausted, true);
  });

  await test('L2-04: AcopioLedger - Carga menor al mínimo (minLoadM3=5) liquida falso flete / vacío', () => {
    const contract = AcopioCubicMeterLedgerService.createAcopioContract({
      totalPurchasedM3: 100,
      unitPriceArs: 120000
    });
    // Despacho de 3 m3 (faltan 2 m3 para 5 m3). 2 * 25.000 = 50.000 ARS recargo
    const res = AcopioCubicMeterLedgerService.applyDispatchToAcopio(contract, {
      remitoNumber: 'REM-VACIO',
      deliveredM3: 3,
      minLoadM3: 5,
      voidRatePerM3Ars: 25000
    });
    assertEqual(res.dispatchRecord.voidM3Charge, 50000);
    assertEqual(res.dispatchRecord.totalExtraFeesArs, 50000);
  });

  await test('L2-05: AcopioLedger - Servicio de bomba y estadía punitoria se integran a cargos adicionales', () => {
    const contract = AcopioCubicMeterLedgerService.createAcopioContract({ totalPurchasedM3: 100 });
    const res = AcopioCubicMeterLedgerService.applyDispatchToAcopio(contract, {
      deliveredM3: 8,
      pumpService: true,
      pumpFeeArs: 150000,
      demurrageArs: 30000
    });
    assertEqual(res.dispatchRecord.pumpCharge, 150000);
    assertEqual(res.dispatchRecord.demurrageCharge, 30000);
    assertEqual(res.dispatchRecord.totalExtraFeesArs, 180000);
  });

  await test('L2-06: CacheService - getDispatches y saveDispatches operan con persistencia', () => {
    const cache = new ConcreteTrackCacheService();
    cache.saveDispatches([{ id: 'DISP-01', volumeM3: 8, formula: 'H-30' }]);
    const loaded = cache.getDispatches();
    assertEqual(loaded.length, 1);
    assertEqual(loaded[0].id, 'DISP-01');
  });

  await test('L2-07: CacheService - getWaivers y saveWaivers almacenan actas de agua', () => {
    const cache = new ConcreteTrackCacheService();
    cache.saveWaivers([{ id: 'WAIV-01', extraWaterLiters: 80 }]);
    const waivers = cache.getWaivers();
    assertEqual(waivers.length, 1);
    assertEqual(waivers[0].extraWaterLiters, 80);
  });

  await test('L2-08: CacheService - getCylinders y saveCylinders almacenan probetas', () => {
    const cache = new ConcreteTrackCacheService();
    cache.saveCylinders([{ id: 'CYL-01', strengthMpa: 32.1 }]);
    const cyls = cache.getCylinders();
    assertEqual(cyls.length, 1);
    assertEqual(cyls[0].strengthMpa, 32.1);
  });

  await test('L2-09: CacheService - Outbox FIFO encola eventos y flushOutbox los procesa', () => {
    const cache = new ConcreteTrackCacheService();
    cache.flushOutbox(); // asegura vacío
    cache.pushOutbox({ type: 'SYNC_DISPATCH', data: { id: 'D-99' } });
    cache.pushOutbox({ type: 'SYNC_WAIVER', data: { id: 'W-99' } });
    assertEqual(cache.getOutbox().length, 2);
    const flushed = cache.flushOutbox();
    assertEqual(flushed.length, 2);
    assertEqual(cache.getOutbox().length, 0);
  });

  await test('L2-10: CacheService - Invariante Anti-Siembras: purged flag bloquea siembras fantasma', () => {
    const cache = new ConcreteTrackCacheService();
    cache.setDemoPurged(true);
    assertEqual(cache.isDemoPurged(), true);
    // Al solicitar con fallback demo, debe respetar la purga y devolver vacío
    const items = cache.getItems('concretetrack_non_existing_key', [{ id: 'DEMO' }]);
    assertEqual(items.length, 0);
  });

  // ----------------------------------------------------
  // LAYER 3: COMPONENTES & SEGURIDAD DOM (6 Tests)
  // ----------------------------------------------------
  console.log('\n--- CAPA 3: Componentes & Neutralización de Sinks DOM ---');

  await test('L3-01: Sanitizer - escapeHTML neutraliza tags scripts y atributos maliciosos', () => {
    const raw = '<script>alert("xss")</script><img src=x onerror=alert(1)>';
    const escaped = Sanitizer.escapeHTML(raw);
    assert(!escaped.includes('<script>'));
    assert(!escaped.includes('</script>'));
    assert(escaped.includes('&lt;script&gt;'));
  });

  await test('L3-02: Sanitizer - sanitizeURL bloquea protocolos inseguros (javascript:, data:, vbscript:)', () => {
    assertEqual(Sanitizer.sanitizeURL('javascript:stealCookies()'), '#');
    assertEqual(Sanitizer.sanitizeURL('data:text/html;base64,PHNjcmlwdD4='), '#');
    assertEqual(Sanitizer.sanitizeURL('vbscript:msgbox(1)'), '#');
    assertEqual(Sanitizer.sanitizeURL('https://obras.ar/plano.pdf'), 'https://obras.ar/plano.pdf');
  });

  await test('L3-03: Sanitizer - sanitizeNumber garantiza números válidos y fallback seguro', () => {
    assertEqual(Sanitizer.sanitizeNumber(45.2), 45.2);
    assertEqual(Sanitizer.sanitizeNumber('38.5'), 38.5);
    assertEqual(Sanitizer.sanitizeNumber(NaN, 10), 10);
    assertEqual(Sanitizer.sanitizeNumber('invalido', 0), 0);
  });

  await test('L3-04: Sanitizer - safeSetInnerHTML opera de forma segura sin excepciones', () => {
    let captured = '';
    const mockEl = {
      replaceChildren: (node) => { captured = node; },
      textContent: ''
    };
    Sanitizer.safeSetInnerHTML(mockEl, 'Hormigón Conforme');
    assert(mockEl.textContent.includes('Hormigón') || captured !== '', 'Debe asignar contenido de forma segura');
  });

  await test('L3-05: Formatters - formatM3, formatMPa y formatSlump añaden unidades canónicas', () => {
    const m3 = formatM3(8);
    assert(m3.includes('8') && m3.includes('m³'));
    const mpa = formatMPa(32.5);
    assert(mpa.includes('32') && mpa.includes('MPa'));
    const slump = formatSlump(10);
    assertEqual(slump, '10 cm');
  });

  await test('L3-06: Formatters - formatMinutes y formatDateTime formatean lapsos y fechas legibles', () => {
    assertEqual(formatMinutes(45), '45 min');
    assertEqual(formatMinutes(105), '1h 45m');
    const dt = formatDateTime('2026-11-16T14:30:00Z');
    assert(dt !== '-');
    assert(formatDateTime(null), '-');
  });

  // ----------------------------------------------------
  // LAYER 4: SECURITY & AUDITING RULES (6 Tests)
  // ----------------------------------------------------
  console.log('\n--- CAPA 4: Seguridad Cualitativa & Auditoría de Reglas ---');

  await test('L4-01: firebase.json - CSP Cualitativa sin unsafe-eval, sin * y sin http://', () => {
    const firebaseJson = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'firebase.json'), 'utf8'));
    const allHeaders = firebaseJson.hosting.headers.flatMap(h => h.headers);
    const csp = allHeaders.find(h => h.key === 'Content-Security-Policy');
    assert(csp, 'Content-Security-Policy debe existir');
    const val = csp.value;
    assert(!val.includes("'unsafe-eval'"), 'Prohibido unsafe-eval');
    assert(!val.includes('script-src *'), 'Prohibido comodín en script-src');
    assert(!val.includes('http://'), 'Prohibido orígenes http://');
  });

  await test('L4-02: firebase.json - Cabeceras de seguridad requeridas presentes (DENY, nosniff, HSTS)', () => {
    const firebaseJson = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'firebase.json'), 'utf8'));
    const allHeaders = firebaseJson.hosting.headers.flatMap(h => h.headers);
    const xFrame = allHeaders.find(h => h.key === 'X-Frame-Options');
    assertEqual(xFrame.value, 'DENY');
    const xType = allHeaders.find(h => h.key === 'X-Content-Type-Options');
    assertEqual(xType.value, 'nosniff');
    const hsts = allHeaders.find(h => h.key === 'Strict-Transport-Security');
    assert(hsts.value.includes('max-age=31536000'));
  });

  await test('L4-03: firestore.rules - Blindaje Zero-Trust sin allow read, write: if true;', () => {
    const rules = fs.readFileSync(path.join(ROOT_DIR, 'firestore.rules'), 'utf8');
    assert(!rules.includes('allow read, write: if true;'), 'Prohibido allow read, write: if true;');
    assert(!rules.includes('allow write: if true;'), 'Prohibido allow write: if true;');
    assert(rules.includes('isAuthenticated()'));
    assert(rules.includes('dispatches') && rules.includes('waterWaivers') && rules.includes('cylinders') && rules.includes('acopios'));
  });

  await test('L4-04: Secret Scanner - Cero claves o secretos privados en código fuente', () => {
    const srcDir = path.join(ROOT_DIR, 'src');
    const files = fs.readdirSync(srcDir, { recursive: true });
    for (const file of files) {
      const fullPath = path.join(srcDir, file);
      if (fs.statSync(fullPath).isFile() && (file.endsWith('.js') || file.endsWith('.html'))) {
        const content = fs.readFileSync(fullPath, 'utf8');
        assert(!content.includes('sk-ant-'), `Secreto detectado en ${file}`);
        assert(!content.includes('ghp_'), `Token GitHub detectado en ${file}`);
        assert(!content.includes('AIzaSy'), `Clave Firebase hardcodeada en ${file}`);
      }
    }
  });

  await test('L4-05: package.json - Scripts test, test:security y version:bump configurados', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'package.json'), 'utf8'));
    assert(pkg.scripts.test, 'Debe incluir test');
    assert(pkg.scripts['test:security'] || pkg.scripts['security:full'], 'Debe incluir test:security');
    assert(pkg.scripts['version:bump'], 'Debe incluir version:bump');
    assertEqual(pkg.version, '1.0.00');
  });

  await test('L4-06: version.json - Alineación con estándar semántico vX.Y.ZZ', () => {
    const ver = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'version.json'), 'utf8'));
    assertEqual(ver.version, 'v1.0.00');
    assert(ver.appName === 'ConcreteTrack');
  });

  // ----------------------------------------------------
  // LAYER 5: E2E COMPLETE LIFECYCLE WORKFLOW (6 Tests)
  // ----------------------------------------------------
  console.log('\n--- CAPA 5: Flujo Integral E2E de Ciclo de Vida ---');

  await test('L5-01: Ciclo E2E - Paso 1: Apertura de Acopio de 120 m³ de H-30', () => {
    const acopio = AcopioCubicMeterLedgerService.createAcopioContract({
      contractId: 'ACP-E2E-120',
      clientName: 'Constructora Puerto Madero S.A.',
      projectName: 'Dique 4 - Torre Residencial',
      concreteType: 'H-30',
      totalPurchasedM3: 120,
      unitPriceArs: 135000
    });
    assertEqual(acopio.totalPurchasedM3, 120);
    assertEqual(acopio.balanceM3, 120);
    assertEqual(acopio.status, 'ACTIVE');
  });

  await test('L5-02: Ciclo E2E - Paso 2: Despacho de mixer #12 con 8 m³ (Inicia reloj de 120m)', () => {
    const batchTime = new Date('2026-11-16T09:00:00Z');
    const dispatch = {
      remitoNumber: 'REM-2026-7701',
      mixerPlate: 'AD-441-XY',
      driverName: 'Marcos Benítez',
      concreteType: 'H-30',
      volumeM3: 8,
      batchTime: batchTime.toISOString()
    };
    const checkAtPlant = BatchHydrationWindowEngine.evaluateHydration(batchTime, batchTime);
    assertEqual(checkAtPlant.state, HYDRATION_STATES.FRESH_OPTIMAL);
    assertEqual(checkAtPlant.elapsedMinutes, 0);
    assertEqual(dispatch.volumeM3, 8);
  });

  await test('L5-03: Ciclo E2E - Paso 3: Arribo a obra a los 40m (Ventana verde de 80m restantes)', () => {
    const batchTime = new Date('2026-11-16T09:00:00Z');
    const arrivalTime = new Date('2026-11-16T09:40:00Z'); // 40m
    const checkAtSite = BatchHydrationWindowEngine.evaluateHydration(batchTime, arrivalTime);
    assertEqual(checkAtSite.state, HYDRATION_STATES.FRESH_OPTIMAL);
    assertEqual(checkAtSite.elapsedMinutes, 40);
    assertEqual(checkAtSite.remainingMinutes, 80);
    assertEqual(checkAtSite.isExpired, false);
  });

  await test('L5-04: Ciclo E2E - Paso 4: Adición de agua en obra (40 L) -> Deslinde firmado con SHA-256', async () => {
    // 8 m3 con 40 L adicionados (5 L/m3) -> -1.0 MPa
    const impact = WaterAdditionWaiverEngine.calculateWaterImpact({
      concreteType: 'H-30',
      volumeM3: 8,
      litersAdded: 40
    });
    assertCloseTo(impact.estimatedLossMpa, 1.0, 0.1);
    assertEqual(impact.estimatedFinalMpa, 29.0);

    const waiverActa = await WaterAdditionWaiverEngine.createWaiverActa({
      remitoNumber: 'REM-2026-7701',
      mixerPlate: 'AD-441-XY',
      driverName: 'Marcos Benítez',
      clientName: 'Constructora Puerto Madero S.A.',
      siteAddress: 'Dique 4 - Torre Residencial',
      requesterName: 'Ing. Pablo Larrea',
      requesterDni: '26.881.042',
      requesterRole: 'Jefe de Estructura',
      signatureData: 'data:image/png;base64,signatureTestValid7701',
      impact
    });
    assertEqual(waiverActa.status, 'SEALED_VALID');
    assert(waiverActa.cryptoHash.length === 64);
  });

  await test('L5-05: Ciclo E2E - Paso 5: Asentamiento en Cono de Abrams (12 cm) y moldeo de probetas', () => {
    const slumpResult = CylinderCompressionLabEngine.evaluateSlump(12);
    assertEqual(slumpResult.category, 'BLANDO');
    assertEqual(slumpResult.isPumpable, true);
  });

  await test('L5-06: Ciclo E2E - Paso 6: Rotura a 28 días, certificación oficial y descuento en acopio', async () => {
    // 1. Descuento en acopio
    const acopio = AcopioCubicMeterLedgerService.createAcopioContract({
      contractId: 'ACP-E2E-120',
      totalPurchasedM3: 120
    });
    const dispatchRes = AcopioCubicMeterLedgerService.applyDispatchToAcopio(acopio, {
      remitoNumber: 'REM-2026-7701',
      deliveredM3: 8,
      pumpService: true,
      pumpFeeArs: 140000
    });
    assertEqual(dispatchRes.updatedContract.balanceM3, 112);

    // 2. Rotura en prensa a 28 días: Fuerza 525 kN sobre probeta 15x30 cm
    // Tensión = 525000 / 17671.46 = 29.71 MPa
    const strengthRes = CylinderCompressionLabEngine.calculateStrengthMpa({
      forceKn: 525,
      dimensionType: 'STANDARD_15_30'
    });
    assertCloseTo(strengthRes.strengthMpa, 29.71, 0.1);

    // Con el acta de agua, la resistencia esperada ajustada era 29.0 MPa -> supera los 29 MPa
    const compliance = CylinderCompressionLabEngine.evaluateCompliance({
      nominalType: 'H-30',
      strengthMpa: strengthRes.strengthMpa,
      ageDays: 28
    });
    // Al ser 29.71 frente a 30 nominal, es 99% -> CONDICIONAL_MARGINAL reglamentario (o APROBADO bajo acta de deslinde)
    assert(compliance.compliancePercentage >= 99);

    // 3. Certificado oficial sellado
    const cert = await CylinderCompressionLabEngine.createCertifiedReport({
      remitoNumber: 'REM-2026-7701',
      strengthMpa: strengthRes.strengthMpa,
      compliancePercentage: compliance.compliancePercentage,
      complianceResult: compliance.result
    });
    assertEqual(cert.status, 'OFFICIALLY_CERTIFIED');
    assert(cert.cryptoSeal.length === 64);
  });

  console.log('\n======================================================');
  console.log(`   RESUMEN: ${totalTests} ejecutados | ${passedTests} aprobados | ${failedTests} fallados`);
  console.log('======================================================\n');

  if (failedTests > 0) {
    console.error('ERRORES DETECTADOS:');
    failures.forEach(f => console.error(`  - ${f.description}: ${f.error.message}`));
    process.exit(1);
  } else {
    console.log('✅ TODAS LAS PRUEBAS PASARON EXITOSAMENTE (100% PASS)\n');
    process.exit(0);
  }
}

runAllTests().catch(err => {
  console.error('Error fatal ejecutando pruebas:', err);
  process.exit(1);
});
