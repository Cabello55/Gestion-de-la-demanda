import {
  getSolicitudes,
  getUsuarioActivo,
  getProfesionales,
  getConflictos,
  getCompromisos,
  actualizarCompromiso,
  actualizarProfesional,
  actualizarConflicto,
  actualizarSolicitud,
} from '../state.js';
import { renderBadgeEstado } from '../components/badge-estado.js';
import { getNombreRp } from '../data/catalogo-rp.js';
import {
  getSolicitudesPorProfesional,
  getSolicitudesAmbitoRp,
  getSolicitudesAmbitoKcmEquipo,
  contarResumenSolicitudes,
  filtrarSolicitudesPorTab,
  ordenarSolicitudesPorFecha,
} from '../utils/solicitudes-helpers.js';
import {
  renderTablaSolicitudesProfesional,
  renderTablaSolicitudesRpKcm,
  renderCalendarioSolicitudes,
  renderModalCancelarSolicitud,
} from '../components/tabla-solicitudes.js';

const ROLES_SOLICITUDES_RP_KCM = ['RP', 'KCM'];

const TABS_ESTADO = [
  { id: 'todas', label: 'Todas' },
  { id: 'pendientes', label: 'Pendientes' },
  { id: 'aprobadas', label: 'Aprobadas' },
  { id: 'rechazadas', label: 'Rechazadas' },
  { id: 'finalizadas', label: 'Finalizadas' },
];

const CARD_META = {
  total: 'solicitudes',
  pendientes: 'en curso',
  aprobadas: 'incorporado',
  finalizadas: 'finalizado',
};

function parseSolicitudesPath() {
  const cleaned = (window.location.hash || '').replace(/^#\/?/, '').split('?')[0];
  const segs = cleaned.split('/').filter(Boolean);
  if (segs[0] !== 'solicitudes') return { mode: 'list' };
  if (segs[1] === 'nueva') return { mode: 'nueva' };
  if (segs[1] && segs[2] === 'editar') return { mode: 'editar', id: segs[1] };
  if (segs[1]) return { mode: 'detalle', id: segs[1] };
  return { mode: 'list' };
}

function buildSolicitudesHash(query = {}) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v != null && v !== '') params.set(k, v);
  }
  const qs = params.toString();
  return `#/solicitudes${qs ? `?${qs}` : ''}`;
}

function getTabActivo(query) {
  const tab = query?.tab ?? 'todas';
  return TABS_ESTADO.some((t) => t.id === tab) ? tab : 'todas';
}

function getAmbitoKcm(query) {
  return query?.ambito === 'equipo' ? 'equipo' : 'propias';
}

function renderCardResumen(label, count, meta) {
  return `
    <article class="sol-card">
      <h3 class="sol-card__label">${label}</h3>
      <p class="sol-card__metric">${count}</p>
      ${meta ? `<p class="sol-card__meta">${meta}</p>` : ''}
    </article>
  `;
}

function renderCardsResumen(resumen) {
  return `
    <div class="sol-cards">
      ${renderCardResumen('Total', resumen.total, CARD_META.total)}
      ${renderCardResumen('Pendientes', resumen.pendientes, CARD_META.pendientes)}
      ${renderCardResumen('Aprobadas', resumen.aprobadas, CARD_META.aprobadas)}
      ${renderCardResumen('Rechazadas', resumen.rechazadas, '')}
      ${renderCardResumen('Finalizadas', resumen.finalizadas, CARD_META.finalizadas)}
    </div>
  `;
}

function renderTabsEstado(tabActivo) {
  return `
    <div class="sol-tabs" role="tablist">
      ${TABS_ESTADO.map((tab) => {
        const active = tabActivo === tab.id;
        return `
          <button
            type="button"
            class="sol-tabs__btn ${active ? 'sol-tabs__btn--active' : ''}"
            role="tab"
            aria-selected="${active}"
            data-action="cambiar-tab"
            data-tab="${tab.id}"
          >
            ${tab.label}
          </button>
        `;
      }).join('')}
    </div>
  `;
}

function renderSelectorAmbitoKcm(ambitoActivo) {
  return `
    <div class="sol-ambito" role="tablist" aria-label="Ámbito de solicitudes">
      <button
        type="button"
        class="sol-ambito__btn ${ambitoActivo === 'propias' ? 'sol-ambito__btn--active' : ''}"
        role="tab"
        aria-selected="${ambitoActivo === 'propias'}"
        data-action="cambiar-ambito"
        data-ambito="propias"
      >
        Propias
      </button>
      <button
        type="button"
        class="sol-ambito__btn ${ambitoActivo === 'equipo' ? 'sol-ambito__btn--active' : ''}"
        role="tab"
        aria-selected="${ambitoActivo === 'equipo'}"
        data-action="cambiar-ambito"
        data-ambito="equipo"
      >
        Solicitudes de mi equipo
      </button>
    </div>
  `;
}

function renderDropdownVista(vistaCalendario) {
  return `
    <div class="sol-dropdown" data-dropdown="vista">
      <button type="button" class="btn sol-dropdown__toggle" data-action="toggle-vista">
        Ver calendario <i class="fa-solid fa-chevron-down" aria-hidden="true"></i>
      </button>
      <div class="sol-dropdown__menu" hidden>
        <button
          type="button"
          class="sol-dropdown__item"
          data-action="set-vista"
          data-vista="tabla"
          ${!vistaCalendario ? 'aria-current="true"' : ''}
        >
          Vista tabla
        </button>
        <button
          type="button"
          class="sol-dropdown__item"
          data-action="set-vista"
          data-vista="calendario"
          ${vistaCalendario ? 'aria-current="true"' : ''}
        >
          Vista calendario
        </button>
      </div>
    </div>
  `;
}

function renderPieListado(desde, hasta, total) {
  return `
    <p class="sol-footer">
      Mostrando ${desde} a ${hasta} de ${total} solicitud${total === 1 ? '' : 'es'}
    </p>
  `;
}

function formatFecha(iso) {
  if (!iso) return '—';
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function renderEmpty(message) {
  return `
    <div class="sol-empty sol-empty--large">
      <i class="fa-solid fa-folder-open sol-empty__icon" aria-hidden="true"></i>
      <p>${message}</p>
    </div>
  `;
}

function renderFormularioStub(titulo, detalle) {
  return `
    <section class="sol">
      <a class="sol-back" href="#/solicitudes">← Volver a mis solicitudes</a>
      <header class="sol__header">
        <h1 class="sol__title">${titulo}</h1>
        <p class="sol__subtitle">${detalle}</p>
      </header>
    </section>
  `;
}

function confirmarEntrevista(solicitudId, profesionalId) {
  const compromisos = getCompromisos();
  const compromiso = compromisos.find(
    (c) => c.solicitudId === solicitudId && c.profesionalId === profesionalId
  );

  if (compromiso) {
    actualizarCompromiso(compromiso.id, (c) => ({
      ...c,
      estadoBadge: 'Confirmado',
    }));
  }

  const hoy = new Date().toISOString().slice(0, 10);
  actualizarSolicitud(solicitudId, (s) => ({
    ...s,
    historico: [
      ...(s.historico ?? []),
      {
        evento: 'Entrevista confirmada por el profesional',
        usuario: 'Profesional',
        fecha: hoy,
      },
    ],
  }));
}

function cancelarSolicitud(solicitudId, usuarioActivo) {
  const hoy = new Date().toISOString().slice(0, 10);
  const nombre = usuarioActivo?.nombre ?? 'Usuario';
  actualizarSolicitud(solicitudId, (s) => ({
    ...s,
    estado: 'Cancelada',
    historico: [
      ...(s.historico ?? []),
      {
        evento: 'Solicitud cancelada',
        usuario: nombre,
        fecha: hoy,
      },
    ],
  }));
}

function wireDropdownVista(root) {
  root.querySelector('[data-action="toggle-vista"]')?.addEventListener('click', (e) => {
    e.stopPropagation();
    const menu = root.querySelector('[data-dropdown="vista"] .sol-dropdown__menu');
    if (menu) menu.hidden = !menu.hidden;
  });

  if (!root.dataset.solDropdownWired) {
    root.dataset.solDropdownWired = '1';
    root.addEventListener('click', (e) => {
      if (!e.target.closest('[data-dropdown="vista"]')) {
        root.querySelector('[data-dropdown="vista"] .sol-dropdown__menu')?.setAttribute('hidden', '');
      }
    });
  }
}

function wireNavegacionFilas(root, accionesExcluidas = []) {
  root.querySelectorAll('[data-action="abrir-solicitud"]').forEach((el) => {
    const navigate = () => {
      window.location.hash = `#/solicitudes/${el.dataset.id}`;
    };
    el.addEventListener('click', (e) => {
      if (accionesExcluidas.some((sel) => e.target.closest(sel))) return;
      navigate();
    });
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        navigate();
      }
    });
  });
}

function wireSolicitudesListado(root, ctx, { onTab, onAmbito, onVista, onConfirmarEntrevista, onCancelar }) {
  wireDropdownVista(root);

  root.querySelectorAll('[data-action="cambiar-tab"]').forEach((btn) => {
    btn.addEventListener('click', () => onTab(btn.dataset.tab));
  });

  root.querySelectorAll('[data-action="cambiar-ambito"]').forEach((btn) => {
    btn.addEventListener('click', () => onAmbito(btn.dataset.ambito));
  });

  root.querySelectorAll('[data-action="set-vista"]').forEach((btn) => {
    btn.addEventListener('click', () => onVista(btn.dataset.vista));
  });

  const excluir = [
    '[data-action="confirmar-entrevista"]',
    '[data-action="editar-solicitud"]',
    '[data-action="cancelar-solicitud"]',
  ];
  wireNavegacionFilas(root, excluir);

  root.querySelectorAll('[data-action="confirmar-entrevista"]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      onConfirmarEntrevista?.(btn.dataset.id);
    });
  });

  root.querySelectorAll('[data-action="editar-solicitud"]').forEach((link) => {
    link.addEventListener('click', (e) => e.stopPropagation());
  });

  root.querySelectorAll('[data-action="cancelar-solicitud"]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      onCancelar?.(btn.dataset.id);
    });
  });
}

function renderListadoSolicitudes({
  container,
  ctx,
  rerender,
  subtitulo,
  accionesHeader = '',
  selectorAmbito = '',
  obtenerBase,
  emptyMessage,
  emptyEquipoMessage,
  renderTabla,
  renderCalendario,
}) {
  const query = ctx.query ?? {};
  const tabActivo = getTabActivo(query);
  const vistaCalendario = query.vista === 'calendario';
  const ambito = getAmbitoKcm(query);

  const todas = ordenarSolicitudesPorFecha(obtenerBase());
  const resumen = contarResumenSolicitudes(todas);
  const filtradas = ordenarSolicitudesPorFecha(filtrarSolicitudesPorTab(todas, tabActivo));
  const total = filtradas.length;
  const desde = total ? 1 : 0;
  const hasta = total;

  const emptyEquipo = ambito === 'equipo' && todas.length === 0 && emptyEquipoMessage;
  const tieneSelector = Boolean(selectorAmbito);
  const emptySinSelector = !tieneSelector && todas.length === 0;
  const emptyConSelector = tieneSelector && todas.length === 0;
  const emptyTexto = emptyEquipo
    ? emptyEquipoMessage
    : emptyConSelector
      ? emptyMessage
      : emptyMessage;

  container.innerHTML = `
    <section class="sol">
      <header class="sol__header sol__header--actions">
        <div class="sol__intro">
          <h1 class="sol__title">Mis Solicitudes</h1>
          <p class="sol__subtitle">${subtitulo}</p>
        </div>
        <div class="sol__actions">
          ${renderDropdownVista(vistaCalendario)}
          ${accionesHeader}
        </div>
      </header>

      ${renderCardsResumen(resumen)}

      ${
        emptySinSelector
          ? renderEmpty(emptyMessage)
          : `
        ${selectorAmbito}
        ${
          emptyConSelector
            ? renderEmpty(emptyTexto)
            : `
        ${renderTabsEstado(tabActivo)}
        <div class="sol-tabpanel" role="tabpanel">
          ${
            filtradas.length === 0
              ? `<p class="sol-empty">No hay solicitudes en este filtro</p>`
              : vistaCalendario
                ? renderCalendario(filtradas)
                : renderTabla(filtradas)
          }
        </div>
        ${renderPieListado(desde, hasta, total)}
      `
        }
      `
      }
    </section>
  `;

  const usuarioActivo = ctx.usuarioActivo ?? getUsuarioActivo();

  wireSolicitudesListado(container, ctx, {
    onTab: (tab) => {
      const next = { ...query, tab };
      if (next.vista === 'tabla') delete next.vista;
      window.location.hash = buildSolicitudesHash(next);
    },
    onAmbito: (nextAmbito) => {
      const next = { ...query, ambito: nextAmbito };
      window.location.hash = buildSolicitudesHash(next);
    },
    onVista: (vista) => {
      window.location.hash = buildSolicitudesHash({ ...query, vista });
    },
    onConfirmarEntrevista: (id) => {
      confirmarEntrevista(id, usuarioActivo?.profesionalId);
      rerender();
    },
    onCancelar: (id) => {
      const solicitud = getSolicitudes().find((s) => s.id === id);
      if (!solicitud) return;
      container.querySelector('[data-modal]')?.remove();
      container.insertAdjacentHTML('beforeend', renderModalCancelarSolicitud(solicitud));
      container.querySelectorAll('[data-action="cerrar-modal"]').forEach((el) => {
        el.addEventListener('click', () => container.querySelector('[data-modal]')?.remove());
      });
      container.querySelector('[data-action="confirmar-cancelar"]')?.addEventListener('click', () => {
        cancelarSolicitud(id, usuarioActivo);
        container.querySelector('[data-modal]')?.remove();
        rerender();
      });
    },
  });
}

function renderSolicitudesProfesional(container, ctx) {
  const usuarioActivo = ctx.usuarioActivo ?? getUsuarioActivo();
  const profesionalId = usuarioActivo?.profesionalId;

  renderListadoSolicitudes({
    container,
    ctx,
    rerender: () => renderSolicitudesProfesional(container, ctx),
    subtitulo: 'Consulta las solicitudes en las que participas.',
    obtenerBase: () => getSolicitudesPorProfesional(getSolicitudes(), profesionalId),
    emptyMessage: 'Aún no participas en ningún proceso de staffing',
    renderTabla: (filtradas) => renderTablaSolicitudesProfesional(filtradas),
    renderCalendario: (filtradas) => renderCalendarioSolicitudes(filtradas),
  });
}

function renderSolicitudesRpKcm(container, ctx) {
  const usuarioActivo = ctx.usuarioActivo ?? getUsuarioActivo();
  const userId = usuarioActivo?.id;
  const esKcm = usuarioActivo?.rolKey === 'KCM';
  const query = ctx.query ?? {};
  const ambito = getAmbitoKcm(query);
  const profesionales = getProfesionales();
  const profById = new Map(profesionales.map((p) => [p.id, p]));

  const obtenerBase = () => {
    const solicitudes = getSolicitudes();
    if (esKcm && ambito === 'equipo') {
      return getSolicitudesAmbitoKcmEquipo(solicitudes, userId);
    }
    return getSolicitudesAmbitoRp(solicitudes, userId);
  };

  renderListadoSolicitudes({
    container,
    ctx,
    rerender: () => renderSolicitudesRpKcm(container, ctx),
    subtitulo: 'Solicitudes que has creado.',
    accionesHeader: `<a class="btn btn--primary" href="#/solicitudes/nueva">+ Nueva solicitud</a>`,
    selectorAmbito: esKcm ? renderSelectorAmbitoKcm(ambito) : '',
    obtenerBase,
    emptyMessage: 'Aún no has creado ninguna solicitud',
    emptyEquipoMessage: 'Aún no hay solicitudes de tu equipo',
    renderTabla: (filtradas) =>
      renderTablaSolicitudesRpKcm(filtradas, {
        mostrarRp: esKcm && ambito === 'equipo',
        profById,
      }),
    renderCalendario: (filtradas) => renderCalendarioSolicitudes(filtradas, { profById }),
  });
}

const GDD_TABS = [
  { id: 'pendientes-validar', label: 'Pendientes de validar' },
  { id: 'pendientes-aprobacion', label: 'Pendientes de aprobación' },
  { id: 'aprobadas', label: 'Aprobadas' },
  { id: 'rechazadas', label: 'Rechazadas' },
  { id: 'finalizadas', label: 'Finalizadas' },
  { id: 'todas', label: 'Todas' },
];

function getTabGddActivo(query) {
  const tab = query?.tab ?? 'pendientes-validar';
  return GDD_TABS.some((t) => t.id === tab) ? tab : 'pendientes-validar';
}

function getHoyISO() {
  return new Date().toISOString().slice(0, 10);
}

function getMesActualRango() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    startISO: start.toISOString().slice(0, 10),
    endISO: end.toISOString().slice(0, 10),
  };
}

function renderMiniDonutDisponibilidad(pct) {
  const clamped = Math.max(0, Math.min(100, pct));
  const r = 36;
  const c = 2 * Math.PI * r;
  const dash = (clamped / 100) * c;

  return `
    <div class="inicio-mini-donut">
      <svg viewBox="0 0 100 100" width="96" height="96" aria-hidden="true">
        <circle cx="50" cy="50" r="${r}" fill="none" stroke="var(--color-border)" stroke-width="10" />
        <circle
          cx="50"
          cy="50"
          r="${r}"
          fill="none"
          stroke="var(--ayesa-turquesa)"
          stroke-width="10"
          stroke-linecap="round"
          stroke-dasharray="${dash} ${c}"
          transform="rotate(-90 50 50)"
        />
      </svg>
      <div class="inicio-mini-donut__value">${clamped}%</div>
    </div>
  `;
}

function filtrarSolicitudesGddPorTab(solicitudes, tabId) {
  const byEstado = (estado) => (s) => s.estado === estado;
  const filters = {
    'pendientes-validar': byEstado('Pendiente'),
    'pendientes-aprobacion': byEstado('En entrevista'),
    aprobadas: byEstado('Aprobada'),
    rechazadas: byEstado('Rechazada'),
    finalizadas: byEstado('Finalizada'),
    todas: () => true,
  };
  const filter = filters[tabId] ?? filters['todas'];
  return (solicitudes ?? []).filter(filter);
}

function ordenarSolicitudesGddPorFechaDesc(solicitudes) {
  return [...(solicitudes ?? [])].sort((a, b) =>
    String(b.fechaSolicitud).localeCompare(String(a.fechaSolicitud))
  );
}

function getConflictoAbiertoPorSolicitudId(conflictos) {
  const map = new Map();
  const abiertos = (conflictos ?? []).filter((c) => c.estado === 'Abierto');
  for (const c of abiertos) {
    for (const sId of c.solicitudesEnConflicto ?? []) {
      if (!map.has(sId)) map.set(sId, c);
    }
  }
  return map;
}

function construirTextoBusqueda(s, qRpNombre) {
  return `${s.id ?? ''} ${s.proyecto ?? ''} ${s.cliente ?? ''} ${s.rolSolicitado ?? ''} ${qRpNombre ?? ''}`
    .toLowerCase();
}

function matchesFiltroTexto(s, q, rpNombre) {
  if (!q) return true;
  const haystack = construirTextoBusqueda(s, rpNombre);
  return haystack.includes(String(q).toLowerCase().trim());
}

function matchesRangoFecha(s, fechaDesde, fechaHasta) {
  const f = String(s.fechaSolicitud ?? '');
  if (!f) return false;
  if (fechaDesde && f < fechaDesde) return false;
  if (fechaHasta && f > fechaHasta) return false;
  return true;
}

function filtrarSolicitudesGdd(solicitudes, ctxQuery, { perfilesById, conflictosBySolicitudId } = {}) {
  const tabActivo = getTabGddActivo(ctxQuery);
  const q = (ctxQuery?.q ?? '').trim();
  const proyecto = ctxQuery?.proyecto ?? '';
  const rpSolicitanteId = ctxQuery?.rpSolicitanteId ?? '';
  const fechaDesde = ctxQuery?.fechaDesde ?? '';
  const fechaHasta = ctxQuery?.fechaHasta ?? '';

  const base = filtrarSolicitudesGddPorTab(solicitudes, tabActivo);

  return base.filter((s) => {
    if (proyecto && s.proyecto !== proyecto) return false;
    if (rpSolicitanteId && s.rpResponsableId !== rpSolicitanteId) return false;
    if (fechaDesde || fechaHasta) {
      if (!matchesRangoFecha(s, fechaDesde, fechaHasta)) return false;
    }

    const rpNombre = getNombreRp(s.rpResponsableId);
    if (!matchesFiltroTexto(s, q, rpNombre)) return false;

    // Si existe conflicto abierto asociado, igualmente participa en filtros de estado/tabs;
    // el "Conflicto" es un indicador visual, no un estado.
    // eslint-disable-next-line no-unused-vars
    const _conflictoAbierto = conflictosBySolicitudId?.get?.(s.id);
    return true;
  });
}

function esSolicitudEstadoAccionable(estado) {
  return estado === 'Pendiente' || estado === 'En entrevista';
}

function actualizarHistoricoSolicitud(solicitud, evento, usuarioNombre) {
  const hoy = getHoyISO();
  return {
    ...solicitud,
    historico: [
      ...(solicitud.historico ?? []),
      {
        evento,
        usuario: usuarioNombre,
        fecha: hoy,
      },
    ],
  };
}

function actualizarHistoricoProfesional(p, nuevoEstado, { motivo, comentario, usuarioNombre } = {}) {
  const fecha = getHoyISO();
  if (!Array.isArray(p.historicoEstados)) p.historicoEstados = [];
  p.historicoEstados.push({
    estado: nuevoEstado,
    fecha,
    motivo: motivo ?? `Cambio de estado a ${nuevoEstado}`,
    usuario: usuarioNombre,
    comentario: comentario ?? '',
  });

  p.estado = nuevoEstado;

  if (nuevoEstado === 'Disponible' && p.disponibilidad) {
    p.disponibilidad.porcentaje = p.disponibilidad.porcentaje || 100;
  }
  return p;
}

function aprovarSolicitudGdd(solicitudId, usuarioActivo) {
  const solicitudes = getSolicitudes();
  const solicitud = solicitudes.find((s) => s.id === solicitudId);
  if (!solicitud) return;

  const usuarioNombre = `${usuarioActivo?.nombre ?? 'GDD'} (GDD)`;

  // 1) Solicitud -> Aprobada
  actualizarSolicitud(solicitudId, (s) => {
    const next = actualizarHistoricoSolicitud(s, 'Aprobada', usuarioNombre);
    return {
      ...next,
      estado: 'Aprobada',
    };
  });

  // 2) Profesional -> Asignado (si existe)
  if (solicitud.profesionalId) {
    const profId = solicitud.profesionalId;
    actualizarProfesional(profId, (p) => {
      return actualizarHistoricoProfesional(p, 'Asignado', {
        motivo: 'Aprobación de solicitud',
        comentario: `Asignado por solicitud ${solicitudId}`,
        usuarioNombre,
      });
    });
  }
}

function rechazarSolicitudGdd(solicitudId, usuarioActivo) {
  const solicitudes = getSolicitudes();
  const solicitud = solicitudes.find((s) => s.id === solicitudId);
  if (!solicitud) return;

  const usuarioNombre = `${usuarioActivo?.nombre ?? 'GDD'} (GDD)`;

  // 1) Solicitud -> Rechazada
  actualizarSolicitud(solicitudId, (s) => {
    const next = actualizarHistoricoSolicitud(s, 'Rechazada', usuarioNombre);
    return {
      ...next,
      estado: 'Rechazada',
    };
  });

  // 2) Profesional -> Disponible si estaba en "Solicitado"
  if (solicitud.profesionalId) {
    const profId = solicitud.profesionalId;
    actualizarProfesional(profId, (p) => {
      if (p.estado !== 'Solicitado') return p;

      return actualizarHistoricoProfesional(p, 'Disponible', {
        motivo: 'Rechazo de solicitud',
        comentario: `Liberado por rechazo de solicitud ${solicitudId}`,
        usuarioNombre,
      });
    });
  }
}

function renderBadgeConflicto() {
  return renderBadgeEstado({ estado: 'Conflicto', variante: 'info' });
}

function renderModalResolverConflicto(conflicto, solicitudesImplicadas, { profById } = {}) {
  const list = solicitudesImplicadas ?? [];
  const usuarioListado = conflicto?.id ?? '—';
  return `
    <div class="sol-modal" data-modal="resolver-conflicto" role="dialog" aria-modal="true">
      <div class="sol-modal__backdrop" data-action="cerrar-modal"></div>
      <div class="sol-modal__card">
        <header class="sol-modal__head">
          <h2 class="sol-modal__title">Resolver conflicto ${usuarioListado}</h2>
          <button type="button" class="sol-modal__close" data-action="cerrar-modal" aria-label="Cerrar">
            <i class="fa-solid fa-xmark" aria-hidden="true"></i>
          </button>
        </header>

        <p class="sol-modal__text">
          Selecciona qué solicitud se aprueba y el resto se rechazará automáticamente.
        </p>

        <div class="sol-modal__list">
          ${list.length
            ? `
            <ul class="sol-conflict-list">
              ${list
                .map((s) => {
                  const rp = getNombreRp(s.rpResponsableId);
                  return `
                <li class="sol-conflict-list__item">
                  <div class="sol-conflict-list__main">
                    <div class="sol-conflict-list__title">${s.id}</div>
                    <div class="sol-conflict-list__detail">
                      ${s.proyecto ?? '—'} / ${s.cliente ?? '—'} · ${s.rolSolicitado ?? '—'}
                    </div>
                    <div class="sol-conflict-list__meta">${rp} · ${formatFecha(s.fechaSolicitud)}</div>
                  </div>
                  <div class="sol-conflict-list__aside">
                    <button type="button" class="btn btn--primary btn--sm" data-action="asignar-a-esta" data-solicitud-id="${s.id}">
                      Asignar a esta
                    </button>
                  </div>
                </li>
              `;
                })
                .join('')}
            </ul>
          `
            : `<p class="sol-empty">No hay solicitudes implicadas</p>`}
        </div>

        <footer class="sol-modal__footer">
          <button type="button" class="btn" data-action="cerrar-modal">Cerrar</button>
        </footer>
      </div>
    </div>
  `;
}

function renderTablaSolicitudesGdd(solicitudes, conflictosBySolicitudId) {
  if (!solicitudes.length) return '';

  const profs = getProfesionales();
  const profById = new Map(profs.map((p) => [p.id, p]));

  return `
    <div class="sol-table-wrap">
      <table class="sol-table">
        <thead>
          <tr>
            <th>ID Solicitud</th>
            <th>Proyecto / Cliente</th>
            <th>Rol/Perfil</th>
            <th>RP Solicitante</th>
            <th>Fecha</th>
            <th>Candidatos propuestos</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${solicitudes
            .map((s) => {
              const conflicto = conflictosBySolicitudId?.get?.(s.id);
              const tieneConflicto = Boolean(conflicto && conflicto.estado === 'Abierto');
              const estadoBadge = tieneConflicto ? renderBadgeConflicto() : renderBadgeEstado({ estado: s.estado });

              const esAccionable = !tieneConflicto && esSolicitudEstadoAccionable(s.estado);

              const acciones = tieneConflicto
                ? `
                  <div class="sol-row-actions">
                    <button type="button" class="btn btn--danger btn--sm" data-action="gdd-resolver-conflicto" data-conflicto-id="${conflicto.id}" data-solicitud-id="${s.id}">
                      ✗ Resolver
                    </button>
                    <div class="sol-dropdown" data-dropdown="row-${s.id}">
                      <button type="button" class="sol-icon-btn" aria-label="Más acciones" data-action="toggle-row-menu" data-row-menu="${s.id}">
                        ⋯
                      </button>
                      <div class="sol-dropdown__menu" hidden>
                        <button type="button" class="sol-dropdown__item" data-action="ver-detalle" data-id="${s.id}">
                          Ver detalle
                        </button>
                      </div>
                    </div>
                  </div>
                `
                : esAccionable
                  ? `
                  <div class="sol-row-actions">
                    <button type="button" class="btn btn--primary btn--sm" data-action="gdd-aprobar" data-id="${s.id}">
                      ✓ Aprobar
                    </button>
                    <button type="button" class="btn btn--danger btn--sm" data-action="gdd-rechazar" data-id="${s.id}">
                      ✗ Rechazar
                    </button>
                  </div>
                  `
                  : `
                  <div class="sol-row-actions">
                    <div class="sol-dropdown" data-dropdown="row-${s.id}">
                      <button type="button" class="sol-icon-btn" aria-label="Más acciones" data-action="toggle-row-menu" data-row-menu="${s.id}">
                        ⋯
                      </button>
                      <div class="sol-dropdown__menu" hidden>
                        <button type="button" class="sol-dropdown__item" data-action="ver-detalle" data-id="${s.id}">
                          Ver detalle
                        </button>
                      </div>
                    </div>
                  </div>
                  `;

              return `
              <tr>
                <td><span class="sol-table__id">${s.id}</span></td>
                <td>${s.proyecto ?? '—'} / ${s.cliente ?? '—'}</td>
                <td>${s.rolSolicitado ?? '—'}</td>
                <td>${getNombreRp(s.rpResponsableId)}</td>
                <td>${formatFecha(s.fechaSolicitud)}</td>
                <td>${(s.candidatosPropuestos ?? []).length}</td>
                <td>${estadoBadge}</td>
                <td>${acciones}</td>
              </tr>
            `;
            })
            .join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderGddIndicadoresGenerales({
  pctDisponibilidad,
  disponibles,
  asignados,
  noDisponibles,
  totalProf,
  distrib,
}) {
  return `
    <aside class="sol-gdd-aside">
      <div class="sol-gdd-aside__head">
        <h2 class="sol-gdd-aside__title">Indicadores generales</h2>
        <div class="sol-gdd-period">
          <span>Este mes</span>
          <i class="fa-solid fa-chevron-down" aria-hidden="true"></i>
        </div>
      </div>

      <div class="sol-gdd-aside__block">
        <h3 class="sol-gdd-aside__block-title">% Disponibilidad global</h3>
        ${renderMiniDonutDisponibilidad(pctDisponibilidad)}
        <p class="sol-gdd-aside__meta">
          ${pctDisponibilidad}% · ${disponibles}/${totalProf} profesionales
        </p>
        <div class="sol-gdd-aside__breakdown">
          <div><strong>Disponibles</strong>: ${disponibles}</div>
          <div><strong>Asignados</strong>: ${asignados}</div>
          <div><strong>No disponibles</strong>: ${noDisponibles}</div>
        </div>
      </div>

      <div class="sol-gdd-aside__block">
        <h3 class="sol-gdd-aside__block-title">Distribución por estado</h3>
        <ul class="sol-gdd-aside__states">
          <li><span>Pendientes de validar</span><strong>${distrib.pendientesValidar}</strong></li>
          <li><span>Pendientes de aprobación</span><strong>${distrib.pendientesAprobacion}</strong></li>
          <li><span>Aprobadas</span><strong>${distrib.aprobadas}</strong></li>
          <li><span>Rechazadas</span><strong>${distrib.rechazadas}</strong></li>
          <li><span>Finalizadas</span><strong>${distrib.finalizadas}</strong></li>
        </ul>
      </div>
    </aside>
  `;
}

function renderSolicitudesGdd(container, ctx) {
  const usuarioActivo = ctx.usuarioActivo ?? getUsuarioActivo();
  const solicitudes = getSolicitudes();
  const profesionales = getProfesionales();
  const conflictos = getConflictos();

  const conflictosBySolicitudId = getConflictoAbiertoPorSolicitudId(conflictos);
  const conflictosAbiertosCount = conflictos.filter((c) => c.estado === 'Abierto').length;

  const hoy = getHoyISO();
  const { startISO, endISO } = getMesActualRango();

  const pendientesValidar = solicitudes.filter((s) => s.estado === 'Pendiente').length;
  const pendientesAprobacion = solicitudes.filter((s) => s.estado === 'En entrevista').length;
  const aprobadasHoy = solicitudes.filter((s) => {
    if (s.estado !== 'Aprobada') return false;
    const historico = s.historico ?? [];
    for (let i = historico.length - 1; i >= 0; i--) {
      const ev = historico[i];
      const evento = String(ev?.evento ?? '').toLowerCase();
      if (evento.includes('aprobad')) return ev?.fecha === hoy;
    }
    return false;
  }).length;

  const profesionalesAsignados = profesionales.reduce((acc, p) => {
    const hist = p.historicoEstados ?? [];
    return (
      acc +
      hist.filter((h) => h.estado === 'Asignado' && h.fecha && h.fecha >= startISO && h.fecha <= endISO).length
    );
  }, 0);

  const disponibles = profesionales.filter((p) => p.estado === 'Disponible').length;
  const asignados = profesionales.filter((p) => p.estado === 'Asignado').length;
  const totalProf = profesionales.length || 1;
  const pctDisponibilidad = Math.round((disponibles / totalProf) * 100);
  const noDisponibles = Math.max(0, profesionales.length - disponibles - asignados);

  const distrib = {
    pendientesValidar: pendientesValidar,
    pendientesAprobacion: pendientesAprobacion,
    aprobadas: solicitudes.filter((s) => s.estado === 'Aprobada').length,
    rechazadas: solicitudes.filter((s) => s.estado === 'Rechazada').length,
    finalizadas: solicitudes.filter((s) => s.estado === 'Finalizada').length,
  };

  const tabActivo = getTabGddActivo(ctx.query ?? {});
  const q = (ctx.query?.q ?? '').trim();
  const proyecto = ctx.query?.proyecto ?? '';
  const rpSolicitanteId = ctx.query?.rpSolicitanteId ?? '';
  const fechaDesde = ctx.query?.fechaDesde ?? '';
  const fechaHasta = ctx.query?.fechaHasta ?? '';

  // Filtros (incluye tab como filtro base).
  const filtradas = ordenarSolicitudesGddPorFechaDesc(
    filtrarSolicitudesGdd(solicitudes, { tab: tabActivo, q, proyecto, rpSolicitanteId, fechaDesde, fechaHasta }, {
      conflictosBySolicitudId,
    })
  );

  const pageSize = 5;
  const total = filtradas.length;
  const visible = filtradas.slice(0, pageSize);
  const desde = total ? 1 : 0;
  const hasta = total ? Math.min(pageSize, total) : 0;

  const proyectosUnicos = [...new Set(solicitudes.map((s) => s.proyecto).filter(Boolean))].sort();
  const rpUnicos = [...new Set(solicitudes.map((s) => s.rpResponsableId).filter(Boolean))].sort();

  const filtersPanel = `
    <div class="sol-gdd-filtros">
      <div class="sol-gdd-filtros__grid">
        <label class="sol-gdd-field">
          <span class="sol-gdd-field__label">Proyecto</span>
          <select class="sol-gdd-field__input" name="proyecto">
            <option value="">Todos</option>
            ${proyectosUnicos.map((p) => `<option value="${p}" ${p === proyecto ? 'selected' : ''}>${p}</option>`).join('')}
          </select>
        </label>
        <label class="sol-gdd-field">
          <span class="sol-gdd-field__label">RP solicitante</span>
          <select class="sol-gdd-field__input" name="rpSolicitanteId">
            <option value="">Todos</option>
            ${rpUnicos.map((id) => `<option value="${id}" ${id === rpSolicitanteId ? 'selected' : ''}>${getNombreRp(id)}</option>`).join('')}
          </select>
        </label>
        <label class="sol-gdd-field">
          <span class="sol-gdd-field__label">Fecha desde</span>
          <input class="sol-gdd-field__input" type="date" name="fechaDesde" value="${fechaDesde}" />
        </label>
        <label class="sol-gdd-field">
          <span class="sol-gdd-field__label">Fecha hasta</span>
          <input class="sol-gdd-field__input" type="date" name="fechaHasta" value="${fechaHasta}" />
        </label>
      </div>
      <div class="sol-gdd-filtros__actions">
        <button type="button" class="btn btn--primary" data-action="aplicar-filtros">Aplicar</button>
        <button type="button" class="btn" data-action="limpiar-filtros">Limpiar</button>
      </div>
    </div>
  `;

  container.innerHTML = `
    <section class="sol-gdd">
      <header class="sol__header sol__header--actions">
        <div class="sol__intro">
          <h1 class="sol__title">Gestión de Solicitudes</h1>
          <p class="sol__subtitle">Valida y supervisa todas las solicitudes de la organización.</p>
        </div>
        <div class="sol__actions">
          <button type="button" class="btn" data-action="exportar-csv">Exportar</button>
          <a class="btn" href="#/informes?vista=capacidad">Panel de capacidad</a>
        </div>
      </header>

      <div class="sol-gdd-layout">
        <div class="sol-gdd-main">
          <div class="sol-gdd-cards">
            <div class="sol-cards sol-cards--gdd">
              ${renderCardResumen('Pendientes de validar', pendientesValidar, 'solicitudes')}
              ${renderCardResumen('Pendientes de aprobación', pendientesAprobacion, 'solicitudes')}
              ${renderCardResumen('Conflictos', conflictosAbiertosCount, 'solicitudes')}
              ${renderCardResumen('Aprobadas hoy', aprobadasHoy, 'solicitudes')}
              ${renderCardResumen('Profesionales asignados', profesionalesAsignados, 'este mes')}
            </div>
          </div>

          <div class="sol-gdd-toolbar">
            <form class="sol-gdd-search" data-action="buscar" autocomplete="off">
              <input
                class="sol-gdd-search__input"
                type="search"
                name="q"
                placeholder="Buscar solicitud, proyecto, rol..."
                value="${q}"
              />
            </form>
            <div class="sol-dropdown" data-dropdown="filtros">
              <button type="button" class="btn" data-action="toggle-filtros">
                Filtros <i class="fa-solid fa-chevron-down" aria-hidden="true"></i>
              </button>
              <div class="sol-dropdown__menu" hidden>
                ${filtersPanel}
              </div>
            </div>
          </div>

          ${renderTabsEstadoGdd(tabActivo)}

          <div class="sol-tabpanel" role="tabpanel">
            ${total === 0 ? `<p class="sol-empty">No hay solicitudes para mostrar</p>` : renderTablaSolicitudesGdd(visible, conflictosBySolicitudId)}
          </div>

          <p class="sol-footer">
            Mostrando ${desde} a ${hasta} de ${total} solicitud${total === 1 ? '' : 'es'}
          </p>
        </div>

        ${renderGddIndicadoresGenerales({
          pctDisponibilidad,
          disponibles,
          asignados,
          noDisponibles,
          totalProf,
          distrib,
        })}
      </div>
    </section>
  `;

  wireGdd(container, ctx, {
    rerender: () => renderSolicitudesGdd(container, ctx),
    getFiltradas: () =>
      ordenarSolicitudesGddPorFechaDesc(
        filtrarSolicitudesGdd(solicitudes, { tab: tabActivo, q, proyecto, rpSolicitanteId, fechaDesde, fechaHasta }, { conflictosBySolicitudId })
      ),
    conflictosBySolicitudId,
    conflictos,
    solicitudes,
    usuarioActivo,
    pageSize,
    visible,
  });
}

function renderTabsEstadoGdd(tabActivo) {
  const tabs = tabActivo && GDD_TABS.some((t) => t.id === tabActivo) ? GDD_TABS : GDD_TABS;
  return `
    <div class="sol-tabs" role="tablist">
      ${tabs
        .map((tab) => {
          const active = tabActivo === tab.id;
          return `
          <button
            type="button"
            class="sol-tabs__btn ${active ? 'sol-tabs__btn--active' : ''}"
            role="tab"
            aria-selected="${active}"
            data-action="cambiar-tab-gdd"
            data-tab="${tab.id}"
          >
            ${tab.label}
          </button>
        `;
        })
        .join('')}
    </div>
  `;
}

function wireGdd(root, ctx, {
  rerender,
  getFiltradas,
  conflictosBySolicitudId,
  conflictos,
  solicitudes,
  usuarioActivo,
} = {}) {
  // Dropdown filtros
  root.querySelector('[data-action="toggle-filtros"]')?.addEventListener('click', (e) => {
    e.stopPropagation();
    const menu = root.querySelector('[data-dropdown="filtros"] .sol-dropdown__menu');
    if (!menu) return;
    menu.hidden = !menu.hidden;
  });

  if (!root.dataset.gddDropdownFiltrosWired) {
    root.dataset.gddDropdownFiltrosWired = '1';
    root.addEventListener('click', (e) => {
      const inside = e.target.closest('[data-dropdown="filtros"]');
      if (!inside) {
        root.querySelector('[data-dropdown="filtros"] .sol-dropdown__menu')?.setAttribute('hidden', '');
      }
    });
  }

  root.querySelector('[data-action="exportar-csv"]')?.addEventListener('click', () => {
    const lista = getFiltradas?.() ?? [];
    const estadosPorSolicitud = conflictosBySolicitudId ?? new Map();
    const headers = [
      'ID Solicitud',
      'Proyecto',
      'Cliente',
      'Rol/Perfil',
      'RP Solicitante',
      'Fecha solicitud',
      'Candidatos propuestos',
      'Estado',
    ];
    const rows = lista.map((s) => {
      const conflicto = estadosPorSolicitud.get(s.id);
      const estadoTxt = conflicto && conflicto.estado === 'Abierto' ? 'Conflicto' : s.estado;
      return [
        s.id ?? '',
        s.proyecto ?? '',
        s.cliente ?? '',
        s.rolSolicitado ?? '',
        getNombreRp(s.rpResponsableId),
        s.fechaSolicitud ?? '',
        (s.candidatosPropuestos ?? []).length,
        estadoTxt ?? '',
      ];
    });

    const escape = (v) => `"${String(v).replace(/"/g, '""')}"`;
    const csv = [headers, ...rows].map((row) => row.map(escape).join(',')).join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `solicitudes-gdd-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  });

  root.querySelector('[data-action="buscar"]')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const form = e.target;
    const qVal = new FormData(form).get('q');
    const next = {
      ...ctx.query,
      q: qVal ? String(qVal) : '',
    };
    // Mantener tab
    if (!next.tab) next.tab = getTabGddActivo(ctx.query ?? {});
    window.location.hash = buildSolicitudesHash(next);
  });

  root.querySelectorAll('[data-action="cambiar-tab-gdd"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const next = { ...ctx.query, tab: btn.dataset.tab };
      window.location.hash = buildSolicitudesHash(next);
    });
  });

  root.querySelector('[data-action="aplicar-filtros"]')?.addEventListener('click', () => {
    const menu = root.querySelector('[data-dropdown="filtros"] .sol-dropdown__menu');
    const panel = menu?.querySelector('.sol-gdd-filtros');
    const proyecto = panel?.querySelector('select[name="proyecto"]')?.value ?? '';
    const rpSolicitanteId = panel?.querySelector('select[name="rpSolicitanteId"]')?.value ?? '';
    const fechaDesde = panel?.querySelector('input[name="fechaDesde"]')?.value ?? '';
    const fechaHasta = panel?.querySelector('input[name="fechaHasta"]')?.value ?? '';
    const next = {
      ...ctx.query,
      proyecto,
      rpSolicitanteId,
      fechaDesde,
      fechaHasta,
    };
    window.location.hash = buildSolicitudesHash(next);
  });

  root.querySelector('[data-action="limpiar-filtros"]')?.addEventListener('click', () => {
    const next = { ...ctx.query, proyecto: '', rpSolicitanteId: '', fechaDesde: '', fechaHasta: '' };
    window.location.hash = buildSolicitudesHash(next);
  });

  root.querySelectorAll('[data-action="gdd-aprobar"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      aprovarSolicitudGdd(btn.dataset.id, usuarioActivo);
      rerender();
    });
  });

  root.querySelectorAll('[data-action="gdd-rechazar"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      rechazarSolicitudGdd(btn.dataset.id, usuarioActivo);
      rerender();
    });
  });

  root.querySelectorAll('[data-action="gdd-resolver-conflicto"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const conflictoId = btn.dataset.conflictoId;
      const conflicto = (conflictos ?? []).find((c) => c.id === conflictoId);
      if (!conflicto) return;
          const ids = conflicto.solicitudesEnConflicto ?? [];
          const solicitudesImplicadas = ids.map((id) => (solicitudes ?? []).find((s) => s.id === id)).filter(Boolean);

      root.querySelector('[data-modal]')?.remove();
      root.insertAdjacentHTML(
        'beforeend',
        renderModalResolverConflicto(conflicto, solicitudesImplicadas, { profById: null })
      );

      root.querySelectorAll('[data-action="cerrar-modal"]').forEach((el) => {
        el.addEventListener('click', () => root.querySelector('[data-modal]')?.remove());
      });

      root.querySelectorAll('[data-action="asignar-a-esta"]').forEach((pick) => {
        pick.addEventListener('click', () => {
          const winnerId = pick.dataset.solicitudId;
          // Cascada: aprobar ganador -> luego rechazar implicadas para evitar liberar el profesional.
          const ids = conflicto.solicitudesEnConflicto ?? [];
          if (ids.includes(winnerId)) {
            aprovarSolicitudGdd(winnerId, usuarioActivo);
            for (const sId of ids) {
              if (sId !== winnerId) rechazarSolicitudGdd(sId, usuarioActivo);
            }
          }
          actualizarConflicto(conflictoId, (c) => ({ ...c, estado: 'Resuelto' }));
          root.querySelector('[data-modal]')?.remove();
          rerender();
        });
      });
    });
  });

  root.querySelectorAll('[data-action="ver-detalle"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      window.location.hash = `#/solicitudes/${btn.dataset.id}`;
    });
  });

  // Menú ⋯ filas
  root.querySelectorAll('[data-action="toggle-row-menu"]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const wrapper = btn.closest('.sol-dropdown');
      const menu = wrapper?.querySelector('.sol-dropdown__menu');
      if (!menu) return;
      menu.hidden = !menu.hidden;
    });
  });

  if (!root.dataset.gddRowMenusWired) {
    root.dataset.gddRowMenusWired = '1';
    root.addEventListener('click', (e) => {
      if (e.target.closest('[data-action="toggle-row-menu"]')) return;
      root.querySelectorAll('.sol-dropdown__menu').forEach((m) => {
        // No ocultar el panel actual si es el de filtros
        if (m.closest('[data-dropdown="filtros"]')) return;
        m.hidden = true;
      });
    });
  }
}

function renderSolicitudesStub(container, usuarioActivo) {
  container.innerHTML = `
    <section class="sol">
      <header class="sol__header">
        <h1 class="sol__title">Solicitudes</h1>
        <p class="sol__subtitle">
          Vista para el rol <strong>${usuarioActivo?.rolKey ?? '-'}</strong> — pendiente en tareas posteriores.
        </p>
      </header>
    </section>
  `;
}

export function renderSolicitudesView(container, ctx) {
  const usuarioActivo = ctx?.usuarioActivo ?? getUsuarioActivo();
  const path = parseSolicitudesPath();

  if (path.mode === 'nueva') {
    container.innerHTML = renderFormularioStub(
      'Nueva solicitud',
      'Formulario de creación — disponible en una tarea posterior.'
    );
    return;
  }

  if (path.mode === 'editar') {
    container.innerHTML = renderFormularioStub(
      'Editar solicitud',
      `Edición de <strong>${path.id}</strong> — disponible en una tarea posterior.`
    );
    return;
  }

  if (path.mode === 'detalle') {
    container.innerHTML = renderFormularioStub(
      'Detalle de solicitud',
      `Vista de detalle para <strong>${path.id}</strong> — disponible en una tarea posterior.`
    );
    return;
  }

  if (usuarioActivo?.rolKey === 'PROFESIONAL') {
    renderSolicitudesProfesional(container, ctx);
    return;
  }

  if (usuarioActivo?.rolKey === 'GDD') {
    try {
      renderSolicitudesGdd(container, ctx);
    } catch (err) {
      console.error('Error renderizando Solicitudes (GDD):', err);
      container.innerHTML = `
        <section class="sol">
          <h1 class="sol__title">Gestión de Solicitudes</h1>
          <p class="sol__subtitle">
            No se pudo renderizar la vista GDD. Revisa la consola. Error: <strong>${err?.message ?? err}</strong>
          </p>
        </section>
      `;
    }
    return;
  }

  if (ROLES_SOLICITUDES_RP_KCM.includes(usuarioActivo?.rolKey)) {
    renderSolicitudesRpKcm(container, ctx);
    return;
  }

  renderSolicitudesStub(container, usuarioActivo);
}
