import { getRolesDemo, loginByRole } from '../auth.js';

function renderRoleCard(rol) {
  return `
    <button
      class="login-role-card login-role-card--${rol.accentColor}"
      type="button"
      data-role="${rol.rolKey}"
      aria-label="Entrar como ${rol.label}: ${rol.nombre}"
    >
      <span class="login-role-card__accent" aria-hidden="true"></span>

      <span class="login-role-card__avatar" aria-hidden="true">
        ${rol.avatarIniciales}
      </span>

      <span class="login-role-card__body">
        <span class="login-role-card__label">${rol.label}</span>
        <span class="login-role-card__name">${rol.nombre}</span>
        <span class="login-role-card__desc">${rol.descripcion}</span>
      </span>

      <span class="login-role-card__arrow" aria-hidden="true">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M4 10H16M16 10L11 5M16 10L11 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </span>
    </button>
  `;
}

export function renderLoginView(container) {
  const roles = getRolesDemo();

  container.innerHTML = `
    <div class="login-page">
      <aside class="login-brand" aria-label="Marca Ayesa">
        <div class="login-brand__inner">
          <img
            class="login-brand__logo"
            src="./assets/img/logo-ayesa-negativo.svg"
            alt="Ayesa"
            width="140"
            height="40"
          />

          <div class="login-brand__content">
            <p class="login-brand__eyebrow">AyesaON</p>
            <h1 class="login-brand__title">Gestión de la Demanda</h1>
            <p class="login-brand__subtitle">
              Plataforma Inteligente de Talento
            </p>
          </div>

          <p class="login-brand__footer">
            Demo funcional para stakeholders.<br />
            Selecciona un rol para explorar la plataforma.
          </p>
        </div>

        <div class="login-brand__decoration" aria-hidden="true">
          <span class="login-brand__orb login-brand__orb--1"></span>
          <span class="login-brand__orb login-brand__orb--2"></span>
        </div>
      </aside>

      <main class="login-main">
        <div class="login-panel">
          <header class="login-panel__header">
            <h2 class="login-panel__title">Accede a la demo</h2>
            <p class="login-panel__intro">
              Elige un perfil de usuario para entrar. Cada rol tiene permisos y vistas distintas.
            </p>
          </header>

          <div class="login-roles" role="list">
            ${roles.map(renderRoleCard).join('')}
          </div>

          <footer class="login-panel__footer">
            <p>Sin backend · Datos simulados en <code>localStorage</code></p>
          </footer>
        </div>
      </main>
    </div>
  `;

  container.querySelectorAll('[data-role]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const rolKey = btn.getAttribute('data-role');
      loginByRole(rolKey);
      window.location.hash = '#/inicio';
    });
  });
}
