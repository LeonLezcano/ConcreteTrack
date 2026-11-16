/**
 * app.js — Controlador Principal SPA de ConcreteTrack
 * AiAppFactory Standard
 */

import { BatchHydrationWindowEngine, HYDRATION_STATES } from './core/batchHydrationWindowEngine.js';
import { WaterAdditionWaiverEngine } from './core/waterAdditionWaiverEngine.js';
import { CylinderCompressionLabEngine } from './core/cylinderCompressionLabEngine.js';
import { AcopioCubicMeterLedgerService } from './services/acopioCubicMeterLedgerService.js';
import { ConcreteTrackCacheService } from './services/concreteTrackCache.service.js';
import { Sanitizer } from './utils/sanitizer.js';
import { Formatters } from './utils/formatters.js';

// Semillas iniciales realistas para demostración
const INITIAL_DEMO_DATA = {
  dispatches: [
    {
      remitoNumber: 'REM-001042',
      mixerPlate: 'AE 412 TX',
      driverName: 'Marcelo Díaz',
      clientName: 'Edisur Construcciones',
      siteAddress: 'Torre Milénica III (B° Villa Belgrano)',
      concreteType: 'H-25',
      volumeM3: 8.0,
      slumpCm: 10,
      pumpService: true,
      batchTimestamp: new Date(Date.now() - 35 * 60 * 1000).toISOString(), // 35 min de hidratación (Verde)
      status: 'IN_TRANSIT'
    },
    {
      remitoNumber: 'REM-001041',
      mixerPlate: 'AF 890 BR',
      driverName: 'Gonzalo Benítez',
      clientName: 'Roggio Obras Viales',
      siteAddress: 'Distribuidor Circunvalación Sur Km 14',
      concreteType: 'H-30',
      volumeM3: 7.5,
      slumpCm: 8,
      pumpService: false,
      batchTimestamp: new Date(Date.now() - 98 * 60 * 1000).toISOString(), // 98 min (Amarillo Advertencia)
      status: 'IN_TRANSIT'
    },
    {
      remitoNumber: 'REM-001040',
      mixerPlate: 'AD 231 OP',
      driverName: 'Jorge Romero',
      clientName: 'Constructora del Centro',
      siteAddress: 'Edificio Plaza España',
      concreteType: 'H-21',
      volumeM3: 8.0,
      slumpCm: 12,
      pumpService: true,
      batchTimestamp: new Date(Date.now() - 135 * 60 * 1000).toISOString(), // 135 min (Rojo Vencido)
      status: 'BLOCKED'
    }
  ],
  waivers: [
    {
      actaId: 'WAIV-REM-001038-XYZ',
      remitoNumber: 'REM-001038',
      mixerPlate: 'AE 412 TX',
      clientName: 'Edisur Construcciones',
      siteAddress: 'Torre Milénica III',
      requesterName: 'Arq. Fernando Castro',
      requesterDni: '29.412.890',
      requesterRole: 'Jefe de Obra',
      timestamp: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
      impact: {
        concreteType: 'H-25',
        volumeM3: 8.0,
        litersAdded: 80,
        initialAc: 0.48,
        finalAc: 0.509,
        estimatedLossMpa: 2.0,
        estimatedFinalMpa: 23.0
      },
      cryptoHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      status: 'SEALED_VALID'
    }
  ],
  cylinders: [
    {
      certificateId: 'LAB-CIRSOC-101',
      cylinderId: 'PROB-H25-A',
      nominalType: 'H-25',
      ageDays: 28,
      dimensionType: 'STANDARD_15_30',
      forceKn: 495,
      strengthMpa: 28.01,
      result: 'CONFORME_APROBADO',
      issuedAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
      cryptoSeal: 'a1b2c3d4e5f67890abcdef1234567890abcdef1234567890abcdef1234567890'
    },
    {
      certificateId: 'LAB-CIRSOC-102',
      cylinderId: 'PROB-H30-B',
      nominalType: 'H-30',
      ageDays: 7,
      dimensionType: 'STANDARD_15_30',
      forceKn: 390,
      strengthMpa: 22.07,
      result: 'CONFORME_APROBADO',
      issuedAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
      cryptoSeal: 'f0e1d2c3b4a596877890abcdef1234567890abcdef1234567890abcdef123456'
    }
  ],
  acopios: [
    {
      contractId: 'ACP-EDISUR-2026',
      clientName: 'Edisur Construcciones',
      projectName: 'Torre Milénica III',
      concreteType: 'H-25',
      totalPurchasedM3: 400,
      deliveredM3: 168.0,
      balanceM3: 232.0,
      unitPriceArs: 115000,
      totalContractArs: 46000000,
      status: 'ACTIVE'
    },
    {
      contractId: 'ACP-ROGGIO-2026',
      clientName: 'Roggio Obras Viales',
      projectName: 'Circunvalación Sur',
      concreteType: 'H-30',
      totalPurchasedM3: 600,
      deliveredM3: 420.0,
      balanceM3: 180.0,
      unitPriceArs: 128000,
      totalContractArs: 76800000,
      status: 'ACTIVE'
    }
  ]
};

class ConcreteTrackApp {
  constructor() {
    this.cache = new ConcreteTrackCacheService();
    this.wakeLock = null;
    this.currentTab = 'dispatches';
    this.hasMockSignature = false;

    this.init();
  }

  async init() {
    this.bindEvents();
    this.registerServiceWorker();
    this.initWakeLock();
    this.renderActiveTab();
    this.startHydrationTicker();
  }

  registerServiceWorker() {
    if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('./sw.js').catch(() => {
        // Fallback silencioso sin alertas
      });
    }
  }

  // --- MODO CABINA (Screen Wake Lock API - Directiva 9) ---
  async initWakeLock() {
    const btnWake = document.getElementById('btn-wakelock');
    const dotWake = document.getElementById('wakelock-dot');
    const lblWake = document.getElementById('wakelock-label');

    const requestLock = async () => {
      if ('wakeLock' in navigator) {
        try {
          this.wakeLock = await navigator.wakeLock.request('screen');
          dotWake.className = 'w-2 h-2 rounded-full bg-emerald-400 animate-pulse';
          lblWake.textContent = 'Cabina ON';
          this.wakeLock.addEventListener('release', () => {
            dotWake.className = 'w-2 h-2 rounded-full bg-slate-500';
            lblWake.textContent = 'Cabina';
            this.wakeLock = null;
          });
        } catch {
          dotWake.className = 'w-2 h-2 rounded-full bg-slate-500';
          lblWake.textContent = 'Cabina';
        }
      }
    };

    btnWake.addEventListener('click', async () => {
      if (this.wakeLock) {
        await this.wakeLock.release();
      } else {
        await requestLock();
      }
    });

    // Auto-reenganche obligatorio al regresar de Maps o Waze
    document.addEventListener('visibilitychange', async () => {
      if (document.visibilityState === 'visible' && !this.wakeLock) {
        await requestLock();
      }
    });
  }

  bindEvents() {
    // Pestañas de navegación
    document.querySelectorAll('.nav-tab').forEach((tab) => {
      tab.addEventListener('click', (e) => {
        const target = e.currentTarget.getAttribute('data-tab');
        this.switchTab(target);
      });
    });

    // Botones para abrir modales
    document.getElementById('btn-new-dispatch')?.addEventListener('click', () => {
      this.openModal('modal-dispatch');
    });
    document.getElementById('btn-open-waiver-modal')?.addEventListener('click', () => {
      this.populateWaiverSelect();
      this.openModal('modal-waiver');
    });
    document.getElementById('btn-open-lab-modal')?.addEventListener('click', () => {
      this.openModal('modal-lab');
    });
    document.getElementById('btn-open-acopio-modal')?.addEventListener('click', () => {
      this.openModal('modal-acopio');
    });

    // Botones de cierre de modales
    document.querySelectorAll('.btn-close-modal').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.closeAllModals();
      });
    });

    // Captura simulada de firma táctil
    document.getElementById('btn-mock-sign')?.addEventListener('click', () => {
      this.hasMockSignature = true;
      const preview = document.getElementById('sign-preview');
      if (preview) preview.classList.remove('hidden');
    });

    // Envío de Formularios
    document.getElementById('form-dispatch')?.addEventListener('submit', (e) => this.handleDispatchSubmit(e));
    document.getElementById('form-waiver')?.addEventListener('submit', (e) => this.handleWaiverSubmit(e));
    document.getElementById('form-lab')?.addEventListener('submit', (e) => this.handleLabSubmit(e));
    document.getElementById('form-acopio')?.addEventListener('submit', (e) => this.handleAcopioSubmit(e));

    // Cálculo dinámico de impacto al escribir litros en el modal de agua
    document.getElementById('waiv-liters')?.addEventListener('input', () => this.updateWaiverPreview());
    document.getElementById('waiv-dispatch-select')?.addEventListener('change', () => this.updateWaiverPreview());

    // Purgar Demo
    document.getElementById('btn-purge-demo')?.addEventListener('click', () => {
      if (confirm('¿Seguro que deseas purgar los datos de demostración? Los datos se restablecerán a cero.')) {
        this.cache.purgeAllData();
        this.renderActiveTab();
      }
    });

    // Delegación de clics en listas (Acciones rápidas)
    document.getElementById('dispatches-list')?.addEventListener('click', (e) => {
      const btnDischarge = e.target.closest('[data-action="discharge"]');
      if (btnDischarge) {
        const remito = btnDischarge.getAttribute('data-remito');
        this.markDischarged(remito);
      }
    });
  }

  switchTab(tabId) {
    this.currentTab = tabId;
    document.querySelectorAll('.tab-view').forEach((view) => {
      view.classList.add('hidden');
    });
    const currentView = document.getElementById(`view-${tabId}`);
    if (currentView) currentView.classList.remove('hidden');

    document.querySelectorAll('.nav-tab').forEach((tab) => {
      const isCurrent = tab.getAttribute('data-tab') === tabId;
      if (isCurrent) {
        tab.className = 'nav-tab touch-target flex-1 px-3 py-2 rounded-lg text-xs font-semibold text-sky-400 bg-sky-950/60 border border-sky-800 flex items-center justify-center gap-1.5 whitespace-nowrap';
      } else {
        tab.className = 'nav-tab touch-target flex-1 px-3 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-slate-200 border border-transparent flex items-center justify-center gap-1.5 whitespace-nowrap';
      }
    });

    this.renderActiveTab();
  }

  renderActiveTab() {
    switch (this.currentTab) {
      case 'dispatches':
        this.renderDispatches();
        break;
      case 'water':
        this.renderWaivers();
        break;
      case 'lab':
        this.renderLab();
        break;
      case 'acopios':
        this.renderAcopios();
        break;
    }
  }

  startHydrationTicker() {
    setInterval(() => {
      if (this.currentTab === 'dispatches') {
        this.renderDispatches();
      }
    }, 30000);
  }

  // --- RENDER VISTA 1: DESPACHOS Y MIXERS ---
  renderDispatches() {
    const listEl = document.getElementById('dispatches-list');
    if (!listEl) return;

    const dispatches = this.cache.getDispatches(INITIAL_DEMO_DATA.dispatches);
    let freshCount = 0;
    let warnCount = 0;
    let expCount = 0;

    if (dispatches.length === 0) {
      Sanitizer.safeSetInnerHTML(listEl, `
        <div class="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-xs">
          No hay mixers despachados en este momento.
        </div>
      `);
      document.getElementById('count-fresh').textContent = '0';
      document.getElementById('count-warning').textContent = '0';
      document.getElementById('count-expired').textContent = '0';
      return;
    }

    let html = '';
    dispatches.forEach((d) => {
      const evaluation = BatchHydrationWindowEngine.evaluateHydration(d.batchTimestamp);
      if (d.status === 'DISCHARGED') {
        // Descargado ya cumplió
      } else if (evaluation.isExpired) {
        expCount++;
      } else if (evaluation.isWarning) {
        warnCount++;
      } else {
        freshCount++;
      }

      let badgeBg = 'bg-emerald-950 text-emerald-400 border-emerald-800';
      let badgeLabel = `Óptimo (${evaluation.remainingMinutes} min restantes)`;

      if (d.status === 'DISCHARGED') {
        badgeBg = 'bg-slate-800 text-slate-400 border-slate-700';
        badgeLabel = 'Descargado en Obra';
      } else if (evaluation.state === HYDRATION_STATES.EXPIRED_BLOCKED) {
        badgeBg = 'bg-rose-950 text-rose-400 border-rose-800 animate-pulse';
        badgeLabel = '⛔ VENCIDO (>120m)';
      } else if (evaluation.state === HYDRATION_STATES.WORKABILITY_WARNING) {
        badgeBg = 'bg-amber-950 text-amber-400 border-amber-800';
        badgeLabel = `⚠️ ALERTA (${evaluation.remainingMinutes} min)`;
      }

      html += `
        <article class="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm hover:border-slate-700 transition space-y-3">
          <div class="flex items-start justify-between gap-2">
            <div>
              <div class="flex items-center gap-2">
                <span class="font-bold text-white text-sm">${Sanitizer.escapeHTML(d.remitoNumber)}</span>
                <span class="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold">${Sanitizer.escapeHTML(d.mixerPlate)}</span>
                <span class="text-xs px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800 font-bold">${Sanitizer.escapeHTML(d.concreteType)}</span>
              </div>
              <p class="text-xs text-slate-400 mt-0.5">Chofer: <strong class="text-slate-300">${Sanitizer.escapeHTML(d.driverName)}</strong></p>
            </div>
            <span class="text-xs px-2.5 py-1 rounded-full border font-semibold ${badgeBg}">
              ${badgeLabel}
            </span>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
            <div>
              <span class="text-slate-400 block">Obra / Destino:</span>
              <span class="font-medium text-slate-200 truncate block">${Sanitizer.escapeHTML(d.siteAddress)}</span>
            </div>
            <div>
              <span class="text-slate-400 block">Volumen:</span>
              <span class="font-medium text-slate-200">${Formatters.formatCubicMeters(d.volumeM3)} ${d.pumpService ? '• Con Bomba' : ''}</span>
            </div>
            <div>
              <span class="text-slate-400 block">Carguío en Planta:</span>
              <span class="font-medium text-slate-200">${Formatters.formatDateTime(d.batchTimestamp)}</span>
            </div>
            <div>
              <span class="text-slate-400 block">Tiempo Transcurrido:</span>
              <span class="font-bold ${evaluation.isExpired ? 'text-rose-400' : evaluation.isWarning ? 'text-amber-400' : 'text-emerald-400'}">
                ${evaluation.elapsedMinutes} min (de 120m)
              </span>
            </div>
          </div>

          <div class="flex items-center justify-between pt-1">
            <span class="text-[11px] text-slate-400">${Sanitizer.escapeHTML(d.clientName)}</span>
            ${d.status !== 'DISCHARGED' ? `
              <button class="touch-target px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-sky-400 border border-slate-700 transition" data-action="discharge" data-remito="${Sanitizer.escapeHTML(d.remitoNumber)}" aria-label="Confirmar Descarga">
                ✓ Finalizar Descarga
              </button>
            ` : '<span class="text-xs text-slate-400 font-medium">✓ Remito Cerrado</span>'}
          </div>
        </article>
      `;
    });

    Sanitizer.safeSetInnerHTML(listEl, html);
    document.getElementById('count-fresh').textContent = String(freshCount);
    document.getElementById('count-warning').textContent = String(warnCount);
    document.getElementById('count-expired').textContent = String(expCount);
  }

  markDischarged(remitoNumber) {
    const dispatches = this.cache.getDispatches(INITIAL_DEMO_DATA.dispatches);
    const item = dispatches.find(d => d.remitoNumber === remitoNumber);
    if (item) {
      item.status = 'DISCHARGED';
      this.cache.saveDispatches(dispatches);
      this.renderDispatches();
    }
  }

  // --- RENDER VISTA 2: DESLINDE DE AGUA ---
  renderWaivers() {
    const listEl = document.getElementById('waivers-list');
    if (!listEl) return;

    const waivers = this.cache.getWaivers(INITIAL_DEMO_DATA.waivers);
    if (waivers.length === 0) {
      Sanitizer.safeSetInnerHTML(listEl, `
        <div class="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-xs">
          No se han registrado actas de adición de agua en obra.
        </div>
      `);
      return;
    }

    let html = '';
    waivers.forEach((w) => {
      html += `
        <article class="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm hover:border-slate-700 transition space-y-3">
          <div class="flex items-start justify-between gap-2">
            <div>
              <div class="flex items-center gap-2">
                <span class="font-bold text-white text-sm">${Sanitizer.escapeHTML(w.actaId)}</span>
                <span class="text-xs font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800">Remito: ${Sanitizer.escapeHTML(w.remitoNumber)}</span>
              </div>
              <p class="text-xs text-slate-400 mt-0.5">Obra: <strong class="text-slate-300">${Sanitizer.escapeHTML(w.siteAddress)}</strong> (${Sanitizer.escapeHTML(w.clientName)})</p>
            </div>
            <span class="text-xs px-2.5 py-1 rounded-full border bg-amber-950 text-amber-400 border-amber-800 font-bold">
              +${Sanitizer.escapeHTML(w.impact.litersAdded)} Lts Agua
            </span>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-slate-950/70 p-3 rounded-xl border border-slate-800">
            <div>
              <span class="text-slate-400 block">Solicitante:</span>
              <span class="font-semibold text-slate-200">${Sanitizer.escapeHTML(w.requesterName)}</span>
              <span class="text-[10px] text-slate-400 block">DNI: ${Sanitizer.escapeHTML(w.requesterDni)}</span>
            </div>
            <div>
              <span class="text-slate-400 block">Alteración a/c:</span>
              <span class="font-bold text-amber-400">${Sanitizer.escapeHTML(w.impact.initialAc)} &rarr; ${Sanitizer.escapeHTML(w.impact.finalAc)}</span>
            </div>
            <div>
              <span class="text-slate-400 block">Pérdida Resistencia:</span>
              <span class="font-bold text-rose-400">-${Sanitizer.escapeHTML(w.impact.estimatedLossMpa)} MPa</span>
            </div>
            <div>
              <span class="text-slate-400 block">Resistencia Final Est.:</span>
              <span class="font-bold text-white">${Sanitizer.escapeHTML(w.impact.estimatedFinalMpa)} MPa</span>
            </div>
          </div>

          <div class="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
            <span class="font-mono text-emerald-400">✓ Sello SHA-256: ${Sanitizer.escapeHTML(w.cryptoHash.slice(0, 16))}...</span>
            <span>${Formatters.formatDateTime(w.timestamp)}</span>
          </div>
        </article>
      `;
    });

    Sanitizer.safeSetInnerHTML(listEl, html);
  }

  populateWaiverSelect() {
    const select = document.getElementById('waiv-dispatch-select');
    if (!select) return;
    const dispatches = this.cache.getDispatches(INITIAL_DEMO_DATA.dispatches);
    Sanitizer.safeSetInnerHTML(select, dispatches.map(d => `
      <option value="${Sanitizer.escapeHTML(d.remitoNumber)}" data-type="${Sanitizer.escapeHTML(d.concreteType)}" data-vol="${Sanitizer.escapeHTML(d.volumeM3)}" data-client="${Sanitizer.escapeHTML(d.clientName)}" data-site="${Sanitizer.escapeHTML(d.siteAddress)}" data-plate="${Sanitizer.escapeHTML(d.mixerPlate)}" data-driver="${Sanitizer.escapeHTML(d.driverName)}">
        ${Sanitizer.escapeHTML(d.remitoNumber)} - ${Sanitizer.escapeHTML(d.mixerPlate)} (${Sanitizer.escapeHTML(d.concreteType)} ${Sanitizer.escapeHTML(d.volumeM3)}m³)
      </option>
    `).join(''));
    this.updateWaiverPreview();
  }

  updateWaiverPreview() {
    const select = document.getElementById('waiv-dispatch-select');
    const litersInput = document.getElementById('waiv-liters');
    if (!select || !litersInput) return;

    const opt = select.selectedOptions[0];
    const concreteType = opt?.getAttribute('data-type') || 'H-25';
    const volumeM3 = Number(opt?.getAttribute('data-vol')) || 8;
    const litersAdded = Number(litersInput.value) || 0;

    const impact = WaterAdditionWaiverEngine.calculateWaterImpact({
      concreteType,
      volumeM3,
      litersAdded
    });

    document.getElementById('impact-delta-ac').textContent = `+${impact.deltaAc}`;
    document.getElementById('impact-loss-mpa').textContent = `-${impact.estimatedLossMpa} MPa`;
    document.getElementById('impact-final-mpa').textContent = `${impact.estimatedFinalMpa} MPa`;
  }

  // --- RENDER VISTA 3: LABORATORIO CIRSOC ---
  renderLab() {
    const listEl = document.getElementById('cylinders-list');
    if (!listEl) return;

    const cylinders = this.cache.getCylinders(INITIAL_DEMO_DATA.cylinders);
    if (cylinders.length === 0) {
      Sanitizer.safeSetInnerHTML(listEl, `
        <div class="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-xs">
          No hay ensayos de probetas registrados.
        </div>
      `);
      return;
    }

    let html = '';
    cylinders.forEach((c) => {
      const isApproved = c.result === 'CONFORME_APROBADO';
      const badgeClass = isApproved
        ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
        : 'bg-rose-950 text-rose-400 border-rose-800';

      html += `
        <article class="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm hover:border-slate-700 transition space-y-3">
          <div class="flex items-start justify-between gap-2">
            <div>
              <div class="flex items-center gap-2">
                <span class="font-bold text-white text-sm">${Sanitizer.escapeHTML(c.cylinderId)}</span>
                <span class="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-sky-400 font-bold">${Sanitizer.escapeHTML(c.nominalType)}</span>
                <span class="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">${Sanitizer.escapeHTML(c.ageDays)} Días</span>
              </div>
              <p class="text-xs text-slate-400 mt-0.5">Certificado Oficial: <strong class="text-slate-300">${Sanitizer.escapeHTML(c.certificateId)}</strong></p>
            </div>
            <span class="text-xs px-2.5 py-1 rounded-full border font-bold ${badgeClass}">
              ${isApproved ? '✓ CONFORME CIRSOC' : '⛔ NO CONFORME'}
            </span>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-slate-950/70 p-3 rounded-xl border border-slate-800">
            <div>
              <span class="text-slate-400 block">Fuerza Prensa:</span>
              <span class="font-bold text-white">${Sanitizer.escapeHTML(c.forceKn)} kN</span>
            </div>
            <div>
              <span class="text-slate-400 block">Tensión de Rotura:</span>
              <span class="font-bold text-emerald-400 text-sm">${Formatters.formatMegaPascals(c.strengthMpa)}</span>
            </div>
            <div>
              <span class="text-slate-400 block">Resistencia Nominal:</span>
              <span class="font-medium text-slate-300">${Sanitizer.escapeHTML(c.nominalType)}</span>
            </div>
            <div>
              <span class="text-slate-400 block">Molde / Norma:</span>
              <span class="text-slate-300">${c.dimensionType === 'STANDARD_15_30' ? '15x30 cm' : '10x20 cm'} (IRAM 1546)</span>
            </div>
          </div>

          <div class="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
            <span class="font-mono text-emerald-400">✓ Sello SHA-256: ${Sanitizer.escapeHTML(c.cryptoSeal.slice(0, 16))}...</span>
            <span>Ensayo: ${Formatters.formatDateTime(c.issuedAt)}</span>
          </div>
        </article>
      `;
    });

    Sanitizer.safeSetInnerHTML(listEl, html);
  }

  // --- RENDER VISTA 4: ACOPIOS EN M³ ---
  renderAcopios() {
    const listEl = document.getElementById('acopios-list');
    if (!listEl) return;

    const acopios = this.cache.getAcopios(INITIAL_DEMO_DATA.acopios);
    if (acopios.length === 0) {
      Sanitizer.safeSetInnerHTML(listEl, `
        <div class="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-xs">
          No hay contratos de acopio registrados.
        </div>
      `);
      return;
    }

    let html = '';
    acopios.forEach((a) => {
      const deliveredPercent = Math.min(100, Math.round((a.deliveredM3 / a.totalPurchasedM3) * 100));

      html += `
        <article class="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm hover:border-slate-700 transition space-y-3">
          <div class="flex items-start justify-between gap-2">
            <div>
              <div class="flex items-center gap-2">
                <span class="font-bold text-white text-sm">${Sanitizer.escapeHTML(a.clientName)}</span>
                <span class="text-xs px-2 py-0.5 rounded bg-purple-950 text-purple-400 border border-purple-800 font-bold">${Sanitizer.escapeHTML(a.concreteType)}</span>
              </div>
              <p class="text-xs text-slate-400 mt-0.5">Obra: <strong class="text-slate-300">${Sanitizer.escapeHTML(a.projectName)}</strong> (Contrato: ${Sanitizer.escapeHTML(a.contractId)})</p>
            </div>
            <span class="text-xs px-2.5 py-1 rounded-full border bg-slate-800 text-slate-300 border-slate-700 font-semibold">
              ${deliveredPercent}% Entregado
            </span>
          </div>

          <!-- Barra de Progreso Volumétrico -->
          <div class="space-y-1">
            <div class="flex justify-between text-xs">
              <span class="text-slate-400">Entregado: <strong class="text-white">${Formatters.formatCubicMeters(a.deliveredM3)}</strong></span>
              <span class="text-slate-400">Saldo Restante: <strong class="text-purple-400 font-bold">${Formatters.formatCubicMeters(a.balanceM3)}</strong></span>
            </div>
            <div class="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-800">
              <div class="bg-gradient-to-r from-sky-500 to-purple-500 h-2.5 rounded-full" style="width: ${deliveredPercent}%"></div>
            </div>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs bg-slate-950/70 p-3 rounded-xl border border-slate-800">
            <div>
              <span class="text-slate-400 block">Total Acopio:</span>
              <span class="font-bold text-white">${Formatters.formatCubicMeters(a.totalPurchasedM3)}</span>
            </div>
            <div>
              <span class="text-slate-400 block">Precio Congelado / m³:</span>
              <span class="font-medium text-slate-300">${Formatters.formatCurrencyARS(a.unitPriceArs)}</span>
            </div>
            <div>
              <span class="text-slate-400 block">Monto Total Contrato:</span>
              <span class="font-medium text-slate-300">${Formatters.formatCurrencyARS(a.totalContractArs)}</span>
            </div>
          </div>
        </article>
      `;
    });

    Sanitizer.safeSetInnerHTML(listEl, html);
  }

  // --- GESTIÓN DE MODALES Y SUBMITS ---
  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('hidden');
    }
  }

  closeAllModals() {
    document.querySelectorAll('[role="dialog"]').forEach((m) => m.classList.add('hidden'));
    this.hasMockSignature = false;
    const preview = document.getElementById('sign-preview');
    if (preview) preview.classList.add('hidden');
  }

  handleDispatchSubmit(e) {
    e.preventDefault();
    const remito = document.getElementById('disp-remito').value.trim();
    const plate = document.getElementById('disp-plate').value.trim().toUpperCase();
    const driver = document.getElementById('disp-driver').value.trim();
    const client = document.getElementById('disp-client').value.trim();
    const site = document.getElementById('disp-site').value.trim();
    const type = document.getElementById('disp-type').value;
    const vol = Number(document.getElementById('disp-volume').value) || 8;
    const slump = Number(document.getElementById('disp-slump').value) || 10;
    const pump = document.getElementById('disp-pump').checked;

    const newDispatch = {
      remitoNumber: remito,
      mixerPlate: plate,
      driverName: driver,
      clientName: client,
      siteAddress: site,
      concreteType: type,
      volumeM3: vol,
      slumpCm: slump,
      pumpService: pump,
      batchTimestamp: new Date().toISOString(),
      status: 'IN_TRANSIT'
    };

    const dispatches = this.cache.getDispatches(INITIAL_DEMO_DATA.dispatches);
    dispatches.unshift(newDispatch);
    this.cache.saveDispatches(dispatches);
    this.cache.pushOutbox({ type: 'DISPATCH_CREATED', data: newDispatch });

    this.closeAllModals();
    e.target.reset();
    this.renderDispatches();
  }

  async handleWaiverSubmit(e) {
    e.preventDefault();
    const select = document.getElementById('waiv-dispatch-select');
    const opt = select.selectedOptions[0];
    const remito = select.value;
    const litersAdded = Number(document.getElementById('waiv-liters').value) || 0;
    const reqName = document.getElementById('waiv-req-name').value.trim();
    const reqDni = document.getElementById('waiv-req-dni').value.trim();

    if (!this.hasMockSignature) {
      alert('Por favor estampe la firma digital en pantalla antes de emitir el acta legal.');
      return;
    }

    const impact = WaterAdditionWaiverEngine.calculateWaterImpact({
      concreteType: opt.getAttribute('data-type') || 'H-25',
      volumeM3: Number(opt.getAttribute('data-vol')) || 8,
      litersAdded
    });

    const waiver = await WaterAdditionWaiverEngine.createWaiverActa({
      remitoNumber: remito,
      mixerPlate: opt.getAttribute('data-plate') || 'AE 000 XX',
      driverName: opt.getAttribute('data-driver') || 'Chofer',
      clientName: opt.getAttribute('data-client') || 'Cliente',
      siteAddress: opt.getAttribute('data-site') || 'Obra',
      requesterName: reqName,
      requesterDni: reqDni,
      signatureData: 'SIG_BIOMETRIC_CAPTURED',
      impact
    });

    const waivers = this.cache.getWaivers(INITIAL_DEMO_DATA.waivers);
    waivers.unshift(waiver);
    this.cache.saveWaivers(waivers);
    this.cache.pushOutbox({ type: 'WAIVER_CREATED', data: waiver });

    this.closeAllModals();
    e.target.reset();
    this.switchTab('water');
  }

  async handleLabSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('lab-cylinder-id').value.trim();
    const nominal = document.getElementById('lab-nominal-type').value;
    const age = Number(document.getElementById('lab-age').value) || 28;
    const dim = document.getElementById('lab-dim').value;
    const forceKn = Number(document.getElementById('lab-force-kn').value) || 450;

    const strengthCalc = CylinderCompressionLabEngine.calculateStrengthMpa({
      forceKn,
      dimensionType: dim
    });

    const compliance = CylinderCompressionLabEngine.evaluateCompliance({
      nominalType: nominal,
      strengthMpa: strengthCalc.strengthMpa,
      ageDays: age
    });

    const report = await CylinderCompressionLabEngine.createCertifiedReport({
      cylinderId: id,
      nominalType: nominal,
      ageDays: age,
      dimensionType: dim,
      forceKn,
      strengthMpa: strengthCalc.strengthMpa,
      result: compliance.result,
      compliancePercentage: compliance.compliancePercentage,
      judgmentText: compliance.judgmentText
    });

    const cylinders = this.cache.getCylinders(INITIAL_DEMO_DATA.cylinders);
    cylinders.unshift(report);
    this.cache.saveCylinders(cylinders);
    this.cache.pushOutbox({ type: 'CYLINDER_TEST_LOGGED', data: report });

    this.closeAllModals();
    e.target.reset();
    this.switchTab('lab');
  }

  handleAcopioSubmit(e) {
    e.preventDefault();
    const client = document.getElementById('acop-client').value.trim();
    const project = document.getElementById('acop-project').value.trim();
    const type = document.getElementById('acop-type').value;
    const vol = Number(document.getElementById('acop-volume').value) || 100;
    const price = Number(document.getElementById('acop-price').value) || 110000;

    const contract = AcopioCubicMeterLedgerService.createAcopioContract({
      clientName: client,
      projectName: project,
      concreteType: type,
      totalPurchasedM3: vol,
      unitPriceArs: price
    });

    const acopios = this.cache.getAcopios(INITIAL_DEMO_DATA.acopios);
    acopios.unshift(contract);
    this.cache.saveAcopios(acopios);
    this.cache.pushOutbox({ type: 'ACOPIO_CREATED', data: contract });

    this.closeAllModals();
    e.target.reset();
    this.switchTab('acopios');
  }
}

// Inicializar la aplicación al cargar el DOM
window.addEventListener('DOMContentLoaded', () => {
  window.concreteTrackApp = new ConcreteTrackApp();
});
