import { ESTADOS_DISPONIBILIDAD, SENIORITIES } from '../utils/bolsa-busqueda.js';

/**
 * Panel lateral de filtros de la Bolsa.
 * @param {{ tecnologias: string[], roles: string[] }} catalogos
 * @param {object} filtros
 * @param {'rp'|'gdd'} [variant]
 */
export function renderFiltrosBusqueda(catalogos, filtros = {}, variant = 'rp') {
  const esGdd = variant === 'gdd';

  return `
    <aside class="bolsa-filtros">
      <div class="bolsa-filtros__head">
        <h2 class="bolsa-filtros__title">Filtros</h2>
        <button type="button" class="bolsa-filtros__clear" data-action="limpiar-filtros">
          Limpiar
        </button>
      </div>

      <form class="bolsa-filtros__form" data-form="filtros">
        <label class="bolsa-field">
          <span class="bolsa-field__label">Palabra clave</span>
          <input
            class="bolsa-field__input"
            type="search"
            name="keyword"
            value="${filtros.keyword ?? ''}"
            placeholder="Buscar por habilidad, tecnología, rol..."
            autocomplete="off"
          />
        </label>

        <label class="bolsa-field">
          <span class="bolsa-field__label">Tecnología</span>
          <select class="bolsa-field__input" name="tecnologia">
            <option value="">Seleccionar</option>
            ${(catalogos.tecnologias ?? [])
              .map(
                (t) => `
              <option value="${t}" ${filtros.tecnologia === t ? 'selected' : ''}>${t}</option>
            `
              )
              .join('')}
          </select>
        </label>

        <label class="bolsa-field">
          <span class="bolsa-field__label">Rol / Perfil</span>
          <select class="bolsa-field__input" name="rol">
            <option value="">Seleccionar</option>
            ${(catalogos.roles ?? [])
              .map(
                (r) => `
              <option value="${r}" ${filtros.rol === r ? 'selected' : ''}>${r}</option>
            `
              )
              .join('')}
          </select>
        </label>

        <label class="bolsa-field">
          <span class="bolsa-field__label">Seniority</span>
          <select class="bolsa-field__input" name="seniority">
            <option value="">Seleccionar</option>
            ${SENIORITIES.map(
              (s) => `
              <option value="${s}" ${filtros.seniority === s ? 'selected' : ''}>${s}</option>
            `
            ).join('')}
          </select>
        </label>

        <label class="bolsa-field">
          <span class="bolsa-field__label">Disponibilidad</span>
          <select class="bolsa-field__input" name="disponibilidad">
            ${
              esGdd
                ? `<option value="__TODOS__" ${filtros.disponibilidad === '__TODOS__' ? 'selected' : ''}>Todos</option>`
                : `<option value="">Seleccionar</option>`
            }
            ${ESTADOS_DISPONIBILIDAD.map(
              (e) => `
              <option value="${e}" ${filtros.disponibilidad === e ? 'selected' : ''}>${e}</option>
            `
            ).join('')}
          </select>
        </label>

        <label class="bolsa-field bolsa-field--checkbox">
          <input
            type="checkbox"
            name="${esGdd ? 'incluirNoDisponibles' : 'soloDisponibles'}"
            ${(esGdd ? filtros.incluirNoDisponibles : filtros.soloDisponibles) ? 'checked' : ''}
          />
          <span>${esGdd ? 'Incluir no disponibles' : 'Solo ver disponibles'}</span>
        </label>

        <button type="submit" class="btn btn--primary bolsa-filtros__submit">
          Aplicar filtros
        </button>
      </form>
    </aside>
  `;
}

/**
 * @param {HTMLFormElement} form
 * @param {'rp'|'gdd'} [variant]
 */
export function readFiltrosFromForm(form, variant = 'rp') {
  if (!form) {
    return variant === 'gdd'
      ? {
          keyword: '',
          tecnologia: '',
          rol: '',
          seniority: '',
          disponibilidad: '__TODOS__',
          incluirNoDisponibles: false,
        }
      : {
          keyword: '',
          tecnologia: '',
          rol: '',
          seniority: '',
          disponibilidad: '',
          soloDisponibles: false,
        };
  }

  const data = new FormData(form);
  if (variant === 'gdd') {
    return {
      keyword: String(data.get('keyword') ?? ''),
      tecnologia: String(data.get('tecnologia') ?? ''),
      rol: String(data.get('rol') ?? ''),
      seniority: String(data.get('seniority') ?? ''),
      disponibilidad: String(data.get('disponibilidad') ?? '__TODOS__'),
      incluirNoDisponibles: data.get('incluirNoDisponibles') === 'on',
    };
  }

  return {
    keyword: String(data.get('keyword') ?? ''),
    tecnologia: String(data.get('tecnologia') ?? ''),
    rol: String(data.get('rol') ?? ''),
    seniority: String(data.get('seniority') ?? ''),
    disponibilidad: String(data.get('disponibilidad') ?? ''),
    soloDisponibles: data.get('soloDisponibles') === 'on',
  };
}
