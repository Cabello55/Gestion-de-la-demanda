import { mockProfesionales } from './mock-profesionales.js';
import { mockSolicitudes } from './mock-solicitudes.js';
import { mockSolicitudesActualizacion } from './mock-solicitudes-actualizacion.js';
import { mockCompromisos } from './mock-compromisos.js';
import { mockConflictos } from './mock-conflictos.js';
import { mockHistoricoDisponibilidad } from './mock-historico-disponibilidad.js';
import { mockUsuarios } from './mock-usuarios.js';
import { mockLogs } from './mock-logs.js';
import { mockIntegraciones } from './mock-integraciones.js';
import { mockNotificacionesConfig } from './mock-notificaciones-config.js';

const STORAGE_DATA_KEY = 'staffing_demo_data';

function buildSeedData() {
  return {
    profesionales: mockProfesionales,
    solicitudes: mockSolicitudes,
    solicitudesActualizacion: mockSolicitudesActualizacion,
    compromisos: mockCompromisos,
    conflictos: mockConflictos,
    historicoDisponibilidad: mockHistoricoDisponibilidad,
    usuarios: mockUsuarios,
    logs: mockLogs,
    integraciones: mockIntegraciones,
    notificacionesConfig: mockNotificacionesConfig,
  };
}

function migrateHistoricoEstados(historico = []) {
  return historico.map((h) => ({
    ...h,
    motivo: h.motivo ?? h.comentario ?? 'Cambio de estado',
  }));
}

function migrateValoraciones(valoraciones = []) {
  return valoraciones.map((v) => {
    if (v.conocimiento != null) {
      return v;
    }

    const toDiez = (val) => (val == null ? null : Math.round(Number(val) * 20) / 10);
    const general = toDiez(v.global);
    const conocimiento = toDiez(v.tecnica);
    const implicacion = toDiez(v.comunicacion ?? v.autonomia);
    const iniciativa = toDiez(v.autonomia);
    const trabajoEquipo = toDiez(v.trabajoEquipo);
    const dimensiones = [general, conocimiento, implicacion, iniciativa, trabajoEquipo].filter(
      (n) => n != null
    );
    const media =
      v.media ??
      (dimensiones.length
        ? Math.round((dimensiones.reduce((acc, n) => acc + n, 0) / dimensiones.length) * 10) / 10
        : null);

    return {
      proyecto: v.proyecto,
      media,
      general,
      conocimiento,
      implicacion,
      iniciativa,
      trabajoEquipo,
      fecha: v.fecha,
    };
  });
}

function defaultHistoricoDisponibilidadPersonal(prof) {
  if ((prof.historicoDisponibilidadPersonal ?? []).length) {
    return prof.historicoDisponibilidadPersonal;
  }
  return [
    { fecha: '2025-01-01', porcentaje: 40 },
    { fecha: '2025-03-01', porcentaje: 55 },
    { fecha: '2025-05-01', porcentaje: 45 },
    { fecha: '2025-07-01', porcentaje: 60 },
    { fecha: '2025-09-01', porcentaje: 50 },
    { fecha: '2025-11-01', porcentaje: 70 },
    { fecha: '2026-01-01', porcentaje: prof.disponibilidad?.porcentaje ?? 80 },
  ];
}

function migrateProfesionales(profesionales = []) {
  return profesionales.map((p) => {
    const skills = (p.skills ?? []).map((s) =>
      typeof s === 'string' ? { nombre: s, nivel: 'Intermedio' } : s
    );
    const cv = {
      ...(p.cv ?? {}),
      requiereActualizacion: Boolean(p.cv?.requiereActualizacion),
    };
    const validacion = p.validacion ?? {
      estado: 'Validado',
      fecha: p.cv?.actualizado ?? '2026-01-01',
      tipo: 'Alta nueva',
    };
    const matchingDemo = p.matchingDemo ?? 85;
    const experiencia = p.experiencia ?? [];
    const formacion = p.formacion ?? [];
    const certificaciones = p.certificaciones ?? [];
    const resumenProfesional = p.resumenProfesional ?? '';
    const historicoDisponibilidadProf = p.historicoDisponibilidadProf ?? [];
    const historicoEstados = migrateHistoricoEstados(p.historicoEstados);
    const valoraciones = migrateValoraciones(p.valoraciones);
    const historicoDisponibilidadPersonal = defaultHistoricoDisponibilidadPersonal(p);
    return {
      ...p,
      skills,
      cv,
      validacion,
      matchingDemo,
      experiencia,
      formacion,
      certificaciones,
      resumenProfesional,
      historicoDisponibilidadProf,
      historicoEstados,
      valoraciones,
      historicoDisponibilidadPersonal,
    };
  });
}

export function seedIfNeeded() {
  try {
    const seed = buildSeedData();
    const existing = localStorage.getItem(STORAGE_DATA_KEY);

    if (!existing) {
      localStorage.setItem(STORAGE_DATA_KEY, JSON.stringify(seed));
      return;
    }

    const parsed = JSON.parse(existing);
    let changed = false;

    for (const key of Object.keys(seed)) {
      if (parsed[key] == null) {
        parsed[key] = seed[key];
        changed = true;
      }
    }

    const needsRefreshProf =
      (parsed.profesionales ?? []).some(
        (p) =>
          (p.skills ?? []).some((s) => typeof s === 'string') ||
          p.cv == null ||
          !('requiereActualizacion' in (p.cv ?? {})) ||
          !Array.isArray(p.historicoEstados) ||
          p.validacion == null ||
          p.matchingDemo == null ||
          !Array.isArray(p.experiencia) ||
          (p.historicoEstados ?? []).some((h) => !h.motivo) ||
          (p.valoraciones ?? []).some((v) => v.conocimiento == null) ||
          (p.historicoDisponibilidadPersonal ?? []).length < 6 ||
          (p.id === 'PROF-001' && !p.resumenProfesional)
      ) || (parsed.profesionales ?? []).length < seed.profesionales.length;

    if (needsRefreshProf) {
      parsed.profesionales = seed.profesionales;
      changed = true;
    } else {
      const migrated = migrateProfesionales(parsed.profesionales);
      if (JSON.stringify(migrated) !== JSON.stringify(parsed.profesionales)) {
        parsed.profesionales = migrated;
        changed = true;
      }
    }

    if ((parsed.compromisos ?? []).length !== seed.compromisos.length) {
      parsed.compromisos = seed.compromisos;
      changed = true;
    } else if ((parsed.compromisos ?? []).some((c) => c.id === 'COM-003' && !c.solicitudId)) {
      parsed.compromisos = seed.compromisos;
      changed = true;
    }

    if ((parsed.solicitudes ?? []).length !== seed.solicitudes.length) {
      parsed.solicitudes = seed.solicitudes;
      changed = true;
    }

    if ((parsed.conflictos ?? []).length !== seed.conflictos.length) {
      parsed.conflictos = seed.conflictos;
      changed = true;
    }

    if (
      (parsed.historicoDisponibilidad ?? []).length !== seed.historicoDisponibilidad.length
    ) {
      parsed.historicoDisponibilidad = seed.historicoDisponibilidad;
      changed = true;
    }

    if ((parsed.usuarios ?? []).length !== seed.usuarios.length) {
      parsed.usuarios = seed.usuarios;
      changed = true;
    }

    if ((parsed.logs ?? []).length !== seed.logs.length) {
      parsed.logs = seed.logs;
      changed = true;
    }

    if ((parsed.integraciones ?? []).length !== seed.integraciones.length) {
      parsed.integraciones = seed.integraciones;
      changed = true;
    }

    if ((parsed.notificacionesConfig ?? []).length !== seed.notificacionesConfig.length) {
      parsed.notificacionesConfig = seed.notificacionesConfig;
      changed = true;
    }

    if (changed) {
      localStorage.setItem(STORAGE_DATA_KEY, JSON.stringify(parsed));
    }
  } catch (err) {
    console.warn('No se pudo inicializar localStorage:', err);
  }
}

export function loadDemoData() {
  try {
    const raw = localStorage.getItem(STORAGE_DATA_KEY);
    if (!raw) return buildSeedData();
    const parsed = JSON.parse(raw);
    return {
      ...buildSeedData(),
      ...parsed,
      profesionales: migrateProfesionales(parsed.profesionales ?? buildSeedData().profesionales),
    };
  } catch {
    return buildSeedData();
  }
}
