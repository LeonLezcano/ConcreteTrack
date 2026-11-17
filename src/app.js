/**
 * app.js - Controlador Principal SPA de ConcreteTrack
 * AiAppFactory Standard
 */

import { BatchHydrationWindowEngine, HYDRATION_STATES } from './core/batchHydrationWindowEngine.js';
import { WaterAdditionWaiverEngine } from './core/waterAdditionWaiverEngine.js';
import { CylinderCompressionLabEngine } from './core/cylinderCompressionLabEngine.js';
import { AcopioCubicMeterLedgerService } from './services/acopioCubicMeterLedgerService.js';
import { ConcreteTrackCacheService } from './services/concreteTrackCache.service.js';
import { Sanitizer } from './utils/sanitizer.js';
import { Formatters } from './utils/formatters.js';

// Semillas iniciales de demostración etiquetadas explícitamente con isDemo: true
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
      batchTimestamp: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
      status: 'IN_TRANSIT',
      isDemo: true
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
      batchTimestamp: new Date(Date.now() - 98 * 60 * 1000).toISOString(),
      status: 'IN_TRANSIT',
      isDemo: true
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
      batchTimestamp: new Date(Date.now() - 135 * 60 * 1000).toISOString(),
      status: 'BLOCKED',
      isDemo: true
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
      status: 'SEALED_VALID',
      isDemo: true
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
      cryptoSeal: 'a1b2c3d4e5f67890abcdef1234567890abcdef1234567890abcdef1234567890',
      isDemo: true
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
      cryptoSeal: 'f0e1d2c3b4a596877890abcdef1234567890abcdef1234567890abcdef123456',
      isDemo: true
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
      status: 'ACTIVE',
      isDemo: true
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
      status: 'ACTIVE',
      isDemo: true
    }
  ]
};

const ACTIVE_TAB_CLASSES = ['ct-badge-info', 'border'];
const INACTIVE_TAB_CLASSES = ['text-slate-300', 'bg-transparent', 'border-transparent', 'hover:text-white', 'hover:bg-slate-800'];

class ConcreteTrackApp {
  constructor() {
    this.cache = new ConcreteTrackCacheService();
    this.wakeLock = null;
    this.currentTab = 'dispatches';
    this.hasSignatureStroke = false;
    this.isDrawingSignature = false;
    this.lastFocusedElement = null;
    this.activeModalId = null;

    this.init();
  }

  async init() {
    this.cache.setErrorHandler((msg) => this.showAppError(msg));
    this.bindEvents();
    this.initSignaturePad();
    this.initWakeLock();
    this.updateNetworkStatus();
    this.loadVersionBadge();
    this.renderActiveTab();
    this.startHydrationTicker();
  }

  async loadVersionBadge() {
    const badgeEl = document.getElementById('version-badge');
    if (!badgeEl) return;
    try {
      const res = await fetch('./version.json', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data.version === 'string') {
          badgeEl.textContent = data.version;
        }
      }
    } catch {
      // Mantiene versión de respaldo si está offline sin caché previa de version.json
    }
  }

  updateNetworkStatus() {
    const dot = document.getElementById('network-dot');
    const label = document.getElementById('network-label');
    if (!dot || !label) return;

    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine !== false : true;
    const outboxCount = this.cache.getOutbox().length;

    dot.classList.remove('ct-dot-online', 'ct-dot-queued', 'ct-dot-offline');
    if (isOnline) {
      dot.classList.add(outboxCount > 0 ? 'ct-dot-queued' : 'ct-dot-online');
      label.textContent = outboxCount > 0
        ? `En línea · Local (${outboxCount} en cola)`
        : 'En línea · Local';
    } else {
      dot.classList.add('ct-dot-offline');
      label.textContent = outboxCount > 0
        ? `Offline · ${outboxCount} en cola`
        : 'Offline · Almacenamiento local';
    }
  }

  showAppError(message) {
    const banner = document.getElementById('app-error-banner');
    const msgEl = document.getElementById('app-error-message');
    if (!banner || !msgEl) return;
    msgEl.textContent = String(message || 'Ocurrió un error al acceder al almacenamiento local.');
    banner.classList.remove('hidden');
  }

  hideAppError() {
    const banner = document.getElementById('app-error-banner');
    if (banner) banner.classList.add('hidden');
    this.cache.clearLastError();
  }

  updateDemoBanner() {
    const banner = document.getElementById('demo-mode-banner');
    if (!banner) return;
    const hasDemoRecords =
      !this.cache.isDemoPurged() ||
      this.cache.getDispatches([]).some((d) => d.isDemo) ||
      this.cache.getWaivers([]).some((w) => w.isDemo) ||
      this.cache.getCylinders([]).some((c) => c.isDemo) ||
      this.cache.getAcopios([]).some((a) => a.isDemo);

    banner.classList.toggle('hidden', !hasDemoRecords);
  }

  // --- MODO CABINA (Screen Wake Lock API) ---
  async initWakeLock() {
    const btnWake = document.getElementById('btn-wakelock');
    const dotWake = document.getElementById('wakelock-dot');
    const lblWake = document.getElementById('wakelock-label');
    if (!btnWake || !dotWake || !lblWake) return;

    const setWakeUi = (active) => {
      dotWake.classList.remove('ct-dot-idle', 'ct-dot-online');
      dotWake.classList.add(active ? 'ct-dot-online' : 'ct-dot-idle');
      lblWake.textContent = active ? 'Cabina ON' : 'Cabina';
      btnWake.setAttribute('aria-pressed', active ? 'true' : 'false');
    };

    const requestLock = async () => {
      if ('wakeLock' in navigator) {
        try {
          this.wakeLock = await navigator.wakeLock.request('screen');
          setWakeUi(true);
          this.wakeLock.addEventListener('release', () => {
            setWakeUi(false);
            this.wakeLock = null;
          });
        } catch {
          setWakeUi(false);
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

    document.addEventListener('visibilitychange', async () => {
      if (document.visibilityState === 'visible' && !this.wakeLock && btnWake.getAttribute('aria-pressed') === 'true') {
        await requestLock();
      }
    });
  }

  // --- PAD REAL DE FIRMA TÁCTIL EN CANVAS ---
  initSignaturePad() {
    const canvas = document.getElementById('signature-canvas');
    const clearBtn = document.getElementById('btn-clear-sign');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const getCanvasPoint = (event) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = rect.width > 0 ? canvas.width / rect.width : 1;
      const scaleY = rect.height > 0 ? canvas.height / rect.height : 1;
      return {
        x: (event.clientX - rect.left) * scaleX,
        y: (event.clientY - rect.top) * scaleY
      };
    };

    const startStroke = (event) => {
      event.preventDefault();
      this.isDrawingSignature = true;
      const pt = getCanvasPoint(event);
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(pt.x, pt.y);
      ctx.lineTo(pt.x + 0.01, pt.y + 0.01);
      ctx.stroke();
      this.markSignatureCaptured();
    };

    const moveStroke = (event) => {
      if (!this.isDrawingSignature) return;
      event.preventDefault();
      const pt = getCanvasPoint(event);
      ctx.lineTo(pt.x, pt.y);
      ctx.stroke();
    };

    const endStroke = () => {
      this.isDrawingSignature = false;
    };

    canvas.addEventListener('pointerdown', startStroke);
    canvas.addEventListener('pointermove', moveStroke);
    canvas.addEventListener('pointerup', endStroke);
    canvas.addEventListener('pointercancel', endStroke);
    canvas.addEventListener('pointerleave', endStroke);

    clearBtn?.addEventListener('click', () => this.clearSignaturePad());
  }

  markSignatureCaptured() {
    this.hasSignatureStroke = true;
    const preview = document.getElementById('sign-preview');
    if (preview) {
      preview.textContent = 'Firma táctil trazada en pantalla (lista para sellar).';
      preview.classList.remove('text-slate-300', 'text-rose-300');
      preview.classList.add('text-emerald-400');
    }
    this.clearFormError('waiver-form-error');
  }

  clearSignaturePad() {
    const canvas = document.getElementById('signature-canvas');
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    this.hasSignatureStroke = false;
    this.isDrawingSignature = false;
    const preview = document.getElementById('sign-preview');
    if (preview) {
      preview.textContent = 'Dibuje la firma con el dedo o puntero dentro del recuadro.';
      preview.classList.remove('text-emerald-400', 'text-rose-300');
      preview.classList.add('text-slate-300');
    }
  }

  bindEvents() {
    window.addEventListener('online', () => this.updateNetworkStatus());
    window.addEventListener('offline', () => this.updateNetworkStatus());

    document.getElementById('btn-dismiss-error')?.addEventListener('click', () => {
      this.hideAppError();
    });

    // Pestañas de navegación + teclado ArrowLeft/ArrowRight
    const tabs = Array.from(document.querySelectorAll('.nav-tab'));
    tabs.forEach((tab, index) => {
      tab.addEventListener('click', (e) => {
        const target = e.currentTarget.getAttribute('data-tab');
        this.switchTab(target);
      });
      tab.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
          e.preventDefault();
          const dir = e.key === 'ArrowRight' ? 1 : -1;
          const nextTab = tabs[(index + dir + tabs.length) % tabs.length];
          nextTab.focus();
          this.switchTab(nextTab.getAttribute('data-tab'));
        }
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

    // Botones y overlays de cierre de modales
    document.querySelectorAll('.btn-close-modal').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.closeAllModals();
      });
    });

    document.querySelectorAll('[role="dialog"]').forEach((dialog) => {
      dialog.addEventListener('click', (e) => {
        if (e.target === dialog) {
          this.closeAllModals();
        }
      });
    });

    document.addEventListener('keydown', (e) => {
      if (!this.activeModalId) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        this.closeAllModals();
        return;
      }
      if (e.key === 'Tab') {
        this.trapFocusInModal(e);
      }
    });

    // Envío de Formularios
    document.getElementById('form-dispatch')?.addEventListener('submit', (e) => this.handleDispatchSubmit(e));
    document.getElementById('form-waiver')?.addEventListener('submit', (e) => this.handleWaiverSubmit(e));
    document.getElementById('form-lab')?.addEventListener('submit', (e) => this.handleLabSubmit(e));
    document.getElementById('form-acopio')?.addEventListener('submit', (e) => this.handleAcopioSubmit(e));

    // Cálculo dinámico de impacto al escribir litros en el modal de agua
    document.getElementById('waiv-liters')?.addEventListener('input', () => this.updateWaiverPreview());
    document.getElementById('waiv-dispatch-select')?.addEventListener('change', () => this.updateWaiverPreview());

    // Purgar Demo mediante modal accesible (reemplaza window.confirm)
    document.getElementById('btn-purge-demo')?.addEventListener('click', () => {
      this.openModal('modal-confirm-purge');
    });
    document.getElementById('btn-banner-purge-demo')?.addEventListener('click', () => {
      this.openModal('modal-confirm-purge');
    });
    document.getElementById('btn-confirm-purge')?.addEventListener('click', () => {
      this.cache.purgeAllData();
      this.closeAllModals();
      this.updateNetworkStatus();
      this.renderActiveTab();
    });

    // Delegación de clics en listas
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
      tab.setAttribute('aria-selected', isCurrent ? 'true' : 'false');
      if (isCurrent) {
        tab.classList.remove(...INACTIVE_TAB_CLASSES);
        tab.classList.add(...ACTIVE_TAB_CLASSES);
      } else {
        tab.classList.remove(...ACTIVE_TAB_CLASSES);
        tab.classList.add(...INACTIVE_TAB_CLASSES);
      }
    });

    this.renderActiveTab();
  }

  renderActiveTab() {
    this.updateDemoBanner();
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

  _demoTag(isDemo) {
    if (!isDemo) return '';
    return '<span class="text-xs px-2 py-0.5 rounded-md ct-badge-warn border font-semibold">[DEMO]</span>';
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
        <div class="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-300 text-xs">
          No hay mixers despachados en este momento. Use "Nuevo Despacho" para iniciar un remito.
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
        // Descargado ya cumplió ciclo en obra
      } else if (evaluation.isExpired) {
        expCount++;
      } else if (evaluation.isWarning) {
        warnCount++;
      } else {
        freshCount++;
      }

      let badgeBg = 'ct-badge-ok';
      let badgeLabel = `Óptimo (${evaluation.remainingMinutes} min rest.)`;

      if (d.status === 'DISCHARGED') {
        badgeBg = 'bg-slate-800 text-slate-200 border-slate-700';
        badgeLabel = 'Descargado en Obra';
      } else if (evaluation.state === HYDRATION_STATES.EXPIRED_BLOCKED) {
        badgeBg = 'ct-badge-danger';
        badgeLabel = 'VENCIDO (>120m)';
      } else if (evaluation.state === HYDRATION_STATES.WORKABILITY_WARNING) {
        badgeBg = 'ct-badge-warn';
        badgeLabel = `ALERTA (${evaluation.remainingMinutes} min)`;
      }

      html += `
        <article class="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
          <div class="flex flex-wrap items-start justify-between gap-2">
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <span class="font-bold text-white text-sm">${Sanitizer.escapeHTML(d.remitoNumber)}</span>
                <span class="text-xs font-mono px-2 py-0.5 rounded-md bg-slate-800 text-slate-200 font-semibold">${Sanitizer.escapeHTML(d.mixerPlate)}</span>
                <span class="text-xs px-2 py-0.5 rounded-md ct-badge-info border font-bold">${Sanitizer.escapeHTML(d.concreteType)}</span>
                ${this._demoTag(Boolean(d.isDemo))}
              </div>
              <p class="text-xs text-slate-300 mt-1">Chofer: <strong class="text-white">${Sanitizer.escapeHTML(d.driverName)}</strong></p>
            </div>
            <span class="text-xs px-2.5 py-1 rounded-md border font-semibold tabular-nums ${badgeBg}">
              ${Sanitizer.escapeHTML(badgeLabel)}
            </span>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs border-t border-slate-800 pt-3 tabular-nums">
            <div>
              <span class="text-slate-400 block">Obra / Destino:</span>
              <span class="font-medium text-slate-100 truncate block">${Sanitizer.escapeHTML(d.siteAddress)}</span>
            </div>
            <div>
              <span class="text-slate-400 block">Volumen:</span>
              <span class="font-medium text-slate-100">${Formatters.formatCubicMeters(d.volumeM3)}${d.pumpService ? ' · Bomba' : ''}</span>
            </div>
            <div>
              <span class="text-slate-400 block">Asentamiento:</span>
              <span class="font-medium text-slate-100">${Formatters.formatSlump(d.slumpCm)}</span>
            </div>
            <div>
              <span class="text-slate-400 block">Carguío en Planta:</span>
              <span class="font-medium text-slate-100">${Formatters.formatDateTime(d.batchTimestamp)}</span>
            </div>
            <div>
              <span class="text-slate-400 block">Tiempo Transcurrido:</span>
              <span class="font-bold ${evaluation.isExpired ? 'text-rose-400' : evaluation.isWarning ? 'text-amber-400' : 'text-emerald-400'}">
                ${evaluation.elapsedMinutes} min (de 120m)
              </span>
            </div>
          </div>

          <div class="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 pt-2">
            <span class="text-xs text-slate-300">${Sanitizer.escapeHTML(d.clientName)}</span>
            ${d.status !== 'DISCHARGED' ? `
              <button type="button" class="touch-target px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-sky-300 border border-slate-700 transition" data-action="discharge" data-remito="${Sanitizer.escapeHTML(d.remitoNumber)}" aria-label="Confirmar descarga de ${Sanitizer.escapeHTML(d.remitoNumber)}">
                Confirmar Descarga
              </button>
            ` : '<span class="text-xs text-slate-300 font-medium">Remito Cerrado</span>'}
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
    const item = dispatches.find((d) => d.remitoNumber === remitoNumber);
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
        <div class="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-300 text-xs">
          No se han registrado actas de adición de agua en obra.
        </div>
      `);
      return;
    }

    let html = '';
    waivers.forEach((w) => {
      html += `
        <article class="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
          <div class="flex flex-wrap items-start justify-between gap-2">
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <span class="font-bold text-white text-sm">${Sanitizer.escapeHTML(w.actaId)}</span>
                <span class="text-xs font-mono px-2 py-0.5 rounded-md bg-slate-800 text-slate-200 border border-slate-700">Remito: ${Sanitizer.escapeHTML(w.remitoNumber)}</span>
                ${this._demoTag(Boolean(w.isDemo))}
              </div>
              <p class="text-xs text-slate-300 mt-1">Obra: <strong class="text-white">${Sanitizer.escapeHTML(w.siteAddress)}</strong> (${Sanitizer.escapeHTML(w.clientName)})</p>
            </div>
            <span class="text-xs px-2.5 py-1 rounded-md border ct-badge-warn font-bold tabular-nums">
              +${Sanitizer.escapeHTML(w.impact.litersAdded)} Lts Agua
            </span>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs border-t border-slate-800 pt-3 tabular-nums">
            <div>
              <span class="text-slate-400 block">Solicitante:</span>
              <span class="font-semibold text-slate-100 block">${Sanitizer.escapeHTML(w.requesterName)}</span>
              <span class="text-xs text-slate-300 block">DNI: ${Sanitizer.escapeHTML(w.requesterDni)}</span>
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

          <div class="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300 pt-2 border-t border-slate-800">
            <span class="font-mono text-emerald-400">Sello SHA-256: ${Sanitizer.escapeHTML(w.cryptoHash.slice(0, 16))}...</span>
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
    if (dispatches.length === 0) {
      Sanitizer.safeSetInnerHTML(select, '<option value="">Sin remitos disponibles (registre un despacho primero)</option>');
      this.updateWaiverPreview();
      return;
    }

    Sanitizer.safeSetInnerHTML(select, dispatches.map((d) => `
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
        <div class="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-300 text-xs">
          No hay ensayos de probetas registrados.
        </div>
      `);
      return;
    }

    let html = '';
    cylinders.forEach((c) => {
      const isApproved = c.result === 'CONFORME_APROBADO';
      const isMarginal = c.result === 'CONDICIONAL_MARGINAL';
      const badgeClass = isApproved
        ? 'ct-badge-ok'
        : isMarginal
          ? 'ct-badge-warn'
          : 'ct-badge-danger';

      const statusText = isApproved
        ? 'CONFORME CIRSOC'
        : isMarginal
          ? 'MARGINAL (90-99%)'
          : 'NO CONFORME';

      html += `
        <article class="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
          <div class="flex flex-wrap items-start justify-between gap-2">
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <span class="font-bold text-white text-sm">${Sanitizer.escapeHTML(c.cylinderId)}</span>
                <span class="text-xs font-mono px-2 py-0.5 rounded-md bg-slate-800 text-sky-300 font-bold">${Sanitizer.escapeHTML(c.nominalType)}</span>
                <span class="text-xs px-2 py-0.5 rounded-md bg-slate-800 text-slate-200 font-medium">${Sanitizer.escapeHTML(c.ageDays)} Días</span>
                ${this._demoTag(Boolean(c.isDemo))}
              </div>
              <p class="text-xs text-slate-300 mt-1">Certificado Oficial: <strong class="text-white">${Sanitizer.escapeHTML(c.certificateId)}</strong></p>
            </div>
            <span class="text-xs px-2.5 py-1 rounded-md border font-bold ${badgeClass}">
              ${statusText}
            </span>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs border-t border-slate-800 pt-3 tabular-nums">
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
              <span class="font-medium text-slate-200">${Sanitizer.escapeHTML(c.nominalType)}</span>
            </div>
            <div>
              <span class="text-slate-400 block">Molde / Norma:</span>
              <span class="text-slate-200">${c.dimensionType === 'STANDARD_15_30' ? '15x30 cm' : '10x20 cm'} (IRAM 1546)</span>
            </div>
          </div>

          <div class="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300 pt-2 border-t border-slate-800">
            <span class="font-mono text-emerald-400">Sello SHA-256: ${Sanitizer.escapeHTML(c.cryptoSeal.slice(0, 16))}...</span>
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
        <div class="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-300 text-xs">
          No hay contratos de acopio registrados.
        </div>
      `);
      return;
    }

    let html = '';
    acopios.forEach((a) => {
      const deliveredPercent = a.totalPurchasedM3 > 0
        ? Math.min(100, Math.round((a.deliveredM3 / a.totalPurchasedM3) * 100))
        : 0;

      html += `
        <article class="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
          <div class="flex flex-wrap items-start justify-between gap-2">
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <span class="font-bold text-white text-sm">${Sanitizer.escapeHTML(a.clientName)}</span>
                <span class="text-xs px-2 py-0.5 rounded-md ct-badge-info border font-bold">${Sanitizer.escapeHTML(a.concreteType)}</span>
                ${this._demoTag(Boolean(a.isDemo))}
              </div>
              <p class="text-xs text-slate-300 mt-1">Obra: <strong class="text-white">${Sanitizer.escapeHTML(a.projectName)}</strong> (Contrato: ${Sanitizer.escapeHTML(a.contractId)})</p>
            </div>
            <span class="text-xs px-2.5 py-1 rounded-md border bg-slate-800 text-slate-200 border-slate-700 font-semibold tabular-nums">
              ${deliveredPercent}% Entregado
            </span>
          </div>

          <div class="space-y-1.5 tabular-nums">
            <div class="flex justify-between text-xs">
              <span class="text-slate-300">Entregado: <strong class="text-white">${Formatters.formatCubicMeters(a.deliveredM3)}</strong></span>
              <span class="text-slate-300">Saldo Restante: <strong class="text-sky-300 font-bold">${Formatters.formatCubicMeters(a.balanceM3)}</strong></span>
            </div>
            <progress class="ct-progress" value="${deliveredPercent}" max="100" aria-label="Porcentaje entregado del contrato ${Sanitizer.escapeHTML(a.contractId)}"></progress>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs border-t border-slate-800 pt-3 tabular-nums">
            <div>
              <span class="text-slate-400 block">Total Acopio:</span>
              <span class="font-bold text-white">${Formatters.formatCubicMeters(a.totalPurchasedM3)}</span>
            </div>
            <div>
              <span class="text-slate-400 block">Precio Congelado / m³:</span>
              <span class="font-medium text-slate-200">${Formatters.formatCurrencyARS(a.unitPriceArs)}</span>
            </div>
            <div>
              <span class="text-slate-400 block">Monto Total Contrato:</span>
              <span class="font-medium text-slate-200">${Formatters.formatCurrencyARS(a.totalContractArs)}</span>
            </div>
          </div>
        </article>
      `;
    });

    Sanitizer.safeSetInnerHTML(listEl, html);
  }

  // --- GESTIÓN DE MODALES Y ACCESIBILIDAD ---
  getFocusableInModal(modal) {
    return Array.from(
      modal.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), canvas[tabindex], [tabindex]:not([tabindex="-1"])')
    ).filter((el) => !el.classList.contains('hidden'));
  }

  trapFocusInModal(e) {
    const modal = document.getElementById(this.activeModalId);
    if (!modal) return;
    const focusables = this.getFocusableInModal(modal);
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    this.lastFocusedElement = document.activeElement;
    this.activeModalId = modalId;
    modal.classList.remove('hidden');

    const focusables = this.getFocusableInModal(modal);
    const firstInput = focusables.find((el) => el.tagName === 'INPUT' || el.tagName === 'SELECT') || focusables[0];
    if (firstInput) {
      firstInput.focus();
    }
  }

  closeAllModals() {
    document.querySelectorAll('[role="dialog"]').forEach((m) => m.classList.add('hidden'));
    ['dispatch-form-error', 'waiver-form-error', 'lab-form-error', 'acopio-form-error'].forEach((id) => this.clearFormError(id));
    this.clearSignaturePad();
    this.activeModalId = null;

    if (this.lastFocusedElement && typeof this.lastFocusedElement.focus === 'function') {
      this.lastFocusedElement.focus();
      this.lastFocusedElement = null;
    }
  }

  showFormError(elementId, message) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.textContent = String(message);
    el.classList.remove('hidden');
  }

  clearFormError(elementId) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.textContent = '';
    el.classList.add('hidden');
  }

  setSubmittingState(buttonId, isSubmitting, loadingText, defaultText) {
    const btn = document.getElementById(buttonId);
    if (!btn) return;
    btn.disabled = isSubmitting;
    btn.textContent = isSubmitting ? loadingText : defaultText;
  }

  handleDispatchSubmit(e) {
    e.preventDefault();
    this.clearFormError('dispatch-form-error');
    this.setSubmittingState('btn-submit-dispatch', true, 'Guardando...', 'Despachar Mixer');

    try {
      const remito = document.getElementById('disp-remito').value.trim();
      const plate = document.getElementById('disp-plate').value.trim().toUpperCase();
      const driver = document.getElementById('disp-driver').value.trim();
      const client = document.getElementById('disp-client').value.trim();
      const site = document.getElementById('disp-site').value.trim();
      const type = document.getElementById('disp-type').value;
      const vol = Number(document.getElementById('disp-volume').value);
      const slump = Number(document.getElementById('disp-slump').value);
      const pump = document.getElementById('disp-pump').checked;

      if (!remito || !plate || !driver || !client || !site || !Number.isFinite(vol) || vol <= 0) {
        throw new Error('Complete todos los campos obligatorios con un volumen válido mayor a 0 m³.');
      }

      const newDispatch = {
        remitoNumber: remito,
        mixerPlate: plate,
        driverName: driver,
        clientName: client,
        siteAddress: site,
        concreteType: type,
        volumeM3: vol,
        slumpCm: Number.isFinite(slump) ? slump : 10,
        pumpService: pump,
        batchTimestamp: new Date().toISOString(),
        status: 'IN_TRANSIT',
        isDemo: false
      };

      const dispatches = this.cache.getDispatches(INITIAL_DEMO_DATA.dispatches);
      dispatches.unshift(newDispatch);
      this.cache.saveDispatches(dispatches);
      this.cache.pushOutbox({ type: 'DISPATCH_CREATED', data: newDispatch });

      this.updateNetworkStatus();
      this.closeAllModals();
      e.target.reset();
      this.renderDispatches();
    } catch (err) {
      this.showFormError('dispatch-form-error', err?.message || 'No se pudo registrar el despacho.');
    } finally {
      this.setSubmittingState('btn-submit-dispatch', false, 'Guardando...', 'Despachar Mixer');
    }
  }

  async handleWaiverSubmit(e) {
    e.preventDefault();
    this.clearFormError('waiver-form-error');

    const select = document.getElementById('waiv-dispatch-select');
    const opt = select.selectedOptions[0];
    const remito = select.value;
    const litersAdded = Number(document.getElementById('waiv-liters').value) || 0;
    const reqName = document.getElementById('waiv-req-name').value.trim();
    const reqDni = document.getElementById('waiv-req-dni').value.trim();

    if (!remito) {
      this.showFormError('waiver-form-error', 'Debe existir al menos un remito despachado para emitir el acta.');
      return;
    }

    if (!this.hasSignatureStroke) {
      this.showFormError('waiver-form-error', 'Dibuje la firma del solicitante dentro del recuadro táctil antes de emitir el acta.');
      const canvas = document.getElementById('signature-canvas');
      if (canvas) canvas.focus();
      return;
    }

    this.setSubmittingState('btn-submit-waiver', true, 'Sellando SHA-256...', 'Emitir Acta SHA-256');
    try {
      const canvas = document.getElementById('signature-canvas');
      const signatureData = canvas ? canvas.toDataURL('image/png') : '';

      const impact = WaterAdditionWaiverEngine.calculateWaterImpact({
        concreteType: opt?.getAttribute('data-type') || 'H-25',
        volumeM3: Number(opt?.getAttribute('data-vol')) || 8,
        litersAdded
      });

      const waiver = await WaterAdditionWaiverEngine.createWaiverActa({
        remitoNumber: remito,
        mixerPlate: opt?.getAttribute('data-plate') || 'AE 000 XX',
        driverName: opt?.getAttribute('data-driver') || 'Chofer',
        clientName: opt?.getAttribute('data-client') || 'Cliente',
        siteAddress: opt?.getAttribute('data-site') || 'Obra',
        requesterName: reqName,
        requesterDni: reqDni,
        signatureData,
        impact
      });
      waiver.isDemo = false;

      const waivers = this.cache.getWaivers(INITIAL_DEMO_DATA.waivers);
      waivers.unshift(waiver);
      this.cache.saveWaivers(waivers);
      this.cache.pushOutbox({ type: 'WAIVER_CREATED', data: waiver });

      this.updateNetworkStatus();
      this.closeAllModals();
      e.target.reset();
      this.switchTab('water');
    } catch (err) {
      this.showFormError('waiver-form-error', err?.message || 'Error al generar el acta con sello SHA-256.');
    } finally {
      this.setSubmittingState('btn-submit-waiver', false, 'Sellando SHA-256...', 'Emitir Acta SHA-256');
    }
  }

  async handleLabSubmit(e) {
    e.preventDefault();
    this.clearFormError('lab-form-error');
    this.setSubmittingState('btn-submit-lab', true, 'Certificando...', 'Certificar Ensayo');

    try {
      const id = document.getElementById('lab-cylinder-id').value.trim();
      const nominal = document.getElementById('lab-nominal-type').value;
      const age = Number(document.getElementById('lab-age').value) || 28;
      const dim = document.getElementById('lab-dim').value;
      const forceKn = Number(document.getElementById('lab-force-kn').value);

      if (!id || !Number.isFinite(forceKn) || forceKn <= 0) {
        throw new Error('Ingrese un identificador de probeta y una fuerza de prensa mayor a 0 kN.');
      }

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
      report.isDemo = false;

      const cylinders = this.cache.getCylinders(INITIAL_DEMO_DATA.cylinders);
      cylinders.unshift(report);
      this.cache.saveCylinders(cylinders);
      this.cache.pushOutbox({ type: 'CYLINDER_TEST_LOGGED', data: report });

      this.updateNetworkStatus();
      this.closeAllModals();
      e.target.reset();
      this.switchTab('lab');
    } catch (err) {
      this.showFormError('lab-form-error', err?.message || 'Error al certificar el ensayo de probeta.');
    } finally {
      this.setSubmittingState('btn-submit-lab', false, 'Certificando...', 'Certificar Ensayo');
    }
  }

  handleAcopioSubmit(e) {
    e.preventDefault();
    this.clearFormError('acopio-form-error');
    this.setSubmittingState('btn-submit-acopio', true, 'Guardando...', 'Abrir Acopio');

    try {
      const client = document.getElementById('acop-client').value.trim();
      const project = document.getElementById('acop-project').value.trim();
      const type = document.getElementById('acop-type').value;
      const vol = Number(document.getElementById('acop-volume').value);
      const price = Number(document.getElementById('acop-price').value);

      if (!client || !project || !Number.isFinite(vol) || vol <= 0 || !Number.isFinite(price) || price <= 0) {
        throw new Error('Complete cliente, obra, volumen y precio unitario mayores a cero.');
      }

      const contract = AcopioCubicMeterLedgerService.createAcopioContract({
        clientName: client,
        projectName: project,
        concreteType: type,
        totalPurchasedM3: vol,
        unitPriceArs: price
      });
      contract.isDemo = false;

      const acopios = this.cache.getAcopios(INITIAL_DEMO_DATA.acopios);
      acopios.unshift(contract);
      this.cache.saveAcopios(acopios);
      this.cache.pushOutbox({ type: 'ACOPIO_CREATED', data: contract });

      this.updateNetworkStatus();
      this.closeAllModals();
      e.target.reset();
      this.switchTab('acopios');
    } catch (err) {
      this.showFormError('acopio-form-error', err?.message || 'No se pudo abrir el contrato de acopio.');
    } finally {
      this.setSubmittingState('btn-submit-acopio', false, 'Guardando...', 'Abrir Acopio');
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.concreteTrackApp = new ConcreteTrackApp();
});
