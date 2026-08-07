import { renderBadgeEstado } from './badge-estado.js';
import {
  getTagsProfesional,
  labelEstadoBolsa,
  labelSeniority,
  matchingMostrable,
} from '../utils/bolsa-busqueda.js';

function inicialesNombre(nombre = '') {
  const parts = String(nombre).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '--';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function renderMatchingCell(matching) {
  if (matching == null) {
    return `<span class="bolsa-matching-cell__empty">—</span>`;
  }

  const value = Math.max(0, Math.min(100, Number(matching) || 0));
  return `
    <div class="bolsa-matching-cell">
      <span class="bolsa-matching-cell__value">${value}%</span>
      <div class="bolsa-matching-cell__track" aria-hidden="true">
        <span class="bolsa-matching-cell__fill" style="width:${value}%"></span>
      </div>
    </div>
  `;
}

function renderCeldaProfesional(p) {
  const tags = getTagsProfesional(p, 4);
  return `
    <div class="bolsa-candidato">
      <div class="bolsa-candidato__avatar" aria-hidden="true">
        ${inicialesNombre(p.nombre)}
      </div>
      <div class="bolsa-candidato__body">
        <div class="bolsa-candidato__name">${p.nombre}</div>
        <div class="bolsa-candidato__role">${p.rol ?? '—'}</div>
        ${
          tags.length
            ? `<div class="bolsa-candidato__tags">${tags.join(' · ')}</div>`
            : ''
        }
      </div>
    </div>
  `;
}

function renderCheckboxCelda(p, comparadorIds, comparadorLleno) {
  const selected = comparadorIds.includes(p.id);
  const disabled = comparadorLleno && !selected;
  return `
    <input
      type="checkbox"
      class="bolsa-table__checkbox"
      data-action="toggle-comparador"
      data-id="${p.id}"
      ${selected ? 'checked' : ''}
      ${disabled ? 'disabled' : ''}
      ${disabled ? 'title="Máximo 4 candidatos para comparar"' : ''}
      aria-label="Añadir ${p.nombre} al comparador"
    />
  `;
}

function renderEmptyResultados() {
  return `
    <div class="bolsa-empty bolsa-empty--results">
      <p class="bolsa-empty__text">No se encontraron profesionales con estos filtros</p>
      <button type="button" class="btn btn--primary" data-action="limpiar-filtros">
        Limpiar filtros
      </button>
    </div>
  `;
}

/**
 * Tabla RP/KCM.
 */
export function renderTablaCandidatos(profesionales = [], comparadorIds = [], opts = {}) {
  const { comparadorLleno = false } = opts;

  if (!profesionales.length) return renderEmptyResultados();

  return `
    <div class="bolsa-table-wrap">
      <table class="bolsa-table">
        <thead>
          <tr>
            <th class="bolsa-table__check" scope="col"><span class="sr-only">Seleccionar</span></th>
            <th scope="col">Profesional</th>
            <th scope="col">Disponibilidad</th>
            <th scope="col">Seniority</th>
            <th scope="col">Matching</th>
            <th scope="col">Coste/día</th>
            <th scope="col">Acción</th>
          </tr>
        </thead>
        <tbody>
          ${profesionales
            .map((p) => {
              const selected = comparadorIds.includes(p.id);
              const pct = p.disponibilidad?.porcentaje;
              const tarifa = p.coste?.tarifaDia;

              return `
                <tr class="bolsa-table__row ${selected ? 'bolsa-table__row--selected' : ''}">
                  <td class="bolsa-table__check">
                    ${renderCheckboxCelda(p, comparadorIds, comparadorLleno)}
                  </td>
                  <td>${renderCeldaProfesional(p)}</td>
                  <td>
                    <div class="bolsa-table__disponibilidad">
                      ${renderBadgeEstado({ estado: p.estado })}
                      ${pct != null ? `<span class="bolsa-table__pct">${pct}%</span>` : ''}
                    </div>
                  </td>
                  <td>
                    <span class="bolsa-table__seniority">
                      ${labelSeniority(p.seniority)} · ${p.experienciaAnios ?? '—'} años
                    </span>
                  </td>
                  <td>${renderMatchingCell(matchingMostrable(p))}</td>
                  <td class="bolsa-table__coste">${tarifa != null ? `${tarifa} €` : '—'}</td>
                  <td>
                    <a class="btn btn--ghost bolsa-table__link" href="#/ficha/${p.id}">
                      Ver perfil
                    </a>
                  </td>
                </tr>
              `;
            })
            .join('')}
        </tbody>
      </table>
    </div>
  `;
}

/**
 * Tabla GDD — columnas Estado explícito + acciones de gestión.
 */
export function renderTablaGdd(profesionales = [], comparadorIds = [], opts = {}) {
  const { comparadorLleno = false } = opts;

  if (!profesionales.length) return renderEmptyResultados();

  return `
    <div class="bolsa-table-wrap">
      <table class="bolsa-table bolsa-table--gdd">
        <thead>
          <tr>
            <th class="bolsa-table__check" scope="col"><span class="sr-only">Seleccionar</span></th>
            <th scope="col">Profesional</th>
            <th scope="col">Estado</th>
            <th scope="col">Disponibilidad</th>
            <th scope="col">Matching</th>
            <th scope="col">Coste/día</th>
            <th scope="col">Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${profesionales
            .map((p) => {
              const selected = comparadorIds.includes(p.id);
              const pct = p.disponibilidad?.porcentaje;
              const tarifa = p.coste?.tarifaDia;
              const estadoLabel = labelEstadoBolsa(p.estado);

              return `
                <tr class="bolsa-table__row ${selected ? 'bolsa-table__row--selected' : ''}">
                  <td class="bolsa-table__check">
                    ${renderCheckboxCelda(p, comparadorIds, comparadorLleno)}
                  </td>
                  <td>${renderCeldaProfesional(p)}</td>
                  <td>${renderBadgeEstado({ estado: estadoLabel })}</td>
                  <td class="bolsa-table__pct-cell">${pct != null ? `${pct}%` : '—'}</td>
                  <td>${renderMatchingCell(matchingMostrable(p))}</td>
                  <td class="bolsa-table__coste">${tarifa != null ? `${tarifa} €` : '—'}</td>
                  <td>
                    <div class="bolsa-acciones">
                      <a
                        class="bolsa-acciones__btn"
                        href="#/ficha/${p.id}?modo=edicion"
                        title="Editar perfil"
                        aria-label="Editar perfil de ${p.nombre}"
                      >
                        <i class="fa-solid fa-pen" aria-hidden="true"></i>
                      </a>
                      <button
                        type="button"
                        class="bolsa-acciones__btn"
                        data-action="agendar-reunion"
                        data-id="${p.id}"
                        data-nombre="${p.nombre}"
                        title="Agendar reunión"
                        aria-label="Agendar reunión con ${p.nombre}"
                      >
                        <i class="fa-solid fa-calendar" aria-hidden="true"></i>
                      </button>
                      <div class="bolsa-menu" data-menu-profesional="${p.id}">
                        <button
                          type="button"
                          class="bolsa-acciones__btn"
                          data-action="toggle-menu"
                          data-id="${p.id}"
                          title="Más opciones"
                          aria-label="Más opciones para ${p.nombre}"
                          aria-expanded="false"
                        >
                          <i class="fa-solid fa-ellipsis-vertical" aria-hidden="true"></i>
                        </button>
                        <div class="bolsa-menu__panel" hidden>
                          <button
                            type="button"
                            class="bolsa-menu__item"
                            data-action="cambiar-estado"
                            data-id="${p.id}"
                          >
                            Cambiar estado
                          </button>
                          ${
                            p.estado === 'Reservado'
                              ? `
                            <button
                              type="button"
                              class="bolsa-menu__item"
                              data-action="liberar-reserva"
                              data-id="${p.id}"
                            >
                              Liberar reserva
                            </button>
                          `
                              : ''
                          }
                          <a
                            class="bolsa-menu__item bolsa-menu__item--link"
                            href="#/ficha/${p.id}?tab=historico"
                          >
                            Ver histórico
                          </a>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              `;
            })
            .join('')}
        </tbody>
      </table>
    </div>
  `;
}

export function renderModalAgendar(nombre = '') {
  return `
    <div class="bolsa-modal" data-modal="agendar" role="dialog" aria-modal="true" aria-labelledby="modal-agendar-title">
      <div class="bolsa-modal__backdrop" data-action="cerrar-modal"></div>
      <div class="bolsa-modal__card">
        <header class="bolsa-modal__head">
          <h2 id="modal-agendar-title" class="bolsa-modal__title">Agendar reunión</h2>
          <button type="button" class="bolsa-modal__close" data-action="cerrar-modal" aria-label="Cerrar">
            <i class="fa-solid fa-xmark" aria-hidden="true"></i>
          </button>
        </header>
        <p class="bolsa-modal__text">
          Solicitud de reunión con <strong>${nombre}</strong> registrada para la demo.
          (Sin persistencia en esta versión.)
        </p>
        <footer class="bolsa-modal__footer">
          <button type="button" class="btn btn--primary" data-action="cerrar-modal">Entendido</button>
        </footer>
      </div>
    </div>
  `;
}

export function renderModalCambiarEstado(profesionalId, estadoActual) {
  const opciones = ['Disponible', 'Reservado', 'Asignado', 'No disponible'];
  return `
    <div class="bolsa-modal" data-modal="estado" role="dialog" aria-modal="true" aria-labelledby="modal-estado-title">
      <div class="bolsa-modal__backdrop" data-action="cerrar-modal"></div>
      <div class="bolsa-modal__card">
        <header class="bolsa-modal__head">
          <h2 id="modal-estado-title" class="bolsa-modal__title">Cambiar estado</h2>
          <button type="button" class="bolsa-modal__close" data-action="cerrar-modal" aria-label="Cerrar">
            <i class="fa-solid fa-xmark" aria-hidden="true"></i>
          </button>
        </header>
        <form class="bolsa-modal__form" data-form="cambiar-estado" data-id="${profesionalId}">
          <label class="bolsa-field">
            <span class="bolsa-field__label">Nuevo estado</span>
            <select class="bolsa-field__input" name="estado" required>
              ${opciones
                .map(
                  (e) => `
                <option value="${e}" ${e === estadoActual ? 'selected' : ''}>${labelEstadoBolsa(e)}</option>
              `
                )
                .join('')}
            </select>
          </label>
          <footer class="bolsa-modal__footer">
            <button type="button" class="btn" data-action="cerrar-modal">Cancelar</button>
            <button type="submit" class="btn btn--primary">Confirmar</button>
          </footer>
        </form>
      </div>
    </div>
  `;
}
