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
