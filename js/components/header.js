import { getHeaderPorRol } from '../permisos/permisos.js';

function renderTopNav(items, currentRoute) {
  return items
    .map((item) => {
      const isActive = currentRoute === item.ruta;
      const isDisabled = !item.href;

      if (isDisabled) {
        return `
          <span
            class="app-top-nav__link app-top-nav__link--disabled"
            aria-disabled="true"
            role="link"
          >
            ${item.label}
          </span>
        `;
      }

      return `
        <a
          class="app-top-nav__link ${isActive ? 'app-top-nav__link--active' : ''}"
          href="${item.href}"
        >
          ${item.label}
        </a>
      `;
    })
    .join('');
}

export function renderHeader({ usuarioActivo, currentRoute }) {
  const nombre = usuarioActivo?.nombre ?? '';
  const iniciales = usuarioActivo?.avatarIniciales ?? '--';
  const headerItems = getHeaderPorRol(usuarioActivo?.rolKey);

  return `
    <div class="app-header__brand">
      <a href="#/inicio" class="app-logo" aria-label="Ir a inicio">
        <img src="./assets/img/logo-ayesa-negativo.svg" alt="Ayesa" width="140" height="40" />
      </a>
    </div>

    <div class="app-header__main">
      <nav class="app-top-nav" aria-label="Navegación principal">
        ${renderTopNav(headerItems, currentRoute)}
      </nav>

      <div class="app-header__right">
        <span class="app-user-name">${nombre}</span>
        <div class="avatar app-user-avatar" title="${nombre}">${iniciales}</div>
        <button
          class="app-logout-btn"
          data-action="logout"
          type="button"
          title="Cerrar sesión"
          aria-label="Cerrar sesión"
        >
          <i class="fa-solid fa-right-from-bracket" aria-hidden="true"></i>
        </button>
      </div>
    </div>
  `;
}
