import {
  actualizarProfesional,
  getProfesionales,
  getUsuarioActivo,
} from '../state.js';
import { renderCardProfesional } from '../components/card-profesional.js';
import { renderComparadorTab } from '../components/comparador.js';
import { renderFiltrosBusqueda, readFiltrosFromForm } from '../components/filtros-busqueda.js';
import { renderPaginacion } from '../components/paginacion.js';
import {
  renderModalAgendar,
  renderModalCambiarEstado,
  renderTablaCandidatos,
  renderTablaGdd,
} from '../components/tabla-candidatos.js';
import {
  DEFAULT_FILTROS_GDD,
  DEFAULT_FILTROS_RP,
  exportarProfesionalesCsv,
  filtrarProfesionales,
  getCatalogos,
  MAX_COMPARADOR,
  ORDEN_OPCIONES,
  ordenarProfesionales,
  paginar,
} from '../utils/bolsa-busqueda.js';
import {
  deseleccionarPaginaComparador,
  getComparador,
  seleccionarPaginaComparador,
  toggleComparador,
} from '../utils/comparador-state.js';

/** RP usa la vista de búsqueda (Boceto §2.4 / §4.2). */
const ROLES_BOLSA_BUSQUEDA = ['RP'];
const STORAGE_BUSQUEDAS = 'busquedasGuardadas';

function createBolsaState(defaultFiltros) {
  return {
    draftFiltros: { ...defaultFiltros },
    appliedFiltros: { ...defaultFiltros },
    orden: 'disponibilidad',
    pagina: 1,
    tab: 'busqueda',
  };
}

const bolsaStates = {
  rp: createBolsaState(DEFAULT_FILTROS_RP),
  gdd: createBolsaState(DEFAULT_FILTROS_GDD),
};

function getBolsaState(variant) {
  return bolsaStates[variant];
}

function isPerfilCompleto(profesional) {
  return Boolean(profesional?.id && profesional?.nombre && profesional?.rol);
}

function resolveProfesionalPropio(usuarioActivo, profesionales) {
  if (usuarioActivo?.profesionalId) {
    return profesionales.find((p) => p.id === usuarioActivo.profesionalId) ?? null;
  }
  return profesionales.find((p) => p.nombre === usuarioActivo?.nombre) ?? null;
}

function esRolBolsaBusqueda(rolKey) {
  return ROLES_BOLSA_BUSQUEDA.includes(rolKey);
}

function guardarBusquedaEnStorage(filtros) {
  try {
    const raw = localStorage.getItem(STORAGE_BUSQUEDAS);
    const list = raw ? JSON.parse(raw) : [];
    list.push({
      id: `BUSQ-${Date.now()}`,
      nombre: `Búsqueda ${new Date().toLocaleString('es-ES')}`,
      filtros,
      fecha: new Date().toISOString(),
    });
    localStorage.setItem(STORAGE_BUSQUEDAS, JSON.stringify(list));
  } catch (err) {
    console.warn('No se pudo guardar la búsqueda:', err);
  }
}

function renderBolsaEmptyPropio() {
  return `
    <div class="bolsa-empty">
      <p class="bolsa-empty__text">
        Tu perfil aún no está completo — ve a Mi Perfil para completarlo
      </p>
      <a class="btn btn--primary" href="#/mi-perfil">Ir a Mi Perfil</a>
    </div>
  `;
}

function renderBolsaProfesional(container, usuarioActivo) {
  const profesionales = getProfesionales();
  const propio = resolveProfesionalPropio(usuarioActivo, profesionales);
  const completo = isPerfilCompleto(propio);

  container.innerHTML = `
    <section class="bolsa">
      <header class="bolsa__header">
        <h1 class="bolsa__title">Bolsa de Profesionales</h1>
        <p class="bolsa__subtitle">Busca y encuentra el talento que tu proyecto necesita.</p>
      </header>

      <div class="bolsa-banner" role="status">
        <i class="fa-solid fa-circle-info bolsa-banner__icon" aria-hidden="true"></i>
        <p class="bolsa-banner__text">Solo puedes ver tu propio perfil</p>
      </div>

      <div class="bolsa-results">
        ${
          completo
            ? renderCardProfesional(propio, {
                matching: 100,
                matchingLabel: 'Matching con tu perfil',
                ctaLabel: 'Ver mi perfil',
                ctaHref: `#/ficha/${propio.id}`,
              })
            : renderBolsaEmptyPropio()
        }
      </div>

      ${completo ? `<p class="bolsa-footer">Mostrando 1 de 1 profesional</p>` : ''}
    </section>
  `;
}

function renderTabsBolsa(variant) {
  const state = getBolsaState(variant);
  const comparadorIds = getComparador(variant);
  const tabs = [
    { id: 'busqueda', label: 'Búsqueda' },
    { id: 'chat', label: 'Chat IA (RAG)' },
    { id: 'comparador', label: `Comparador (${comparadorIds.length})` },
  ];

  return `
    <div class="bolsa-tabs" role="tablist" aria-label="Modos de bolsa">
      ${tabs
        .map((tab) => {
          const active = state.tab === tab.id;
          return `
            <button
              type="button"
              class="bolsa-tabs__btn ${active ? 'bolsa-tabs__btn--active' : ''}"
              role="tab"
              aria-selected="${active}"
              data-action="cambiar-tab"
              data-tab="${tab.id}"
            >
              ${tab.label}
              ${tab.id === 'comparador' ? '<i class="fa-solid fa-circle-info bolsa-tabs__hint" title="Máximo 4 candidatos" aria-hidden="true"></i>' : ''}
            </button>
          `;
        })
        .join('')}
    </div>
  `;
}

function renderPanelResultados(profesionales, variant) {
  const state = getBolsaState(variant);
  const comparadorIds = getComparador(variant);
  const catalogos = getCatalogos(profesionales);
  const filtrados = ordenarProfesionales(
    filtrarProfesionales(profesionales, state.appliedFiltros, variant),
    state.orden
  );
  const { items, pagina, totalPaginas, total } = paginar(filtrados, state.pagina);
  const comparadorLleno = comparadorIds.length >= MAX_COMPARADOR;
  const todosEnPaginaSeleccionados =
    items.length > 0 && items.every((p) => comparadorIds.includes(p.id));

  const tabla =
    variant === 'gdd'
      ? renderTablaGdd(items, comparadorIds, { comparadorLleno })
      : renderTablaCandidatos(items, comparadorIds, { comparadorLleno });

  return `
    <div class="bolsa-layout">
      ${renderFiltrosBusqueda(catalogos, state.draftFiltros, variant)}

      <div class="bolsa-panel">
        <div class="bolsa-panel__toolbar">
          <p class="bolsa-panel__count">
            Resultados: <strong>${total}</strong> profesional${total === 1 ? '' : 'es'}
          </p>
          <label class="bolsa-orden">
            <span class="bolsa-orden__label">Ordenar por:</span>
            <select class="bolsa-orden__select" data-action="ordenar">
              ${ORDEN_OPCIONES.map(
                (o) => `
                <option value="${o.value}" ${state.orden === o.value ? 'selected' : ''}>
                  ${o.label}
                </option>
              `
              ).join('')}
            </select>
          </label>
        </div>

        ${tabla}

        ${
          total > 0
            ? `
          <div class="bolsa-panel__footer">
            <label class="bolsa-select-all">
              <input
                type="checkbox"
                data-action="seleccionar-pagina"
                ${todosEnPaginaSeleccionados ? 'checked' : ''}
                ${items.length === 0 ? 'disabled' : ''}
              />
              <span>Seleccionar todos</span>
            </label>
            <span class="bolsa-panel__comparador">
              Añadir al comparador (${comparadorIds.length}/${MAX_COMPARADOR})
            </span>
            ${renderPaginacion({ pagina, totalPaginas })}
          </div>
        `
            : ''
        }
      </div>
    </div>
  `;
}

function renderTabPlaceholder(titulo, texto) {
  return `
    <div class="bolsa-empty bolsa-empty--tab">
      <p class="bolsa-empty__text"><strong>${titulo}</strong></p>
      <p class="bolsa-empty__text">${texto}</p>
    </div>
  `;
}

function renderBolsaShell({ variant, headerActions, profesionales, rerender }) {
  const state = getBolsaState(variant);
  const comparadorIds = getComparador(variant);

  return `
    <section class="bolsa" data-bolsa-variant="${variant}">
      <header class="bolsa__header bolsa__header--actions">
        <div class="bolsa__intro">
          <h1 class="bolsa__title">Bolsa de Profesionales</h1>
          <p class="bolsa__subtitle">Busca y encuentra el talento que tu proyecto necesita.</p>
        </div>
        <div class="bolsa__actions">${headerActions}</div>
      </header>

      ${renderTabsBolsa(variant)}

      <div class="bolsa-tabpanel">
        ${
          state.tab === 'busqueda'
            ? renderPanelResultados(profesionales, variant)
            : state.tab === 'chat'
              ? renderTabPlaceholder(
                  'Chat IA (RAG)',
                  'Búsqueda conversacional con IA — disponible en una evolución posterior.'
                )
              : renderComparadorTab(comparadorIds)
        }
      </div>
    </section>
  `;
}

function renderBolsaBusqueda(container) {
  const profesionales = getProfesionales();
  const headerActions = `
    <button type="button" class="btn" data-action="guardar-busqueda">Guardar búsqueda</button>
    <a class="btn" href="#/profesionales/nuevo?validado=false">
      <i class="fa-solid fa-plus" aria-hidden="true"></i> Nuevo profesional
    </a>
    <a class="btn btn--primary" href="#/solicitudes/nueva">+ Nueva solicitud</a>
  `;

  container.innerHTML = renderBolsaShell({
    variant: 'rp',
    headerActions,
    profesionales,
  });

  wireBolsa(container, 'rp', () => renderBolsaBusqueda(container));
}

function renderBolsaGdd(container) {
  const profesionales = getProfesionales();
  const headerActions = `
    <button type="button" class="btn" data-action="exportar-csv">Exportar</button>
    <a class="btn btn--primary" href="#/profesionales/nuevo?validado=true">+ Nuevo profesional</a>
  `;

  container.innerHTML = renderBolsaShell({
    variant: 'gdd',
    headerActions,
    profesionales,
  });

  wireBolsa(container, 'gdd', () => renderBolsaGdd(container));
}

function cerrarMenus(root) {
  root.querySelectorAll('.bolsa-menu__panel').forEach((panel) => {
    panel.hidden = true;
  });
  root.querySelectorAll('[data-action="toggle-menu"]').forEach((btn) => {
    btn.setAttribute('aria-expanded', 'false');
  });
}

function wireBolsa(root, variant, rerender) {
  const state = getBolsaState(variant);
  const defaultFiltros = variant === 'gdd' ? DEFAULT_FILTROS_GDD : DEFAULT_FILTROS_RP;

  const form = root.querySelector('[data-form="filtros"]');
  form?.addEventListener('submit', (event) => {
    event.preventDefault();
    state.draftFiltros = readFiltrosFromForm(form, variant);
    state.appliedFiltros = { ...state.draftFiltros };
    state.pagina = 1;
    rerender();
  });

  root.querySelectorAll('[data-action="limpiar-filtros"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.draftFiltros = { ...defaultFiltros };
      state.appliedFiltros = { ...defaultFiltros };
      state.pagina = 1;
      rerender();
    });
  });

  root.querySelector('[data-action="ordenar"]')?.addEventListener('change', (event) => {
    state.orden = event.target.value;
    state.pagina = 1;
    rerender();
  });

  root.querySelectorAll('[data-action="pagina"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const page = Number(btn.dataset.page);
      if (!Number.isFinite(page) || page < 1) return;
      state.pagina = page;
      rerender();
    });
  });

  root.querySelectorAll('[data-action="toggle-comparador"]').forEach((input) => {
    input.addEventListener('change', () => {
      toggleComparador(variant, input.dataset.id);
      rerender();
    });
  });

  root.querySelector('[data-action="seleccionar-pagina"]')?.addEventListener('change', (event) => {
    const ids = [...root.querySelectorAll('[data-action="toggle-comparador"]')].map(
      (el) => el.dataset.id
    );
    if (event.target.checked) seleccionarPaginaComparador(variant, ids);
    else deseleccionarPaginaComparador(variant, ids);
    rerender();
  });

  root.querySelectorAll('[data-action="cambiar-tab"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.tab = btn.dataset.tab;
      rerender();
    });
  });

  root.querySelector('[data-action="guardar-busqueda"]')?.addEventListener('click', () => {
    const formEl = root.querySelector('[data-form="filtros"]');
    if (formEl) state.draftFiltros = readFiltrosFromForm(formEl, variant);
    guardarBusquedaEnStorage({ ...state.draftFiltros });
  });

  root.querySelector('[data-action="exportar-csv"]')?.addEventListener('click', () => {
    const profesionales = getProfesionales();
    const filtrados = ordenarProfesionales(
      filtrarProfesionales(profesionales, state.appliedFiltros, variant),
      state.orden
    );
    exportarProfesionalesCsv(filtrados);
  });

  if (variant === 'gdd') {
    wireBolsaGdd(root, rerender);
  }
}

function wireBolsaGdd(root, rerender) {
  root.querySelectorAll('[data-action="agendar-reunion"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      cerrarMenus(root);
      const existing = root.querySelector('[data-modal]');
      existing?.remove();
      root.insertAdjacentHTML('beforeend', renderModalAgendar(btn.dataset.nombre));
      wireModales(root, rerender);
    });
  });

  root.querySelectorAll('[data-action="toggle-menu"]').forEach((btn) => {
    btn.addEventListener('click', (event) => {
      event.stopPropagation();
      const menu = root.querySelector(`[data-menu-profesional="${btn.dataset.id}"]`);
      const panel = menu?.querySelector('.bolsa-menu__panel');
      if (!panel) return;

      const estabaAbierto = !panel.hidden;
      cerrarMenus(root);
      if (!estabaAbierto) {
        panel.hidden = false;
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });

  if (!root.dataset.menuWired) {
    root.dataset.menuWired = '1';
    root.addEventListener('click', (event) => {
      if (!event.target.closest('.bolsa-menu')) cerrarMenus(root);
    });
  }

  root.querySelectorAll('[data-action="cambiar-estado"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      cerrarMenus(root);
      const prof = getProfesionales().find((p) => p.id === btn.dataset.id);
      if (!prof) return;
      const existing = root.querySelector('[data-modal]');
      existing?.remove();
      root.insertAdjacentHTML(
        'beforeend',
        renderModalCambiarEstado(prof.id, prof.estado)
      );
      wireModales(root, rerender);
    });
  });

  root.querySelectorAll('[data-action="liberar-reserva"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!window.confirm('¿Liberar la reserva de este profesional?')) return;
      actualizarEstadoProfesional(btn.dataset.id, 'Disponible', 'Reserva liberada por GDD');
      rerender();
    });
  });
}

function wireModales(root, rerender) {
  root.querySelectorAll('[data-action="cerrar-modal"]').forEach((el) => {
    el.addEventListener('click', () => {
      root.querySelector('[data-modal]')?.remove();
    });
  });

  root.querySelector('[data-form="cambiar-estado"]')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const form = event.target;
    const id = form.dataset.id;
    const nuevoEstado = new FormData(form).get('estado');
    actualizarEstadoProfesional(id, nuevoEstado, `Estado cambiado a ${nuevoEstado}`);
    root.querySelector('[data-modal]')?.remove();
    rerender();
  });
}

function actualizarEstadoProfesional(profesionalId, nuevoEstado, comentario) {
  const usuario = getUsuarioActivo();
  const fecha = new Date().toISOString().slice(0, 10);

  actualizarProfesional(profesionalId, (p) => {
    p.estado = nuevoEstado;
    if (!Array.isArray(p.historicoEstados)) p.historicoEstados = [];
    p.historicoEstados.push({
      estado: nuevoEstado,
      fecha,
      usuario: usuario?.nombre ? `${usuario.nombre} (GDD)` : 'GDD',
      comentario,
    });
    if (nuevoEstado === 'Disponible' && p.disponibilidad) {
      p.disponibilidad.porcentaje = p.disponibilidad.porcentaje || 100;
    }
    return p;
  });
}

function renderBolsaOtrosRoles(container, usuarioActivo) {
  container.innerHTML = `
    <section class="bolsa">
      <header class="bolsa__header">
        <h1 class="bolsa__title">Bolsa de Profesionales</h1>
        <p class="bolsa__subtitle">Busca y encuentra el talento que tu proyecto necesita.</p>
      </header>
      <p class="bolsa__pending muted">
        Vista de búsqueda para el rol <strong>${usuarioActivo?.rolKey ?? '-'}</strong>
        (pendiente de especificar en tareas posteriores).
      </p>
    </section>
  `;
}

export function renderBolsaProfesionalesView(container) {
  const usuarioActivo = getUsuarioActivo();

  if (usuarioActivo?.rolKey === 'PROFESIONAL') {
    renderBolsaProfesional(container, usuarioActivo);
    return;
  }

  if (esRolBolsaBusqueda(usuarioActivo?.rolKey)) {
    renderBolsaBusqueda(container);
    return;
  }

  if (usuarioActivo?.rolKey === 'GDD') {
    renderBolsaGdd(container);
    return;
  }

  renderBolsaOtrosRoles(container, usuarioActivo);
}
