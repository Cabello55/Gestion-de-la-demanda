import { checkSiteAccess, grantSiteAccess } from '../site-access.js';

export function renderSiteAccessView(container, onGranted) {
  document.title = 'Acceso';

  container.innerHTML = `
    <div class="site-access-page">
      <div class="login-panel site-access-card">
        <header class="login-panel__header">
          <h1 class="login-panel__title">Acceso</h1>
          <p class="login-panel__intro">
            Introduce usuario y contraseña para continuar.
          </p>
        </header>

        <form class="site-access-form" novalidate>
          <label class="site-access-field">
            <span class="site-access-field__label">Usuario</span>
            <input
              class="site-access-field__input"
              type="text"
              name="usuario"
              autocomplete="username"
              required
              autofocus
            />
          </label>

          <label class="site-access-field">
            <span class="site-access-field__label">Contraseña</span>
            <input
              class="site-access-field__input"
              type="password"
              name="password"
              autocomplete="current-password"
              required
            />
          </label>

          <p class="site-access-form__error" hidden role="alert"></p>

          <button class="btn btn--primary site-access-form__submit" type="submit">
            Entrar
          </button>
        </form>
      </div>
    </div>
  `;

  const form = container.querySelector('.site-access-form');
  const errorEl = container.querySelector('.site-access-form__error');

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const usuario = String(data.get('usuario') ?? '');
    const password = String(data.get('password') ?? '');

    if (!checkSiteAccess(usuario, password)) {
      errorEl.hidden = false;
      errorEl.textContent = 'Usuario o contraseña incorrectos.';
      form.querySelector('[name="password"]').value = '';
      form.querySelector('[name="password"]').focus();
      return;
    }

    grantSiteAccess();
    document.title = 'Gestión de la Demanda - Demo Staffing';
    onGranted();
  });
}
