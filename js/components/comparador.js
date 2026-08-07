import { getProfesionales } from '../state.js';
import { MAX_COMPARADOR } from '../utils/bolsa-busqueda.js';

/**
 * Contenido del tab Comparador (placeholder v1).
 * @param {string[]} comparadorIds
 */
export function renderComparadorTab(comparadorIds = []) {
  const profesionales = getProfesionales();
  const seleccionados = comparadorIds
    .map((id) => profesionales.find((p) => p.id === id))
    .filter(Boolean);

  if (!seleccionados.length) {
    return `
      <div class="bolsa-empty bolsa-empty--comparador">
        <p class="bolsa-empty__text">
          Selecciona hasta ${MAX_COMPARADOR} candidatos en la tabla de resultados para compararlos.
        </p>
      </div>
    `;
  }

  return `
    <div class="bolsa-comparador">
      <p class="bolsa-comparador__intro muted">
        Vista comparativa (v1) — ${seleccionados.length} de ${MAX_COMPARADOR} candidatos seleccionados.
      </p>
      <ul class="bolsa-comparador__list">
        ${seleccionados
          .map(
            (p) => `
          <li class="bolsa-comparador__item">
            <strong>${p.nombre}</strong>
            <span class="muted">${p.rol ?? '—'} · Matching ${p.matchingDemo ?? 0}%</span>
          </li>
        `
          )
          .join('')}
      </ul>
      <p class="muted bolsa-comparador__note">
        La comparación detallada lado a lado se implementará en una evolución posterior.
      </p>
    </div>
  `;
}
