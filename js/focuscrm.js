/**
 * FocusCRM — bundle (generado con merge-focuscrm.sh tras editar storage.js o app.js).
 * Secciones: persistencia · UI.
 */

/**
 * FocusCRM — persistencia LocalStorage (capa de datos).
 * Sin dependencias; compatible con apertura directa de index.html (file://).
 */

const LEGACY_STORAGE_KEY = 'focuscrm_leads_v1';
const STORAGE_KEY = 'focuscrm_leads_mvp';

function generateId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function normalizeLead(raw) {
  if (!raw || typeof raw !== 'object') return null;
  return {
    id: String(raw.id || generateId()),
    nombre: String(raw.nombre || '').trim(),
    dni: String(raw.dni || '').trim(),
    telefono: String(raw.telefono || '').trim(),
    correo: String(raw.correo || '').trim(),
    canalIngreso: raw.canalIngreso === 'virtual' ? 'virtual' : 'presencial',
    interes: ['bajo', 'medio', 'alto'].includes(raw.interes) ? raw.interes : 'medio',
    proximaLlamada: String(raw.proximaLlamada || '').slice(0, 10),
    enFicha: Boolean(raw.enFicha),
    producto: raw.producto != null ? String(raw.producto) : '',
    precio: raw.precio != null ? String(raw.precio) : '',
    fechaPago: String(raw.fechaPago || '').slice(0, 10),
    descalificado: Boolean(raw.descalificado),
  };
}

function defaultLead(partial = {}) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const ymd = tomorrow.toISOString().slice(0, 10);
  return normalizeLead({
    id: generateId(),
    nombre: '',
    dni: '',
    telefono: '',
    correo: '',
    canalIngreso: 'presencial',
    interes: 'medio',
    proximaLlamada: ymd,
    enFicha: false,
    producto: '',
    precio: '',
    fechaPago: '',
    descalificado: false,
    ...partial,
  });
}

class LeadManager {
  constructor(storageKey = STORAGE_KEY) {
    this.storageKey = storageKey;
    this._migrateLegacyIfNeeded();
  }

  _migrateLegacyIfNeeded() {
    try {
      if (localStorage.getItem(this.storageKey)) return;
      const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacy) {
        localStorage.setItem(this.storageKey, legacy);
      }
    } catch {
      /* ignore */
    }
  }

  getAll() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.map((x) => normalizeLead(x)).filter(Boolean);
    } catch {
      return [];
    }
  }

  getById(id) {
    return this.getAll().find((l) => l.id === id) || null;
  }

  create(data) {
    const lead = defaultLead(data);
    const all = this.getAll();
    all.push(lead);
    this._save(all);
    return lead;
  }

  update(id, patch) {
    const all = this.getAll();
    const idx = all.findIndex((l) => l.id === id);
    if (idx === -1) return null;
    const merged = normalizeLead({ ...all[idx], ...patch, id });
    all[idx] = merged;
    this._save(all);
    return merged;
  }

  delete(id) {
    const all = this.getAll();
    const next = all.filter((l) => l.id !== id);
    if (next.length === all.length) return false;
    this._save(next);
    return true;
  }

  /** Leads activos (no descalificados) — dashboard principal */
  getActivos() {
    return this.getAll().filter((l) => !l.descalificado);
  }

  /** Descalificados reservados para promociones futuras */
  getPromociones() {
    return this.getAll().filter((l) => l.descalificado);
  }

  /** Acción automática: pasa a lista Promociones */
  descalificar(id) {
    return this.update(id, { descalificado: true });
  }

  reactivar(id) {
    return this.update(id, { descalificado: false });
  }

  _save(leads) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(leads));
    } catch (e) {
      console.error('LeadManager: no se pudo guardar', e);
    }
  }

  seedIfEmpty() {
    if (this.getAll().length > 0) return;
    const today = new Date();
    const ymd = (d) => d.toISOString().slice(0, 10);
    const d0 = new Date(today);
    const d2 = new Date(today);
    d2.setDate(d2.getDate() + 2);
    const d5 = new Date(today);
    d5.setDate(d5.getDate() + 5);

    [
      defaultLead({
        nombre: 'María Quispe',
        dni: '40123456',
        telefono: '+51999888777',
        correo: 'maria@email.com',
        interes: 'alto',
        proximaLlamada: ymd(d0),
        enFicha: true,
        producto: 'Maestría en Gestión',
        precio: 'S/ 12,500',
        fechaPago: ymd(d5),
      }),
      defaultLead({
        nombre: 'Carlos Ríos',
        dni: '40987654',
        telefono: '+51988777666',
        correo: 'c.rios@email.com',
        interes: 'medio',
        proximaLlamada: ymd(d2),
        enFicha: false,
      }),
      defaultLead({
        nombre: 'Ana Vega',
        dni: '41234567',
        telefono: '+51977666555',
        correo: 'ana.v@email.com',
        interes: 'bajo',
        proximaLlamada: ymd(d5),
        enFicha: false,
      }),
    ].forEach((l) => this.create(l));
  }
}

window.FocusCRM = window.FocusCRM || {};
window.FocusCRM.LeadManager = LeadManager;

/* ----- UI ----- */
const manager = new LeadManager();

let currentTab = 'activos';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

function parseYMD(s) {
  if (!s) return null;
  const parts = String(s).split('-');
  if (parts.length !== 3) return null;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);
  return new Date(y, m, d);
}

function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function daysFromTodayTo(targetYmd) {
  const today = startOfDay(new Date());
  const callDay = targetYmd ? startOfDay(parseYMD(targetYmd)) : null;
  if (!callDay || Number.isNaN(callDay.getTime())) return null;
  const a = today.getTime();
  const b = callDay.getTime();
  return Math.round((b - a) / 86400000);
}

/** Alertas: hoy → verde; 2–3 días → amarillo; resto → azul claro */
function badgeSeguimiento(proximaLlamadaYmd) {
  const diff = daysFromTodayTo(proximaLlamadaYmd);
  if (diff === null) {
    return {
      text: '—',
      className:
        'bg-notion-200 dark:bg-notion-600 text-notion-700 dark:text-notion-200',
    };
  }
  if (diff <= 0) {
    return {
      text: 'Llamar Ahora',
      className:
        'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 font-semibold',
    };
  }
  if (diff >= 2 && diff <= 3) {
    return {
      text: 'Próxima',
      className:
        'bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200',
    };
  }
  return {
    text: 'Futuro',
    className:
      'bg-sky-100 dark:bg-sky-900/40 text-sky-800 dark:text-sky-200',
  };
}

function badgeInteres(interes) {
  const map = {
    bajo: {
      text: 'Bajo',
      className:
        'bg-notion-200 text-notion-700 dark:bg-notion-600 dark:text-notion-100',
    },
    medio: {
      text: 'Medio',
      className:
        'bg-orange-100 text-orange-900 dark:bg-orange-900/50 dark:text-orange-200',
    },
    alto: {
      text: 'Alto',
      className:
        'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-200',
    },
  };
  return map[interes] || map.bajo;
}

function escapeHtml(s) {
  if (s == null) return '';
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function escapeAttr(s) {
  return escapeHtml(s).replace(/"/g, '&quot;');
}

function formatDateDisplay(ymd) {
  if (!ymd) return '—';
  const d = parseYMD(ymd);
  if (!d || Number.isNaN(d.getTime())) return ymd;
  return d.toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' });
}

function rowClassName(lead) {
  if (lead.enFicha) {
    return 'focuscrm-row--ficha transition-colors border-b border-notion-100 dark:border-notion-700/80';
  }
  return 'border-b border-notion-100 dark:border-notion-700/80 hover:bg-notion-50/80 dark:hover:bg-notion-900/40 transition-colors';
}

function fichaCellHtml(lead) {
  const checked = lead.enFicha ? 'checked' : '';
  return `
    <label class="inline-flex items-center gap-2 cursor-pointer select-none">
      <input type="checkbox" data-action="toggle-ficha" data-id="${escapeAttr(lead.id)}" ${checked}
        class="rounded border-notion-300 text-[#3b82f6] focus:ring-[#3b82f6]" />
      <span class="text-xs ${lead.enFicha ? 'text-[#3b82f6] font-semibold' : 'text-notion-500'}">En ficha</span>
    </label>
    ${lead.enFicha ? `<div class="mt-2 space-y-1 text-xs">
      <div><span class="text-notion-500">Producto:</span>
        <input data-action="ficha-field" data-field="producto" data-id="${escapeAttr(lead.id)}"
          class="ml-1 w-36 max-w-[90vw] rounded border border-notion-200 dark:border-notion-600 bg-white/80 dark:bg-notion-900 px-1.5 py-0.5"
          value="${escapeAttr(lead.producto || '')}" placeholder="Programa" /></div>
      <div><span class="text-notion-500">Precio:</span>
        <input data-action="ficha-field" data-field="precio" data-id="${escapeAttr(lead.id)}" type="text"
          class="ml-1 w-28 rounded border border-notion-200 dark:border-notion-600 bg-white/80 dark:bg-notion-900 px-1.5 py-0.5"
          value="${escapeAttr(lead.precio || '')}" placeholder="S/" /></div>
      <div><span class="text-notion-500">Fecha de pago:</span>
        <input data-action="ficha-field" data-field="fechaPago" data-id="${escapeAttr(lead.id)}" type="date"
          class="ml-1 rounded border border-notion-200 dark:border-notion-600 bg-white/80 dark:bg-notion-900 px-1.5 py-0.5"
          value="${escapeAttr(lead.fechaPago || '')}" /></div>
    </div>` : ''}`;
}

function actionsHtml(lead) {
  if (currentTab === 'activos') {
    return `<div class="flex flex-wrap justify-end gap-1">
      <button type="button" data-action="edit" data-id="${escapeAttr(lead.id)}"
        class="rounded-lg border border-notion-200 dark:border-notion-600 px-2 py-1 text-xs font-medium hover:bg-notion-100 dark:hover:bg-notion-700">Editar</button>
      <button type="button" data-action="disq" data-id="${escapeAttr(lead.id)}"
        class="rounded-lg border border-red-200 text-red-700 dark:border-red-800 dark:text-red-400 px-2 py-1 text-xs font-medium hover:bg-red-50 dark:hover:bg-red-950/30">Descalificar</button>
    </div>`;
  }
  return `<div class="flex flex-wrap justify-end gap-1">
    <span class="text-xs text-notion-500 px-2 py-1">Reservado para promos</span>
    <button type="button" data-action="restore" data-id="${escapeAttr(lead.id)}"
      class="rounded-lg border border-notion-200 dark:border-notion-600 px-2 py-1 text-xs font-medium hover:bg-notion-100 dark:hover:bg-notion-700">Reactivar</button>
  </div>`;
}

function renderTable() {
  const tbody = $('#tbodyLeads');
  const empty = $('#emptyState');
  const list =
    currentTab === 'promociones' ? manager.getPromociones() : manager.getActivos();

  tbody.innerHTML = '';

  if (list.length === 0) {
    empty.classList.remove('hidden');
    refreshIcons();
    return;
  }
  empty.classList.add('hidden');

  list.forEach((lead) => {
    const tr = document.createElement('tr');
    tr.className = rowClassName(lead);

    const ib = badgeInteres(lead.interes);
    const seg = badgeSeguimiento(lead.proximaLlamada);
    const canalLabel = lead.canalIngreso === 'virtual' ? 'Virtual' : 'Presencial';

    const interSelect =
      currentTab === 'activos'
        ? `<select data-action="interes" data-id="${escapeAttr(lead.id)}"
            class="mt-1 rounded-lg border border-notion-200 dark:border-notion-600 bg-white dark:bg-notion-900 px-2 py-1 text-xs w-full max-w-[9rem]">
          <option value="bajo" ${lead.interes === 'bajo' ? 'selected' : ''}>Bajo</option>
          <option value="medio" ${lead.interes === 'medio' ? 'selected' : ''}>Medio</option>
          <option value="alto" ${lead.interes === 'alto' ? 'selected' : ''}>Alto</option>
        </select>`
        : `<span class="inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${ib.className}">${ib.text}</span>`;

    const proxInput =
      currentTab === 'activos'
        ? `<input type="date" data-action="proxima" data-id="${escapeAttr(lead.id)}"
          class="mt-1 rounded-lg border border-notion-200 dark:border-notion-600 bg-white dark:bg-notion-900 px-2 py-1 text-xs w-full max-w-[11rem]"
          value="${escapeAttr(lead.proximaLlamada || '')}" />`
        : `<span class="text-notion-500 text-xs">${formatDateDisplay(lead.proximaLlamada)}</span>`;

    tr.innerHTML = `
      <td class="px-4 py-3 align-top">
        <div class="font-medium">${escapeHtml(lead.nombre)}</div>
        <div class="text-xs text-notion-500">DNI ${escapeHtml(lead.dni)}</div>
      </td>
      <td class="px-4 py-3 align-top">
        <div class="flex items-center gap-1 text-xs"><i data-lucide="phone" class="h-3 w-3 shrink-0 text-notion-400"></i> ${escapeHtml(lead.telefono)}</div>
        <div class="flex items-center gap-1 text-xs mt-0.5"><i data-lucide="mail" class="h-3 w-3 shrink-0 text-notion-400"></i> ${escapeHtml(lead.correo)}</div>
      </td>
      <td class="px-4 py-3 align-top"><span class="inline-flex rounded-full bg-notion-100 dark:bg-notion-700 px-2 py-0.5 text-xs">${canalLabel}</span></td>
      <td class="px-4 py-3 align-top">
        <span class="inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${ib.className}">${ib.text}</span>
        ${interSelect}
      </td>
      <td class="px-4 py-3 align-top"><span class="inline-flex px-2 py-1 rounded-lg text-xs ${seg.className}">${seg.text}</span></td>
      <td class="px-4 py-3 align-top">${proxInput}</td>
      <td class="px-4 py-3 align-top min-w-[12rem]">${fichaCellHtml(lead)}</td>
      <td class="px-4 py-3 align-top text-right">${actionsHtml(lead)}</td>
    `;
    tbody.appendChild(tr);
  });

  refreshIcons();
}

function updateMetrics() {
  const all = manager.getAll();
  const activos = manager.getActivos();
  const promos = manager.getPromociones();
  const enFicha = activos.filter((l) => l.enFicha).length;

  const elAct = $('#metricActivos');
  const elProm = $('#metricPromociones');
  const elFicha = $('#metricEnFicha');
  const elTotal = $('#metricTotal');
  if (elAct) elAct.textContent = String(activos.length);
  if (elProm) elProm.textContent = String(promos.length);
  if (elFicha) elFicha.textContent = String(enFicha);
  if (elTotal) elTotal.textContent = String(all.length);
}

function syncAndRender() {
  updateMetrics();
  renderTable();
}

function refreshIcons() {
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function applyTheme(dark) {
  const html = document.documentElement;
  if (dark) html.classList.add('dark');
  else html.classList.remove('dark');

  const tl = $('#themeLabel');
  if (tl) tl.textContent = dark ? 'Claro' : 'Oscuro';

  try {
    localStorage.setItem('focuscrm_theme', dark ? 'dark' : 'light');
  } catch {
    /* ignore */
  }
  refreshIcons();
}

function initTheme() {
  const saved = localStorage.getItem('focuscrm_theme');
  const prefers = window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(saved === 'dark' || (!saved && prefers));
}

function openModal(lead) {
  const backdrop = $('#modalBackdrop');
  if (!backdrop) return;
  backdrop.setAttribute('aria-hidden', 'false');
  backdrop.classList.remove('hidden');
  backdrop.classList.add('flex');
  const title = $('#modalTitle');
  if (title) title.textContent = lead ? 'Editar lead' : 'Nuevo lead';
  $('#editId').value = lead ? lead.id : '';
  $('#fNombre').value = lead ? lead.nombre : '';
  $('#fDni').value = lead ? lead.dni : '';
  $('#fTel').value = lead ? lead.telefono : '';
  $('#fCorreo').value = lead ? lead.correo : '';
  $('#fCanal').value = lead ? lead.canalIngreso : 'presencial';
  $('#fInteres').value = lead ? lead.interes : 'medio';
  if (lead && lead.proximaLlamada) {
    $('#fProxLlamada').value = lead.proximaLlamada;
  } else {
    const t = new Date();
    t.setDate(t.getDate() + 1);
    $('#fProxLlamada').value = t.toISOString().slice(0, 10);
  }
  refreshIcons();
}

function closeModal() {
  const backdrop = $('#modalBackdrop');
  if (!backdrop) return;
  backdrop.setAttribute('aria-hidden', 'true');
  backdrop.classList.add('hidden');
  backdrop.classList.remove('flex');
}

function findLead(id) {
  return manager.getById(id);
}

function bindTabs() {
  $$('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      currentTab = btn.getAttribute('data-tab');
      $$('.tab-btn').forEach((b) => {
        const active = b.getAttribute('data-tab') === currentTab;
        b.className =
          'tab-btn rounded-lg px-4 py-2 text-sm font-medium ' +
          (active
            ? 'bg-[#3b82f6] text-white'
            : 'bg-white dark:bg-notion-800 border border-notion-200 dark:border-notion-600 text-notion-700 dark:text-notion-200 hover:bg-notion-50 dark:hover:bg-notion-700');
      });
      renderTable();
    });
  });
}

function bindTableDelegation() {
  const tbody = $('#tbodyLeads');
  if (!tbody) return;

  tbody.addEventListener('change', (e) => {
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;
    const id = t.getAttribute('data-id');
    if (!id) return;
    const lead = findLead(id);
    if (!lead) return;

    if (t.matches('[data-action="interes"]') && t instanceof HTMLSelectElement) {
      manager.update(id, { interes: t.value });
      syncAndRender();
    }
    if (t.matches('[data-action="proxima"]') && t instanceof HTMLInputElement) {
      manager.update(id, { proximaLlamada: t.value });
      syncAndRender();
    }
    if (t.matches('[data-action="toggle-ficha"]') && t instanceof HTMLInputElement) {
      const enFicha = t.checked;
      manager.update(id, {
        enFicha,
        ...(enFicha
          ? {}
          : { producto: '', precio: '', fechaPago: '' }),
      });
      syncAndRender();
    }
    if (t.matches('[data-action="ficha-field"]') && t instanceof HTMLInputElement) {
      const field = t.getAttribute('data-field');
      if (field === 'producto' || field === 'precio' || field === 'fechaPago') {
        manager.update(id, { [field]: t.value });
      }
    }
  });

  tbody.addEventListener('click', (e) => {
    const btn = e.target instanceof Element ? e.target.closest('[data-action]') : null;
    if (!btn || btn.matches('input')) return;
    const action = btn.getAttribute('data-action');
    const id = btn.getAttribute('data-id');
    if (!id || !action) return;
    const lead = findLead(id);
    if (!lead) return;

    if (action === 'edit') openModal(lead);
    if (action === 'disq') {
      manager.descalificar(id);
      syncAndRender();
    }
    if (action === 'restore') {
      manager.reactivar(id);
      syncAndRender();
    }
  });
}

function bindModal() {
  const openBtn = $('#btnOpenModal');
  if (openBtn) openBtn.addEventListener('click', () => openModal(null));
  const closeBtn = $('#btnCloseModal');
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  const cancelBtn = $('#btnCancelModal');
  if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
  const backdrop = $('#modalBackdrop');
  if (backdrop) {
    backdrop.addEventListener('click', (e) => {
      if (e.target && e.target.id === 'modalBackdrop') closeModal();
    });
  }

  const form = $('#formLead');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const editIdEl = $('#editId');
      const editId = editIdEl && editIdEl.value ? editIdEl.value : '';
      const payload = {
        nombre: ($('#fNombre') && $('#fNombre').value.trim()) || '',
        dni: ($('#fDni') && $('#fDni').value.trim()) || '',
        telefono: ($('#fTel') && $('#fTel').value.trim()) || '',
        correo: ($('#fCorreo') && $('#fCorreo').value.trim()) || '',
        canalIngreso: ($('#fCanal') && $('#fCanal').value) || 'presencial',
        interes: ($('#fInteres') && $('#fInteres').value) || 'medio',
        proximaLlamada: ($('#fProxLlamada') && $('#fProxLlamada').value) || '',
      };

      if (editId) {
        manager.update(editId, payload);
      } else {
        manager.create({
          ...payload,
          enFicha: false,
          producto: '',
          precio: '',
          fechaPago: '',
          descalificado: false,
        });
      }
      closeModal();
      syncAndRender();
    });
  }
}

function bindTheme() {
  const btn = $('#btnTheme');
  if (btn) {
    btn.addEventListener('click', () => {
      const isDark = !document.documentElement.classList.contains('dark');
      applyTheme(isDark);
    });
  }
}

function init() {
  try {
    manager.seedIfEmpty();
    initTheme();
    bindTabs();
    bindTableDelegation();
    bindModal();
    bindTheme();
    syncAndRender();
  } catch (err) {
    console.error(err);
    const app = document.getElementById('app');
    if (app) {
      app.innerHTML =
        '<div class="p-8 max-w-lg mx-auto text-center font-sans">' +
        '<p class="text-lg font-semibold text-red-600">Error al iniciar FocusCRM</p>' +
        '<p class="mt-2 text-sm text-notion-600">Abre <code class="bg-notion-100 px-1 rounded">index.html</code> desde la carpeta del proyecto (junto a <code class="bg-notion-100 px-1 rounded">js/</code> y <code class="bg-notion-100 px-1 rounded">css/</code>). No muevas solo el HTML a otra carpeta.</p>' +
        '<p class="mt-4 text-xs text-notion-500">' +
        String(err && err.message ? err.message : err) +
        '</p></div>';
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
