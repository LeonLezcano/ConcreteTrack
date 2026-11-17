# 🚛 ConcreteTrack Argentina — Gestión de Hormigón Elaborado, Mixers & CIRSOC 201

> **Plataforma Integral de Planta Dosificadora, Reloj de Fraguado (120m), Deslinde de Agua en Obra y Certificación de Ensayos de Probetas CIRSOC 201 / IRAM 1666.**

---

## 🌟 Visión del Producto

En la industria del hormigón elaborado argentino, las plantas dosificadoras enfrentan tres desafíos críticos de rentabilidad y responsabilidad legal:
1. **Pérdida de pastones por fraguado en tránsito:** El hormigón fresco tiene un límite reglamentario estricto de **120 minutos** (IRAM 1666 / CIRSOC 201) desde el contacto cemento-agua hasta la descarga completa. Exceder este plazo arriesga fraguado en trompo o rechazo total en obra.
2. **Litigios por agua agregada en obra:** Cuando los directores de obra o capataces exigen agregar agua en obra para facilitar la trabajabilidad del pastón, alteran drásticamente la relación agua/cemento ($a/c$), reduciendo la resistencia a la compresión (~2.0 MPa por cada 10 L/m³ adicionados). Si la probeta falla a los 28 días, la constructora suele culpar a la planta hormigonera si no existe un **acta legal de deslinde firmada con sello criptográfico**.
3. **Control volumétrico de acopios y falso flete:** La administración de contratos de acopio en metros cúbicos ($m^3$) suele desincronizarse con los remitos de campo, perdiendo el cobro de adicionales por servicio de bomba, estadías punitorias por demoras en descarga (>45 min) o viajes en falso por camión incompleto (<5 $m^3$).

**ConcreteTrack** resuelve estos tres frentes en una solución Mobile-First, PWA y 100% Offline-First diseñada para jefes de planta, despachantes, choferes de motohormigonero y directores técnicos de laboratorio.

---

## 🏗️ Arquitectura Técnica y Motores de Negocio

ConcreteTrack incorpora 4 motores especializados alineados con el Catálogo Oficial de Motores AiAppFactory:

### 1. ⏱️ Batch Hydration Window Engine (Motor #307)
- **Monitoreo de Fraguado en Vivo:** Reloj regresivo basado en el timestamp de dosificación en planta.
  - **0 a 89 min:** Estado Óptimo (`FRESH_OPTIMAL` - Verde).
  - **90 a 119 min:** Alerta de Trabajabilidad (`WORKABILITY_WARNING` - Amarillo).
  - **≥ 120 min:** Rechazo Reglamentario (`EXPIRED_BLOCKED` - Rojo CIRSOC 201).
- **Estadía Punitoria en Obra (Demurrage):** Franquicia de descarga gratuita de 45 minutos. Minutos en exceso se liquidan automáticamente a la tarifa comercial pactada.
- **Control de Revoluciones de Tambor:** Alerta preventiva cuando el odómetro del mixer supera las 300 vueltas máximas fijadas por la norma IRAM 1666 para evitar desgaste de árido y sobre-amasado.

### 2. 💧 Water Addition Waiver Engine (Motores #274 & #245)
- **Cálculo de Pérdida de Resistencia ($f'c$):** Modela el incremento de la relación agua/cemento ($a/c$) según la dosificación nominal (H-17 a H-40) y proyecta la pérdida de resistencia en MPa según la regla CIRSOC (~2.0 MPa por cada 10 L/m³ extra).
- **Emisión de Acta Digital de Deslinde:** Genera un documento con firma digital del solicitante en obra (Director Técnico o Capataz), liberando a la planta hormigonera de la garantía estructural conforme al Reglamento CIRSOC 201.
- **Sello Criptográfico Inmutable:** Hash determinista SHA-256 generado en el cliente mediante Web Crypto API.

### 3. 🔬 Cylinder Compression Lab Engine (Motores #309 & #159)
- **Control de Asentamiento:** Clasificación del ensayo de Cono de Abrams (IRAM 1536) en consistente Seco (0-2 cm), Plástico (3-8 cm), Blando (9-15 cm) y Fluido (16-22 cm), evaluando aptitud de bombeo.
- **Ensayos de Rotura de Probetas:** Soporte para probetas estándar de 15x30 cm ($A = 17671.5\text{ mm}^2$) y reducidas de 10x20 cm ($A = 7854\text{ mm}^2$).
- **Dictamen de Conformidad CIRSOC 201:**
  - **7 Días:** Evaluación de madurez temprana (esperado $\ge 70\%$ del valor de diseño).
  - **28 Días:** Dictamen oficial Aprobado, Marginal Condicional (90-99%) o No Conforme (<90%).
- **Certificado Criptográfico Oficial:** Acta de rotura firmada con SHA-256 exportable para peritajes estructurales.

### 4. 📦 Acopio Cubic Meter Ledger Service (Motor #161)
- **Cuenta Corriente Volumétrica:** Contratos con precio congelado por $m^3$, consumo contra remito despachado y saldo remanente en tiempo real.
- **Liquidación Automática de Adicionales:**
  - Cobro por Falso Flete / Vacío de mixer cuando la carga solicitada es inferior al mínimo operativo (5 $m^3$).
  - Servicio de bomba pluma o arrastre.
  - Cargos por demoras de descarga en obra.

---

## 🛡️ Blindaje de Seguridad (AiAppFactory Standard)

- **Zero-Sink DOM Armor:** Renderizado exclusivo mediante `DOMParser`, `replaceChildren` y sanitización contextual de atributos. Cero asignaciones directas a `innerHTML` o sinks de script injection.
- **CSP Cualitativa Estricta en `firebase.json`:**
  - Sin `'unsafe-eval'`.
  - Sin comodines `*` en `script-src` ni `default-src`.
  - Sin orígenes no cifrados `http://`.
  - Cabeceras `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Strict-Transport-Security` y `Referrer-Policy`.
- **Reglas Zero-Trust en `firestore.rules`:** Validación obligatoria de autenticación, aislamiento por propietario (`request.auth.uid == resource.data.createdBy`) y protección de inmutabilidad contra transferencia de autoría (`request.resource.data.createdBy == resource.data.createdBy`).
- **Auditoría AppSec Guardian:** **100/100** (0 Críticas, 0 Altas, 0 Medias, 0 Bajas).

---

## 🧪 Arnés de Pruebas Multi-Capa (55 Tests)

Batería completa automatizada en 5 capas:

```bash
pnpm test
```

| Capa | Nombre | Cantidad | Descripción |
| :--- | :--- | :---: | :--- |
| **Capa 1** | Unitarias & Fuzzing Caótico | 26 | Matemáticas de hidratación CIRSOC, sobrestadía, revoluciones mixer, relación a/c, rotura en prensa 15x30 y 10x20, y tolerancia cono Abrams. |
| **Capa 2** | Integración & Persistencia Offline | 11 | Descuento en acopio, Outbox FIFO local, reporte explícito de errores de cuota/JSON corrupto y centinela anti-siembras fantasma tras purga (`concretetrack_demo_purged`). |
| **Capa 3** | Componentes & Neutralización DOM | 6 | Sinks de Sanitizer, escape de etiquetas, filtrado de esquemas maliciosos (`javascript:`, `data:`), formateadores de $m^3$, MPa y ARS. |
| **Capa 4** | Seguridad Cualitativa & Reglas | 6 | Validación estricta de cabeceras en `firebase.json`, reglas de Firestore, escaneo de secretos, CSS compilado local, `manifest.json` y versión semántica `vX.Y.ZZ`. |
| **Capa 5** | Flujo E2E Ciclo de Vida | 6 | Ciclo completo: Contrato de Acopio $\to$ Despacho Mixer $\to$ Tránsito $\to$ Acta de Agua $\to$ Cono Abrams $\to$ Rotura a 28 días con sello SHA-256. |

**Total:** 55 tests | 55 aprobados (100% PASS).

---

## 📱 Operatividad Callejera, Accesibilidad y Offline-First

- **Mobile-First Touch Target:** Botones, selectores y acciones de cabina con áreas táctiles $\ge 44\text{px}$ ($\ge 48\text{px}$ en controles de cabina y envío de formularios), grids responsivos colapsables (`grid-cols-1 sm:grid-cols-...`) y zoom habilitado.
- **Screen Wake Lock API:** Modo Cabina integrado (`navigator.wakeLock.request('screen')`) con re-enganche al volver desde mapas.
- **Firma Táctil en Canvas:** Captura real de firma en `<canvas>` HTML5 (`pointerdown`/`pointermove`/`pointerup`) con exportación PNG en cliente antes de sellar el acta SHA-256.
- **Accesibilidad Teclado & Lector de Pantalla:** Navegación por pestañas con `role="tablist"`/`role="tab"`/`aria-selected`, anillos `:focus-visible`, etiquetas `<label for="...">` vinculadas, modales con cierre por `Escape`/clic externo y trampa de foco, y confirmación accesible sin `window.alert`/`window.confirm`.
- **PWA y CSS Local (CSP Estricta):** Tailwind CSS precompilado localmente (`styles.css`), `manifest.json` y `sw.js` con estrategia *Network-First* para HTML/`version.json` y *Cache-First* para assets estáticos, sin dependencias externas en runtime ni `'unsafe-inline'`.
- **Transparencia de Estado Local:** Los datos semilla iniciales se identifican con `[DEMO]` hasta su purga, el indicador de red refleja `navigator.onLine` y la cola local FIFO (`outbox`), y las fallas de almacenamiento local se informan en pantalla.
- **Sistema de Diseño:** Documentado en [DESIGN.md](./DESIGN.md).

---

## 🚀 Instalación y Ejecución

```bash
# Instalar dependencias
pnpm install

# Ejecutar batería de pruebas (5 capas, 54 tests)
pnpm test

# Ejecutar auditor de seguridad
pnpm run test:security

# Incrementar versión semántica
pnpm run version:bump
```

---

## 📄 Normativa Técnica de Referencia

- **CIRSOC 201:** Reglamento Argentino de Estructuras de Hormigón.
- **IRAM 1666:** Hormigón elaborado — Preparación, transporte y entrega.
- **IRAM 1524:** Hormigón — Preparación y curado en obra de probetas para ensayos de compresión y tracción.
- **IRAM 1536:** Hormigón fresco — Método de ensayo de la consistencia utilizando el tronco de cono (Cono de Abrams).
- **IRAM 1546:** Hormigón — Método de ensayo de compresión de probetas cilíndricas.

---
*Desarrollado bajo el Estándar de Excelencia AiAppFactory — LeonLezcano.*
