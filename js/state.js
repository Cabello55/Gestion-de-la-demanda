import { seedIfNeeded, loadDemoData } from './data/seed.js';

const STORAGE_DATA_KEY = 'staffing_demo_data';
const STORAGE_USER_KEY = 'staffing_demo_usuario_activo';

let state = {
  usuarioActivo: null,
  profesionales: [],
  solicitudes: [],
  solicitudesActualizacion: [],
  compromisos: [],
  conflictos: [],
  historicoDisponibilidad: [],
  usuarios: [],
  logs: [],
  integraciones: [],
  notificacionesConfig: [],
};

const listeners = new Set();

function persistData() {
  localStorage.setItem(
    STORAGE_DATA_KEY,
    JSON.stringify({
      profesionales: state.profesionales,
      solicitudes: state.solicitudes,
      solicitudesActualizacion: state.solicitudesActualizacion,
      compromisos: state.compromisos,
      conflictos: state.conflictos,
      historicoDisponibilidad: state.historicoDisponibilidad,
      usuarios: state.usuarios,
      logs: state.logs,
      integraciones: state.integraciones,
      notificacionesConfig: state.notificacionesConfig,
    })
  );
}

function emit() {
  for (const fn of listeners) {
    try {
      fn(state);
    } catch (err) {
      console.error(err);
    }
  }
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getState() {
  return state;
}

export function getUsuarioActivo() {
  return state.usuarioActivo;
}

export function getProfesionales() {
  return state.profesionales;
}

export function getSolicitudes() {
  return state.solicitudes;
}

export function getSolicitudesActualizacion() {
  return state.solicitudesActualizacion;
}

export function getCompromisos() {
  return state.compromisos;
}

export function getConflictos() {
  return state.conflictos;
}

export function getHistoricoDisponibilidad() {
  return state.historicoDisponibilidad;
}

export function getUsuarios() {
  return state.usuarios;
}

export function getLogs() {
  return state.logs;
}

export function getIntegraciones() {
  return state.integraciones;
}

export function getNotificacionesConfig() {
  return state.notificacionesConfig;
}

export function setUsuarioActivo(usuario) {
  state.usuarioActivo = usuario;
  localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(usuario));
  emit();
}

export function logout() {
  state.usuarioActivo = null;
  localStorage.removeItem(STORAGE_USER_KEY);
  emit();
}

export function initState() {
  seedIfNeeded();

  const usuarioRaw = localStorage.getItem(STORAGE_USER_KEY);
  state.usuarioActivo = usuarioRaw ? JSON.parse(usuarioRaw) : null;

  const data = loadDemoData();
  state.profesionales = data.profesionales ?? [];
  state.solicitudes = data.solicitudes ?? [];
  state.solicitudesActualizacion = data.solicitudesActualizacion ?? [];
  state.compromisos = data.compromisos ?? [];
  state.conflictos = data.conflictos ?? [];
  state.historicoDisponibilidad = data.historicoDisponibilidad ?? [];
  state.usuarios = data.usuarios ?? [];
  state.logs = data.logs ?? [];
  state.integraciones = data.integraciones ?? [];
  state.notificacionesConfig = data.notificacionesConfig ?? [];
}

export function actualizarProfesional(profesionalId, mutator) {
  const idx = state.profesionales.findIndex((p) => p.id === profesionalId);
  if (idx === -1) return;

  const updated = mutator(structuredClone(state.profesionales[idx]));
  state.profesionales[idx] = updated;
  persistData();
  emit();
}

export function actualizarSolicitud(solicitudId, mutator) {
  const idx = state.solicitudes.findIndex((s) => s.id === solicitudId);
  if (idx === -1) return;

  const updated = mutator(structuredClone(state.solicitudes[idx]));
  state.solicitudes[idx] = updated;
  persistData();
  emit();
}

export function actualizarCompromiso(compromisoId, mutator) {
  const idx = state.compromisos.findIndex((c) => c.id === compromisoId);
  if (idx === -1) return;

  const updated = mutator(structuredClone(state.compromisos[idx]));
  state.compromisos[idx] = updated;
  persistData();
  emit();
}

export function actualizarConflicto(conflictoId, mutator) {
  const idx = state.conflictos.findIndex((c) => c.id === conflictoId);
  if (idx === -1) return;

  const updated = mutator(structuredClone(state.conflictos[idx]));
  state.conflictos[idx] = updated;
  persistData();
  emit();
}
