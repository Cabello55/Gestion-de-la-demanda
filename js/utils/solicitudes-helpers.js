import { getProfesionales, getSolicitudes } from '../state.js';

export const ESTADOS_SOLICITUD_INACTIVOS = new Set(['Finalizada', 'Rechazada', 'Cancelada']);

export function esSolicitudActiva(solicitud) {
  return !ESTADOS_SOLICITUD_INACTIVOS.has(solicitud?.estado);
}

export function getSolicitudesPorRp(solicitudes, rpId) {
  return (solicitudes ?? []).filter((s) => s.rpResponsableId === rpId);
}

export function getSolicitudesPorKcm(solicitudes, kcmId) {
  return (solicitudes ?? []).filter((s) => s.kcmId === kcmId);
}

/** Ámbito KCM: propias (como RP) + equipo (kcmId). */
export function getSolicitudesAmbitoKcm(solicitudes, kcmUserId) {
  const seen = new Set();
  const out = [];
  for (const s of solicitudes ?? []) {
    if (s.rpResponsableId === kcmUserId || s.kcmId === kcmUserId) {
      if (seen.has(s.id)) continue;
      seen.add(s.id);
      out.push(s);
    }
  }
  return out;
}

export function countSolicitudesActivasPorRp(solicitudes, rpId) {
  return getSolicitudesPorRp(solicitudes, rpId).filter(esSolicitudActiva).length;
}

export function countSolicitudesActivasPorKcm(solicitudes, kcmId) {
  return getSolicitudesPorKcm(solicitudes, kcmId).filter(esSolicitudActiva).length;
}

export function countPendientesPorResponsable(solicitudes, rpId) {
  return getSolicitudesPorRp(solicitudes, rpId).filter((s) => s.estado === 'Pendiente').length;
}

export function countPendientesAmbitoKcm(solicitudes, kcmUserId) {
  return getSolicitudesAmbitoKcm(solicitudes, kcmUserId).filter((s) => s.estado === 'Pendiente')
    .length;
}

export function agregarSolicitudesPorEstado(solicitudes) {
  const counts = {};
  for (const s of solicitudes ?? []) {
    const key = s.estado ?? 'Sin estado';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

/**
 * Profesionales Asignados vinculados a solicitudes Aprobadas del conjunto dado.
 */
export function countRecursosAsignados(solicitudes, profesionales) {
  const profById = new Map((profesionales ?? []).map((p) => [p.id, p]));
  const ids = new Set();

  for (const s of solicitudes ?? []) {
    if (s.estado !== 'Aprobada' || !s.profesionalId) continue;
    const p = profById.get(s.profesionalId);
    if (p?.estado === 'Asignado') {
      ids.add(p.id);
    }
  }

  return ids.size;
}

/**
 * Ranking de proyectos por nº de solicitudes Aprobadas (desc), top N.
 */
export function rankingProyectosAprobados(solicitudes, limit = 5) {
  const map = new Map();
  for (const s of solicitudes ?? []) {
    if (s.estado !== 'Aprobada') continue;
    const key = s.proyecto ?? 'Sin proyecto';
    map.set(key, (map.get(key) ?? 0) + 1);
  }

  return [...map.entries()]
    .map(([proyecto, count]) => ({ proyecto, count }))
    .sort((a, b) => b.count - a.count || a.proyecto.localeCompare(b.proyecto))
    .slice(0, limit);
}

export function getSolicitudesRecientes(solicitudes, limit = 4) {
  return [...(solicitudes ?? [])]
    .sort((a, b) => String(b.fechaSolicitud).localeCompare(String(a.fechaSolicitud)))
    .slice(0, limit);
}

/** Helper de conveniencia desde estado global. */
export function snapshotSolicitudes() {
  return {
    solicitudes: getSolicitudes(),
    profesionales: getProfesionales(),
  };
}
