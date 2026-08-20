import {
  getCompromisos,
  getConflictos,
  getHistoricoDisponibilidad,
  getIntegraciones,
  getLogs,
  getProfesionales,
  getSolicitudes,
  getSolicitudesActualizacion,
  getUsuarioActivo,
  getUsuarios,
} from '../state.js';
import { labelEstadoSolicitud, labelNivelLog, renderBadgeEstado } from '../components/badge-estado.js';
import { getNombreRp } from '../data/catalogo-rp.js';
import { normalizarRolKey } from '../permisos/permisos.js';
import {
  agregarSolicitudesPorEstado,
  countPendientesPorResponsable,
  countRecursosAsignados,
  countSolicitudesActivasPorRp,
  getSolicitudesPorRp,
  getSolicitudesRecientes,
  rankingProyectosAprobados,
} from '../utils/solicitudes-helpers.js';

const ESTADOS_CERRADOS = new Set(['Finalizada', 'Rechazada']);

const DONUT_ESTADOS = [
  {
    key: 'Pendiente',
    label: 'Pendiente de aprobación',
    color: 'var(--ayesa-naranja)',
  },
  {
    key: 'En entrevista',
    label: 'En entrevista',
    color: 'var(--ayesa-azul-cielo)',
  },
  {
    key: 'Aprobada',
    label: 'Aprobadas',
    color: 'var(--ayesa-turquesa)',
  },
  {
    key: 'Rechazada',
    label: 'Rechazadas',
    color: 'var(--ayesa-magenta)',
  },
  {
    key: 'Cancelada',
    label: 'Canceladas',
    color: 'var(--color-estado-no-disponible)',
  },
];

const NIVEL_BARRA = {
  Básico: 33,
  Intermedio: 66,
  Avanzado: 100,
};

const ESTADO_DOT = {
  Disponible: 'var(--color-estado-disponible)',
  Solicitado: 'var(--color-estado-solicitado)',
  Reservado: 'var(--color-estado-reservado)',
  Asignado: 'var(--color-estado-asignado)',
  'No disponible': 'var(--color-estado-no-disponible)',
};

function formatFecha(iso) {
  if (!iso) return '—';
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatFechaCorta(iso) {
  if (!iso) return '—';
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function isSameMonth(iso, ref = new Date()) {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return false;
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
}

function resolveProfesional(usuarioActivo, profesionales) {
  if (usuarioActivo?.profesionalId) {
    return profesionales.find((p) => p.id === usuarioActivo.profesionalId) ?? null;
  }
  return profesionales.find((p) => p.nombre === usuarioActivo?.nombre) ?? null;
}

function getIncorporacionesRp(profesionales, solicitudes, rpId, { mesActual = false, limit = null } = {}) {
  const misSolicitudIds = new Set(getSolicitudesPorRp(solicitudes, rpId).map((s) => s.id));
  const items = [];

  for (const profesional of profesionales) {
    for (const h of profesional.historicoEstados ?? []) {
      if (h.estado !== 'Asignado') continue;

      const perteneceAlRp =
        (h.solicitudId && misSolicitudIds.has(h.solicitudId)) ||
        (!h.solicitudId && h.rpResponsableId === rpId);

      if (!perteneceAlRp) continue;
      if (mesActual && !isSameMonth(h.fecha)) continue;

      items.push({
        profesionalId: profesional.id,
        nombre: profesional.nombre,
        rol: profesional.rol,
        fecha: h.fecha,
        solicitudId: h.solicitudId ?? null,
      });
    }
  }

  items.sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
  return limit == null ? items : items.slice(0, limit);
}

function renderStubLink(label) {
  return `
    <span class="inicio-link inicio-link--stub" aria-disabled="true" role="link">
      ${label}
    </span>
  `;
}

function renderNavLink(href, label) {
  return `
    <a class="inicio-link" href="${href}">
      ${label}
    </a>
  `;
}

function renderCardDisponibilidad(profesional) {
  const estado = profesional.estado ?? '—';
  const pct = profesional.disponibilidad?.porcentaje ?? 0;
  const desde = profesional.disponibilidad?.desde;
  const dotColor = ESTADO_DOT[estado] ?? 'var(--color-muted)';

  const metric =
    pct === 0
      ? `<p class="inicio-card__metric-text">Sin disponibilidad — proyecto en curso</p>`
      : `<p class="inicio-card__metric">${pct}%</p>`;

  return `
    <article class="inicio-card">
      <h3 class="inicio-card__title">Mi disponibilidad</h3>
      <div class="inicio-card__estado">
        <span class="inicio-dot" style="background:${dotColor}" aria-hidden="true"></span>
        <span>${estado}</span>
      </div>
      ${metric}
      <p class="inicio-card__meta">Desde ${formatFecha(desde)}</p>
      ${renderStubLink('Ver calendario ›')}
    </article>
  `;
}

function renderCardCv(profesional) {
  const requiere = Boolean(profesional.cv?.requiereActualizacion);
  const badge = requiere
    ? renderBadgeEstado({ estado: 'Pendiente', variante: 'aviso' })
    : renderBadgeEstado({ estado: 'Actualizado', variante: 'exito' });

  return `
    <article class="inicio-card">
      <h3 class="inicio-card__title">Estado de mi CV</h3>
      <div class="inicio-card__row">
        <i class="fa-solid fa-file-lines inicio-card__icon" aria-hidden="true"></i>
        ${badge}
      </div>
      <p class="inicio-card__meta">Actualizado: ${formatFecha(profesional.cv?.actualizado)}</p>
      ${renderNavLink('#/mi-perfil', 'Ver mi perfil ›')}
    </article>
  `;
}

function renderCardActualizaciones(countPendientes) {
  const body =
    countPendientes === 0
      ? `<p class="inicio-card__metric-text">Todo al día</p>`
      : `
        <p class="inicio-card__metric">${countPendientes}</p>
        <p class="inicio-card__meta">pendiente${countPendientes === 1 ? '' : 's'} de revisar</p>
      `;

  return `
    <article class="inicio-card">
      <h3 class="inicio-card__title">Solicitudes de actualización</h3>
      ${body}
      ${renderNavLink('#/solicitudes', 'Ver solicitudes ›')}
    </article>
  `;
}

function renderCardProcesos(countAbiertos) {
  return `
    <article class="inicio-card">
      <h3 class="inicio-card__title">Mis procesos abiertos</h3>
      <p class="inicio-card__metric">${countAbiertos}</p>
      <p class="inicio-card__meta">procesos activos</p>
      ${renderNavLink('#/solicitudes?vista=procesos', 'Ver procesos ›')}
    </article>
  `;
}

function iconoCompromiso(tipo) {
  return tipo === 'Formación' ? 'fa-graduation-cap' : 'fa-briefcase';
}

function renderCompromisos(compromisos) {
  if (!compromisos.length) {
    return `
      <div class="inicio-empty">
        No tienes compromisos próximos
      </div>
    `;
  }

  return `
    <ul class="inicio-list">
      ${compromisos
        .map(
          (c) => `
        <li class="inicio-list__item">
          <div class="inicio-list__icon" aria-hidden="true">
            <i class="fa-solid ${iconoCompromiso(c.tipo)}"></i>
          </div>
          <div class="inicio-list__body">
            <div class="inicio-list__title">${c.titulo}</div>
            <div class="inicio-list__detail">${c.detalle}</div>
          </div>
          <div class="inicio-list__aside">
            ${renderBadgeEstado({ estado: c.estadoBadge })}
            <time class="inicio-list__date" datetime="${c.fecha}">${formatFecha(c.fecha)}</time>
          </div>
        </li>
      `
        )
        .join('')}
    </ul>
  `;
}

function renderSkills(skills) {
  const top = (skills ?? []).slice(0, 5);
  if (!top.length) {
    return `<div class="inicio-empty">Aún no hay habilidades registradas</div>`;
  }

  return `
    <ul class="inicio-skills">
      ${top
        .map((s) => {
          const pct = NIVEL_BARRA[s.nivel] ?? 40;
          return `
            <li class="inicio-skill">
              <div class="inicio-skill__head">
                <span class="inicio-skill__name">${s.nombre}</span>
                <span class="inicio-skill__nivel">${s.nivel}</span>
              </div>
              <div class="inicio-skill__track" aria-hidden="true">
                <span class="inicio-skill__fill inicio-skill__fill--${(s.nivel || '').toLowerCase()}" style="width:${pct}%"></span>
              </div>
            </li>
          `;
        })
        .join('')}
    </ul>
  `;
}

function renderCardBusquedaRapida() {
  return `
    <article class="inicio-card inicio-card--search">
      <h3 class="inicio-card__title">Búsqueda rápida de profesionales</h3>
      <form class="inicio-search" data-action="busqueda-rapida">
        <input
          class="inicio-search__input"
          type="search"
          name="q"
          placeholder="Buscar por habilidad, tecnología, rol..."
          autocomplete="off"
        />
        <button class="btn btn--primary inicio-search__btn" type="submit">Buscar</button>
      </form>
      <div class="inicio-card__links">
        <a class="inicio-link" href="#/bolsa-profesionales?modo=avanzado">Búsqueda avanzada ›</a>
        <a class="inicio-link" href="#/bolsa-profesionales?modo=chat">Buscar con IA (RAG) ›</a>
      </div>
    </article>
  `;
}

function renderCardMisSolicitudes(countActivas) {
  const body =
    countActivas === 0
      ? `<p class="inicio-card__metric-text">Sin solicitudes activas</p>`
      : `
        <p class="inicio-card__metric">${countActivas}</p>
        <p class="inicio-card__meta">activas</p>
      `;

  return `
    <article class="inicio-card">
      <h3 class="inicio-card__title">Mis solicitudes</h3>
      ${body}
      ${renderNavLink('#/solicitudes', 'Ver todas ›')}
    </article>
  `;
}

function renderCardPendientesAprobacion(countPendientes) {
  const body =
    countPendientes === 0
      ? `<p class="inicio-card__metric-text">Nada pendiente</p>`
      : `
        <p class="inicio-card__metric">${countPendientes}</p>
        <p class="inicio-card__meta">solicitudes</p>
      `;

  return `
    <article class="inicio-card">
      <h3 class="inicio-card__title">Pendientes de aprobación</h3>
      ${body}
      ${renderNavLink('#/solicitudes?estado=pendiente', 'Ver pendientes ›')}
    </article>
  `;
}

function renderCardRecursosIncorporados(countMes) {
  return `
    <article class="inicio-card">
      <h3 class="inicio-card__title">Recursos incorporados</h3>
      <p class="inicio-card__metric">${countMes}</p>
      <p class="inicio-card__meta">este mes</p>
      ${renderNavLink('#/solicitudes?vista=incorporados', 'Ver incorporados ›')}
    </article>
  `;
}

function renderTablaSolicitudesRecientes(solicitudes) {
  if (!solicitudes.length) {
    return `<div class="inicio-empty">No hay solicitudes recientes</div>`;
  }

  return `
    <div class="inicio-table-wrap">
      <table class="inicio-table">
        <thead>
          <tr>
            <th>Rol solicitado</th>
            <th>Proyecto</th>
            <th>Estado</th>
            <th>Fecha</th>
          </tr>
        </thead>
        <tbody>
          ${solicitudes
            .map((s) => {
              const label = labelEstadoSolicitud(s.estado);
              return `
                <tr>
                  <td>${s.rolSolicitado ?? '—'}</td>
                  <td>${s.proyecto ?? '—'}</td>
                  <td>${renderBadgeEstado({ estado: label })}</td>
                  <td>${formatFechaCorta(s.fechaSolicitud)}</td>
                </tr>
              `;
            })
            .join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderListaIncorporados(items) {
  if (!items.length) {
    return `<div class="inicio-empty">No hay incorporaciones recientes</div>`;
  }

  return `
    <ul class="inicio-incorporados">
      ${items
        .map(
          (item) => `
        <li class="inicio-incorporados__item">
          <span class="inicio-incorporados__check" aria-hidden="true">
            <i class="fa-solid fa-circle-check"></i>
          </span>
          <div class="inicio-incorporados__body">
            <div class="inicio-incorporados__name">${item.nombre}</div>
            <div class="inicio-incorporados__role">${item.rol}</div>
          </div>
          <div class="inicio-incorporados__meta">
            Incorporado ${formatFechaCorta(item.fecha)}
          </div>
        </li>
      `
        )
        .join('')}
    </ul>
  `;
}

function wireBusquedaRapida(container) {
  const form = container.querySelector('[data-action="busqueda-rapida"]');
  if (!form) return;

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const q = new FormData(form).get('q')?.toString().trim() ?? '';
    window.location.hash = q
      ? `#/bolsa-profesionales?q=${encodeURIComponent(q)}`
      : '#/bolsa-profesionales';
  });
}

function renderInicioProfesional(container, usuarioActivo) {
  const profesionales = getProfesionales();
  const profesional = resolveProfesional(usuarioActivo, profesionales);

  if (!profesional) {
    container.innerHTML = `
      <section class="inicio">
        <h1 class="inicio__title">Hola, ${usuarioActivo?.nombre ?? 'profesional'}</h1>
        <p class="inicio__subtitle">No se encontró tu ficha profesional en los datos demo.</p>
      </section>
    `;
    return;
  }

  const solicitudesAct = getSolicitudesActualizacion().filter(
    (s) => s.profesionalId === profesional.id && s.estado === 'Pendiente'
  );
  const procesosAbiertos = getSolicitudes().filter(
    (s) => s.profesionalId === profesional.id && !ESTADOS_CERRADOS.has(s.estado)
  );
  const compromisos = getCompromisos().filter((c) => c.profesionalId === profesional.id);

  container.innerHTML = `
    <section class="inicio">
      <header class="inicio__header">
        <h1 class="inicio__title">Hola, ${usuarioActivo.nombre}</h1>
        <p class="inicio__subtitle">Aquí tienes un resumen de tu información y actividades.</p>
      </header>

      <div class="inicio-cards">
        ${renderCardDisponibilidad(profesional)}
        ${renderCardCv(profesional)}
        ${renderCardActualizaciones(solicitudesAct.length)}
        ${renderCardProcesos(procesosAbiertos.length)}
      </div>

      <div class="inicio-grid-2">
        <section class="inicio-block">
          <div class="inicio-block__head">
            <h2 class="inicio-block__title">Próximos compromisos</h2>
          </div>
          ${renderCompromisos(compromisos)}
          <div class="inicio-block__footer">
            ${renderNavLink('#/solicitudes?vista=procesos', 'Ver todos mis procesos ›')}
          </div>
        </section>

        <section class="inicio-block">
          <div class="inicio-block__head">
            <h2 class="inicio-block__title">Mis habilidades principales (Top 5)</h2>
          </div>
          ${renderSkills(profesional.skills)}
          <div class="inicio-block__footer">
            ${renderStubLink('Ver todas mis habilidades ›')}
          </div>
        </section>
      </div>
    </section>
  `;
}

function renderInicioRp(container, usuarioActivo) {
  const rpId = usuarioActivo.id;
  const profesionales = getProfesionales();
  const solicitudes = getSolicitudes();
  const mias = getSolicitudesPorRp(solicitudes, rpId);

  const activas = countSolicitudesActivasPorRp(solicitudes, rpId);
  const pendientes = countPendientesPorResponsable(solicitudes, rpId);
  const incorporacionesMes = getIncorporacionesRp(profesionales, solicitudes, rpId, {
    mesActual: true,
  });
  const recientes = getSolicitudesRecientes(mias, 4);
  const incorporadosRecientes = getIncorporacionesRp(profesionales, solicitudes, rpId, {
    mesActual: false,
    limit: 3,
  });

  container.innerHTML = `
    <section class="inicio">
      <header class="inicio__header">
        <h1 class="inicio__title">Hola, ${usuarioActivo.nombre} (RP)</h1>
        <p class="inicio__subtitle">Resumen de tu actividad y solicitudes.</p>
      </header>

      <div class="inicio-cards">
        ${renderCardBusquedaRapida()}
        ${renderCardMisSolicitudes(activas)}
        ${renderCardPendientesAprobacion(pendientes)}
        ${renderCardRecursosIncorporados(incorporacionesMes.length)}
      </div>

      <div class="inicio-grid-2">
        <section class="inicio-block">
          <div class="inicio-block__head">
            <h2 class="inicio-block__title">Solicitudes recientes</h2>
          </div>
          ${renderTablaSolicitudesRecientes(recientes)}
          <div class="inicio-block__footer">
            ${renderNavLink('#/solicitudes', 'Ver todas mis solicitudes ›')}
          </div>
        </section>

        <section class="inicio-block">
          <div class="inicio-block__head">
            <h2 class="inicio-block__title">Recursos incorporados recientemente</h2>
          </div>
          ${renderListaIncorporados(incorporadosRecientes)}
          <div class="inicio-block__footer">
            ${renderNavLink('#/solicitudes?vista=incorporados', 'Ver todos los recursos incorporados ›')}
          </div>
        </section>
      </div>
    </section>
  `;

  wireBusquedaRapida(container);
}

function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeDonutSlice(cx, cy, rOuter, rInner, startAngle, endAngle) {
  if (endAngle - startAngle >= 359.99) {
    // Casi círculo completo: dos semicírculos.
    const mid = startAngle + 180;
    return describeDonutSlice(cx, cy, rOuter, rInner, startAngle, mid)
      + ' '
      + describeDonutSlice(cx, cy, rOuter, rInner, mid, endAngle);
  }

  const large = endAngle - startAngle > 180 ? 1 : 0;
  const oStart = polarToCartesian(cx, cy, rOuter, endAngle);
  const oEnd = polarToCartesian(cx, cy, rOuter, startAngle);
  const iStart = polarToCartesian(cx, cy, rInner, startAngle);
  const iEnd = polarToCartesian(cx, cy, rInner, endAngle);

  return [
    `M ${oStart.x} ${oStart.y}`,
    `A ${rOuter} ${rOuter} 0 ${large} 0 ${oEnd.x} ${oEnd.y}`,
    `L ${iStart.x} ${iStart.y}`,
    `A ${rInner} ${rInner} 0 ${large} 1 ${iEnd.x} ${iEnd.y}`,
    'Z',
  ].join(' ');
}

function renderDonutSolicitudes(countsByEstado) {
  const segments = DONUT_ESTADOS.map((item) => ({
    ...item,
    count: countsByEstado[item.key] ?? 0,
  })).filter((s) => s.count > 0);

  const total = segments.reduce((acc, s) => acc + s.count, 0);

  if (total === 0) {
    return `<div class="inicio-empty">No hay solicitudes en tu ámbito</div>`;
  }

  const cx = 90;
  const cy = 90;
  const rOuter = 78;
  const rInner = 48;
  let angle = 0;

  const paths =
    segments.length === 1
      ? `<circle cx="${cx}" cy="${cy}" r="${(rOuter + rInner) / 2}" fill="none" stroke="${segments[0].color}" stroke-width="${rOuter - rInner}" />`
      : segments
          .map((s) => {
            const sweep = (s.count / total) * 360;
            const start = angle;
            const end = angle + sweep;
            angle = end;
            const d = describeDonutSlice(cx, cy, rOuter, rInner, start, end);
            return `<path d="${d}" fill="${s.color}"></path>`;
          })
          .join('');

  const legend = DONUT_ESTADOS.map((item) => {
    const count = countsByEstado[item.key] ?? 0;
    return `
      <li class="inicio-donut__legend-item">
        <span class="inicio-donut__swatch" style="background:${item.color}"></span>
        <span class="inicio-donut__legend-label">${item.label}</span>
        <span class="inicio-donut__legend-count">${count}</span>
      </li>
    `;
  }).join('');

  return `
    <div class="inicio-donut">
      <div class="inicio-donut__chart">
        <svg viewBox="0 0 180 180" width="180" height="180" role="img" aria-label="Distribución de solicitudes por estado">
          ${paths}
        </svg>
        <div class="inicio-donut__center">
          <div class="inicio-donut__total">${total}</div>
          <div class="inicio-donut__total-label">Total</div>
        </div>
      </div>
      <ul class="inicio-donut__legend">
        ${legend}
      </ul>
    </div>
  `;
}

function renderBarrasProyectos(ranking) {
  if (!ranking.length) {
    return `<div class="inicio-empty">No hay recursos asignados por proyecto</div>`;
  }

  const max = Math.max(...ranking.map((r) => r.count), 1);

  return `
    <ul class="inicio-bars">
      ${ranking
        .map(
          (row) => `
        <li class="inicio-bars__item">
          <div class="inicio-bars__label">
            <span>${row.proyecto}</span>
            <strong>${row.count}</strong>
          </div>
          <div class="inicio-bars__track">
            <span class="inicio-bars__fill" style="width:${(row.count / max) * 100}%"></span>
          </div>
        </li>
      `
        )
        .join('')}
    </ul>
  `;
}

function renderTablaEquipo(solicitudes) {
  if (!solicitudes.length) {
    return `<div class="inicio-empty">No hay solicitudes recientes de tu equipo</div>`;
  }

  return `
    <div class="inicio-table-wrap">
      <table class="inicio-table">
        <thead>
          <tr>
            <th>Solicitud</th>
            <th>Responsable</th>
            <th>Fecha</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          ${solicitudes
            .map((s) => {
              const label = labelEstadoSolicitud(s.estado);
              return `
                <tr>
                  <td>${s.rolSolicitado ?? '—'}</td>
                  <td>${getNombreRp(s.rpResponsableId)}</td>
                  <td>${formatFechaCorta(s.fechaSolicitud)}</td>
                  <td>${renderBadgeEstado({ estado: label })}</td>
                </tr>
              `;
            })
            .join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderMetricCard({ title, count, emptyText, meta, href, linkLabel }) {
  const body =
    count === 0
      ? `<p class="inicio-card__metric-text">${emptyText}</p>`
      : `
        <p class="inicio-card__metric">${count}</p>
        <p class="inicio-card__meta">${meta}</p>
      `;

  return `
    <article class="inicio-card">
      <h3 class="inicio-card__title">${title}</h3>
      ${body}
      ${renderNavLink(href, linkLabel)}
    </article>
  `;
}

function renderInicioGdd(container, usuarioActivo) {
  const profesionales = getProfesionales();
  const solicitudes = getSolicitudes();
  const conflictos = getConflictos();
  const historico = getHistoricoDisponibilidad();

  const pendientesSol = solicitudes.filter((s) => s.estado === 'Pendiente');
  const pendientesProf = profesionales.filter((p) => p.validacion?.estado === 'Pendiente');
  const conflictosAbiertos = conflictos.filter((c) => c.estado === 'Abierto');

  const disponibles = profesionales.filter((p) => p.estado === 'Disponible').length;
  const totalProf = profesionales.length || 1;
  const pctDisponibilidad = Math.round((disponibles / totalProf) * 100);

  const listaPendSol = getSolicitudesRecientes(pendientesSol, 3);
  const listaPendProf = [...pendientesProf]
    .sort((a, b) => String(b.validacion?.fecha ?? '').localeCompare(String(a.validacion?.fecha ?? '')))
    .slice(0, 3);

  const hace30 = new Date();
  hace30.setDate(hace30.getDate() - 30);
  const solUltimos30 = solicitudes.filter((s) => {
    const d = new Date(`${s.fechaSolicitud}T00:00:00`);
    return !Number.isNaN(d.getTime()) && d >= hace30;
  });
  const counts30 = agregarSolicitudesPorEstado(solUltimos30);

  const conflictosHref = conflictosAbiertos.length
    ? '#/conflictos'
    : 'javascript:void(0)';

  container.innerHTML = `
    <section class="inicio">
      <header class="inicio__header">
        <h1 class="inicio__title">Hola, ${usuarioActivo.nombre} (GDD)</h1>
        <p class="inicio__subtitle">Resumen general de la plataforma y validaciones pendientes.</p>
      </header>

      <div class="inicio-cards">
        ${renderMetricCard({
          title: 'Solicitudes pendientes de validar',
          count: pendientesSol.length,
          emptyText: 'Nada pendiente',
          meta: 'solicitudes',
          href: '#/solicitudes?estado=pendiente',
          linkLabel: 'Ver pendientes ›',
        })}
        ${renderMetricCard({
          title: 'Profesionales pendientes de validación',
          count: pendientesProf.length,
          emptyText: 'Nada pendiente',
          meta: 'profesionales',
          href: '#/validaciones',
          linkLabel: 'Ver pendientes ›',
        })}
        <article class="inicio-card">
          <h3 class="inicio-card__title">Conflictos entre solicitudes</h3>
          ${
            conflictosAbiertos.length === 0
              ? `<p class="inicio-card__metric-text">Sin conflictos abiertos</p>`
              : `
                <p class="inicio-card__metric">${conflictosAbiertos.length}</p>
                <p class="inicio-card__meta">conflictos</p>
              `
          }
          ${
            conflictosAbiertos.length
              ? renderNavLink(conflictosHref, 'Ver conflictos ›')
              : `<span class="inicio-link inicio-link--stub" aria-disabled="true">Ver conflictos ›</span>`
          }
        </article>
        <article class="inicio-card inicio-card--disponibilidad">
          <h3 class="inicio-card__title">% Disponibilidad global</h3>
          ${renderMiniDonutDisponibilidad(pctDisponibilidad)}
          <p class="inicio-card__meta inicio-card__meta--center">
            ${disponibles} / ${profesionales.length} profesionales
          </p>
        </article>
      </div>

      <div class="inicio-grid-2">
        <section class="inicio-block">
          <div class="inicio-block__head">
            <h2 class="inicio-block__title">Solicitudes pendientes de validar</h2>
          </div>
          ${renderListaSolicitudesPendientesGdd(listaPendSol)}
          <div class="inicio-block__footer">
            ${renderNavLink('#/solicitudes?estado=pendiente', 'Ver todas las pendientes ›')}
          </div>
        </section>

        <section class="inicio-block">
          <div class="inicio-block__head">
            <h2 class="inicio-block__title">Profesionales pendientes de validación</h2>
          </div>
          ${renderListaProfesionalesPendientesGdd(listaPendProf)}
          <div class="inicio-block__footer">
            ${renderNavLink('#/validaciones', 'Ver todos los pendientes ›')}
          </div>
        </section>
      </div>

      <div class="inicio-grid-2">
        <section class="inicio-block">
          <div class="inicio-block__head inicio-block__head--split">
            <h2 class="inicio-block__title">Evolución de disponibilidad (%)</h2>
            <span class="inicio-period-pill">Últimos 30 días</span>
          </div>
          ${renderLineaDisponibilidad(historico)}
        </section>

        <section class="inicio-block">
          <div class="inicio-block__head">
            <h2 class="inicio-block__title">Solicitudes por estado (últimos 30 días)</h2>
          </div>
          ${renderDonutSolicitudes(counts30)}
          <div class="inicio-block__footer">
            ${renderNavLink('#/solicitudes', 'Ver todas las solicitudes ›')}
          </div>
        </section>
      </div>
    </section>
  `;
}

function inicialesNombre(nombre = '') {
  const parts = String(nombre).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '--';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
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

function renderListaSolicitudesPendientesGdd(solicitudes) {
  if (!solicitudes.length) {
    return `<div class="inicio-empty">No hay solicitudes pendientes</div>`;
  }

  return `
    <ul class="inicio-list">
      ${solicitudes
        .map(
          (s) => `
        <li class="inicio-list__item inicio-list__item--gdd">
          <div class="inicio-list__body">
            <div class="inicio-list__title">${s.rolSolicitado ?? '—'}</div>
            <div class="inicio-list__detail">
              ${s.proyecto ?? '—'} · RP: ${getNombreRp(s.rpResponsableId)}
            </div>
          </div>
          <div class="inicio-list__aside">
            ${renderBadgeEstado({ estado: 'Pendiente' })}
            <time class="inicio-list__date" datetime="${s.fechaSolicitud}">${formatFechaCorta(s.fechaSolicitud)}</time>
          </div>
        </li>
      `
        )
        .join('')}
    </ul>
  `;
}

function renderListaProfesionalesPendientesGdd(profesionales) {
  if (!profesionales.length) {
    return `<div class="inicio-empty">No hay profesionales pendientes de validación</div>`;
  }

  return `
    <ul class="inicio-list">
      ${profesionales
        .map((p) => {
          const fecha = p.validacion?.fecha ?? p.cv?.actualizado;
          return `
            <li class="inicio-list__item inicio-list__item--gdd">
              <div class="inicio-list__avatar" aria-hidden="true">${inicialesNombre(p.nombre)}</div>
              <div class="inicio-list__body">
                <div class="inicio-list__title">${p.nombre}</div>
                <div class="inicio-list__detail">${p.rol ?? '—'}</div>
                <div class="inicio-list__detail">Actualizado: ${formatFechaCorta(fecha)}</div>
              </div>
              <div class="inicio-list__aside">
                ${renderBadgeEstado({ estado: 'Pendiente' })}
              </div>
            </li>
          `;
        })
        .join('')}
    </ul>
  `;
}

function renderLineaDisponibilidad(puntos = []) {
  if (!puntos.length) {
    return `<div class="inicio-empty">Sin histórico de disponibilidad</div>`;
  }

  if (puntos.length === 1) {
    return `
      <div class="inicio-line-fallback">
        <div class="inicio-line-fallback__value">${puntos[0].porcentaje}%</div>
        <div class="inicio-line-fallback__meta">Disponibilidad a ${formatFechaCorta(puntos[0].fecha)}</div>
      </div>
    `;
  }

  const width = 520;
  const height = 220;
  const padL = 40;
  const padR = 16;
  const padT = 16;
  const padB = 36;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;
  const yMax = 80;
  const yMin = 0;

  const xs = puntos.map((_, i) => padL + (i / (puntos.length - 1)) * plotW);
  const ys = puntos.map(
    (p) => padT + plotH - ((Math.min(p.porcentaje, yMax) - yMin) / (yMax - yMin)) * plotH
  );

  const polyline = xs.map((x, i) => `${x},${ys[i]}`).join(' ');
  const yTicks = [0, 20, 40, 60, 80];

  return `
    <div class="inicio-line-chart">
      <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Evolución de disponibilidad">
        ${yTicks
          .map((t) => {
            const y = padT + plotH - ((t - yMin) / (yMax - yMin)) * plotH;
            return `
              <line x1="${padL}" y1="${y}" x2="${width - padR}" y2="${y}" class="inicio-line-chart__grid" />
              <text x="${padL - 8}" y="${y + 4}" class="inicio-line-chart__tick" text-anchor="end">${t}%</text>
            `;
          })
          .join('')}
        <polyline points="${polyline}" class="inicio-line-chart__line" fill="none" />
        ${xs
          .map(
            (x, i) => `
          <circle cx="${x}" cy="${ys[i]}" r="4" class="inicio-line-chart__dot" />
          <text x="${x}" y="${height - 10}" class="inicio-line-chart__xlabel" text-anchor="middle">
            ${formatFechaCorta(puntos[i].fecha).slice(0, 5)}
          </text>
        `
          )
          .join('')}
      </svg>
    </div>
  `;
}

const ROL_DISTRIBUCION = [
  { key: 'PROFESIONAL', label: 'Profesional' },
  { key: 'RP', label: 'RP' },
  { key: 'GDD', label: 'GDD' },
  { key: 'ADMIN', label: 'Admin' },
];

function formatFechaHora(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function esLogReciente24h(fechaIso, ref = new Date('2026-08-05T12:00:00')) {
  const d = new Date(fechaIso);
  if (Number.isNaN(d.getTime())) return false;
  return ref.getTime() - d.getTime() <= 24 * 60 * 60 * 1000 && d <= ref;
}

function agregarUsuariosPorRol(usuarios = []) {
  const counts = Object.fromEntries(ROL_DISTRIBUCION.map((r) => [r.key, 0]));
  for (const u of usuarios) {
    const key = u.rol === 'GESTOR' ? 'ADMIN' : u.rol;
    if (key in counts) counts[key] += 1;
  }
  return ROL_DISTRIBUCION.map((r) => ({ ...r, count: counts[r.key] }));
}

function renderBarrasRoles(rows) {
  const max = Math.max(...rows.map((r) => r.count), 1);
  return `
    <ul class="inicio-bars">
      ${rows
        .map(
          (row) => `
        <li>
          <div class="inicio-bars__label">
            <span>${row.label}</span>
            <strong>${row.count}</strong>
          </div>
          <div class="inicio-bars__track">
            <span class="inicio-bars__fill" style="width:${(row.count / max) * 100}%"></span>
          </div>
        </li>
      `
        )
        .join('')}
    </ul>
  `;
}

function renderTablaLogsRecientes(logs) {
  if (!logs.length) {
    return `<div class="inicio-empty">Sin actividad reciente</div>`;
  }

  return `
    <div class="inicio-table-wrap">
      <table class="inicio-table">
        <thead>
          <tr>
            <th>Fecha/hora</th>
            <th>Usuario</th>
            <th>Acción</th>
            <th>Nivel</th>
          </tr>
        </thead>
        <tbody>
          ${logs
            .map((l) => {
              const label = labelNivelLog(l.nivel);
              return `
                <tr>
                  <td>${formatFechaHora(l.fecha)}</td>
                  <td>${l.usuario ?? '—'}</td>
                  <td>${l.accion ?? '—'}</td>
                  <td>${renderBadgeEstado({ estado: label })}</td>
                </tr>
              `;
            })
            .join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderListaIntegraciones(integraciones) {
  if (!integraciones.length) {
    return `<div class="inicio-empty">Sin integraciones configuradas</div>`;
  }

  return `
    <ul class="inicio-list">
      ${integraciones
        .map(
          (i) => `
        <li class="inicio-list__item inicio-list__item--gdd">
          <div class="inicio-list__body">
            <div class="inicio-list__title">${i.nombre}</div>
            <div class="inicio-list__detail">
              Última sincronización: ${formatFechaHora(i.ultimaSincronizacion)}
            </div>
          </div>
          <div class="inicio-list__aside">
            ${renderBadgeEstado({ estado: i.estado })}
          </div>
        </li>
      `
        )
        .join('')}
    </ul>
  `;
}

function renderAccesoRapidoAdmin() {
  return `
    <div class="inicio-quick">
      <a class="inicio-quick__card" href="#/admin/usuarios">
        <span class="inicio-quick__icon" aria-hidden="true"><i class="fa-solid fa-users"></i></span>
        <span class="inicio-quick__body">
          <span class="inicio-quick__title">Gestionar usuarios</span>
          <span class="inicio-quick__cta">Ir a usuarios ›</span>
        </span>
      </a>
      <a class="inicio-quick__card" href="#/admin/workflow">
        <span class="inicio-quick__icon" aria-hidden="true"><i class="fa-solid fa-gears"></i></span>
        <span class="inicio-quick__body">
          <span class="inicio-quick__title">Configurar workflow</span>
          <span class="inicio-quick__cta">Ir a workflow ›</span>
        </span>
      </a>
    </div>
  `;
}

function renderInicioAdmin(container, usuarioActivo) {
  const usuarios = getUsuarios();
  const logs = getLogs();
  const integraciones = getIntegraciones();

  const alertas24h = logs.filter(
    (l) => ['error', 'warning'].includes(String(l.nivel).toLowerCase()) && esLogReciente24h(l.fecha)
  ).length;
  const integracionesActivas = integraciones.filter((i) => i.estado === 'Activa').length;
  const distribucion = agregarUsuariosPorRol(usuarios);
  const logsRecientes = [...logs]
    .sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)))
    .slice(0, 5);

  container.innerHTML = `
    <section class="inicio">
      <header class="inicio__header">
        <h1 class="inicio__title">Hola, ${usuarioActivo.nombre} (Admin)</h1>
        <p class="inicio__subtitle">Panel de configuración y estado técnico de la plataforma.</p>
      </header>

      <div class="inicio-cards">
        ${renderMetricCard({
          title: 'Usuarios activos',
          count: usuarios.length,
          emptyText: 'Sin usuarios',
          meta: 'usuarios',
          href: '#/admin/usuarios',
          linkLabel: 'Gestionar usuarios ›',
        })}
        ${renderMetricCard({
          title: 'Alertas del sistema',
          count: alertas24h,
          emptyText: 'Sin alertas (24h)',
          meta: 'en las últimas 24h',
          href: '#/admin/logs',
          linkLabel: 'Ver logs ›',
        })}
        <article class="inicio-card">
          <h3 class="inicio-card__title">Integraciones</h3>
          <p class="inicio-card__metric">${integracionesActivas}/${integraciones.length}</p>
          <p class="inicio-card__meta">activas</p>
          ${renderNavLink('#/admin/integraciones', 'Ver integraciones ›')}
        </article>
      </div>

      <div class="inicio-grid-2">
        <section class="inicio-block">
          <div class="inicio-block__head">
            <h2 class="inicio-block__title">Distribución de usuarios por rol</h2>
          </div>
          ${renderBarrasRoles(distribucion)}
        </section>

        <section class="inicio-block">
          <div class="inicio-block__head">
            <h2 class="inicio-block__title">Actividad reciente del sistema</h2>
          </div>
          ${renderTablaLogsRecientes(logsRecientes)}
          <div class="inicio-block__footer">
            ${renderNavLink('#/admin/logs', 'Ver todos los logs ›')}
          </div>
        </section>
      </div>

      <div class="inicio-grid-2">
        <section class="inicio-block">
          <div class="inicio-block__head">
            <h2 class="inicio-block__title">Estado de integraciones</h2>
          </div>
          ${renderListaIntegraciones(integraciones)}
          <div class="inicio-block__footer">
            ${renderNavLink('#/admin/integraciones', 'Gestionar integraciones ›')}
          </div>
        </section>

        <section class="inicio-block">
          <div class="inicio-block__head">
            <h2 class="inicio-block__title">Acceso rápido</h2>
          </div>
          ${renderAccesoRapidoAdmin()}
        </section>
      </div>
    </section>
  `;
}

function renderInicioOtrosRoles(container, usuarioActivo) {
  const profesionales = getProfesionales();
  const solicitudes = getSolicitudes();

  container.innerHTML = `
    <section class="inicio">
      <header class="inicio__header">
        <h1 class="inicio__title">Hola, ${usuarioActivo?.nombre ?? ''}</h1>
        <p class="inicio__subtitle">
          Vista de inicio para el rol <strong>${usuarioActivo?.rolKey ?? '-'}</strong> (pendiente de especificar).
        </p>
      </header>
      <div class="inicio-cards inicio-cards--compact">
        <article class="inicio-card">
          <h3 class="inicio-card__title">Profesionales</h3>
          <p class="inicio-card__metric">${profesionales.length}</p>
        </article>
        <article class="inicio-card">
          <h3 class="inicio-card__title">Solicitudes</h3>
          <p class="inicio-card__metric">${solicitudes.length}</p>
        </article>
      </div>
    </section>
  `;
}

export function renderInicioView(container) {
  const usuarioActivo = getUsuarioActivo();
  const rolNav = normalizarRolKey(usuarioActivo?.rolKey);

  if (usuarioActivo?.rolKey === 'PROFESIONAL') {
    renderInicioProfesional(container, usuarioActivo);
    return;
  }

  if (usuarioActivo?.rolKey === 'RP') {
    renderInicioRp(container, usuarioActivo);
    return;
  }

  if (usuarioActivo?.rolKey === 'GDD') {
    renderInicioGdd(container, usuarioActivo);
    return;
  }

  if (rolNav === 'ADMIN') {
    renderInicioAdmin(container, usuarioActivo);
    return;
  }

  renderInicioOtrosRoles(container, usuarioActivo);
}
