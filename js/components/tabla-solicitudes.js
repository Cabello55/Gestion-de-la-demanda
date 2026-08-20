import { renderBadgeEstado } from './badge-estado.js';
import { getNombreRp } from '../data/catalogo-rp.js';

function formatFecha(iso) {
  if (!iso) return '—';
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function nombreProfesional(profesionalId, profById) {
  if (!profesionalId) return '—';
  return profById.get(profesionalId)?.nombre ?? '—';
}

/**
 * Tabla de solicitudes para el rol Profesional.
 */
export function renderTablaSolicitudesProfesional(solicitudes = []) {
  if (!solicitudes.length) {
    return '';
  }

  return `
    <div class="sol-table-wrap">
      <table class="sol-table">
        <thead>
          <tr>
            <th>ID Solicitud</th>
            <th>Proyecto / Cliente</th>
            <th>Rol / Perfil</th>
            <th>RP Responsable</th>
            <th>Estado</th>
            <th>Fecha solicitud</th>
            <th>Fin estimado</th>
            <th class="sol-table__actions-col" aria-label="Acciones"></th>
          </tr>
        </thead>
        <tbody>
          ${solicitudes
            .map(
              (s) => `
            <tr class="sol-table__row" data-action="abrir-solicitud" data-id="${s.id}" tabindex="0" role="link">
              <td><span class="sol-table__id">${s.id}</span></td>
              <td>${s.proyecto ?? '—'} / ${s.cliente ?? '—'}</td>
              <td>${s.rolSolicitado ?? '—'}</td>
              <td>${getNombreRp(s.rpResponsableId)}</td>
              <td>${renderBadgeEstado({ estado: s.estado })}</td>
              <td>${formatFecha(s.fechaSolicitud)}</td>
              <td>${formatFecha(s.finEstimado)}</td>
              <td class="sol-table__actions">
                ${
                  s.estado === 'En entrevista'
                    ? `<button type="button" class="btn btn--sm" data-action="confirmar-entrevista" data-id="${s.id}">Confirmar entrevista</button>`
                    : ''
                }
              </td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    </div>
  `;
}

/**
 * Tabla de solicitudes para RP.
 */
export function renderTablaSolicitudesRpKcm(solicitudes = [], { mostrarRp = false, profById = new Map() } = {}) {
  if (!solicitudes.length) return '';

  return `
    <div class="sol-table-wrap">
      <table class="sol-table">
        <thead>
          <tr>
            <th>ID Solicitud</th>
            <th>Proyecto / Cliente</th>
            <th>Rol / Perfil</th>
            <th>Profesional solicitado</th>
            ${mostrarRp ? '<th>RP Responsable</th>' : ''}
            <th>Estado</th>
            <th>Fecha solicitud</th>
            <th>Fin estimado</th>
          </tr>
        </thead>
        <tbody>
          ${solicitudes
            .map(
              (s) => `
            <tr class="sol-table__row" data-action="abrir-solicitud" data-id="${s.id}" tabindex="0" role="link">
              <td><span class="sol-table__id">${s.id}</span></td>
              <td>${s.proyecto ?? '—'} / ${s.cliente ?? '—'}</td>
              <td>${s.rolSolicitado ?? '—'}</td>
              <td>${nombreProfesional(s.profesionalId, profById)}</td>
              ${mostrarRp ? `<td>${getNombreRp(s.rpResponsableId)}</td>` : ''}
              <td>${renderBadgeEstado({ estado: s.estado })}</td>
              <td>${formatFecha(s.fechaSolicitud)}</td>
              <td>${formatFecha(s.finEstimado)}</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    </div>
  `;
}

export function renderModalCancelarSolicitud(solicitud) {
  const esAprobada = solicitud?.estado === 'Aprobada';
  const mensaje = esAprobada
    ? 'Cancelar esta solicitud puede implicar liberar al profesional ya asignado. ¿Continuar?'
    : '¿Confirmas que quieres cancelar esta solicitud?';

  return `
    <div class="sol-modal" data-modal="cancelar-solicitud" role="dialog" aria-modal="true">
      <div class="sol-modal__backdrop" data-action="cerrar-modal"></div>
      <div class="sol-modal__card">
        <header class="sol-modal__head">
          <h2 class="sol-modal__title">Cancelar solicitud</h2>
          <button type="button" class="sol-modal__close" data-action="cerrar-modal" aria-label="Cerrar">
            <i class="fa-solid fa-xmark" aria-hidden="true"></i>
          </button>
        </header>
        <p class="sol-modal__text">${mensaje}</p>
        <p class="sol-modal__meta"><strong>${solicitud?.id ?? '—'}</strong> · ${solicitud?.proyecto ?? '—'}</p>
        <footer class="sol-modal__footer">
          <button type="button" class="btn" data-action="cerrar-modal">Volver</button>
          <button type="button" class="btn btn--danger" data-action="confirmar-cancelar" data-id="${solicitud?.id}">
            Cancelar solicitud
          </button>
        </footer>
      </div>
    </div>
  `;
}

/**
 * Vista calendario / timeline de solicitudes (estilo Próximos compromisos).
 */
export function renderCalendarioSolicitudes(solicitudes = [], { profById = null } = {}) {
  if (!solicitudes.length) {
    return `<p class="sol-empty">No hay solicitudes para mostrar en el calendario</p>`;
  }

  const eventos = solicitudes.flatMap((s) => {
    const detalleExtra = profById
      ? nombreProfesional(s.profesionalId, profById)
      : getNombreRp(s.rpResponsableId);
    return [
      {
        id: `${s.id}-inicio`,
        solicitudId: s.id,
        titulo: `${s.id} — Inicio de solicitud`,
        detalle: `${s.proyecto ?? '—'} / ${s.cliente ?? '—'} · ${s.rolSolicitado ?? '—'}`,
        estado: s.estado,
        fecha: s.fechaSolicitud,
      },
      {
        id: `${s.id}-fin`,
        solicitudId: s.id,
        titulo: `${s.id} — Fin estimado`,
        detalle: `Fin previsto del proceso · ${detalleExtra}`,
        estado: s.estado,
        fecha: s.finEstimado,
      },
    ];
  });

  eventos.sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)));

  return `
    <ul class="sol-cal-list">
      ${eventos
        .map(
          (e) => `
        <li class="sol-cal-list__item" data-action="abrir-solicitud" data-id="${e.solicitudId}" tabindex="0" role="link">
          <div class="sol-cal-list__icon" aria-hidden="true">
            <i class="fa-solid fa-calendar-day"></i>
          </div>
          <div class="sol-cal-list__body">
            <div class="sol-cal-list__title">${e.titulo}</div>
            <div class="sol-cal-list__detail">${e.detalle}</div>
          </div>
          <div class="sol-cal-list__aside">
            ${renderBadgeEstado({ estado: e.estado })}
            <time class="sol-cal-list__date" datetime="${e.fecha}">${formatFecha(e.fecha)}</time>
          </div>
        </li>
      `
        )
        .join('')}
    </ul>
  `;
}
