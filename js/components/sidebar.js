import { getSidebarPorRol } from '../permisos/permisos.js';

function renderSidebarItems(items, currentRoute) {
  return items
    .map((item) => {
      const isActive = currentRoute === item.ruta;
      const hasRoute = Boolean(item.href);
      const classes = ['app-side-link', isActive ? 'app-side-link--active' : '']
        .filter(Boolean)
        .join(' ');

      const badge =
        item.badge != null
          ? `<span class="app-side-link__badge">${item.badge}</span>`
          : '';

      // Misma apariencia siempre. Sin ruta real: ancla stub que no cambia el hash.
      const href = hasRoute ? item.href : 'javascript:void(0)';
      const stubAttrs = hasRoute
        ? ''
        : 'data-sidebar-stub="true" aria-disabled="true"';

      return `
        <a class="${classes}" href="${href}" ${stubAttrs}>
          <i class="fa-solid ${item.icon} app-side-link__icon" aria-hidden="true"></i>
          <span class="app-side-link__label">${item.label}</span>
          ${badge}
        </a>
      `;
    })
    .join('');
}

export function renderSidebar({ usuarioActivo, currentRoute }) {
  const items = getSidebarPorRol(usuarioActivo?.rolKey);

  return `
    <nav class="app-side-nav" aria-label="Navegación lateral">
      ${renderSidebarItems(items, currentRoute)}
    </nav>
  `;
}

/** Evita navegación en ítems sin vista (sin cambiar el aspecto visual). */
export function wireSidebarStubs(root = document) {
  root.querySelectorAll('[data-sidebar-stub="true"]').forEach((el) => {
    el.addEventListener('click', (event) => {
      event.preventDefault();
    });
  });
}
