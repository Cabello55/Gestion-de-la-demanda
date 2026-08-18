import { getUsuarioActivo, getState } from './state.js';
import { cerrarSesion } from './auth.js';
import { salirDeLaDemo } from './site-access.js';
import { renderLoginView } from './views/login.view.js';
import { renderInicioView } from './views/inicio.view.js';
import { renderBolsaProfesionalesView } from './views/bolsa-profesionales.view.js';
import { renderFichaProfesionalView } from './views/ficha-profesional.view.js';
import { renderSolicitudesView } from './views/solicitudes.view.js';
import { renderMiPerfilView } from './views/mi-perfil.view.js';
import { renderHeader } from './components/header.js';
import { renderSidebar, wireSidebarStubs } from './components/sidebar.js';

const appEl = () => document.getElementById('app');
const viewCssLink = () => document.getElementById('view-css');

function setViewCss(cssPath) {
  const link = viewCssLink();
  if (!link) return;
  if (!cssPath) {
    link.href = '';
    return;
  }
  link.href = cssPath;
}

function parseRoute() {
  const hash = window.location.hash || '#/login';
  const cleaned = hash.replace(/^#\/?/, '');
  const [pathPart, queryPart] = cleaned.split('?');
  const [ruta, param] = (pathPart || '').split('/');
  const query = {};
  if (queryPart) {
    for (const pair of queryPart.split('&')) {
      const [k, v] = pair.split('=');
      if (k) query[decodeURIComponent(k)] = decodeURIComponent(v ?? '');
    }
  }
  return { ruta: ruta || null, param: param || null, query, raw: hash };
}

function mountUnaVista(viewRender, ctx, viewCss, currentRoute) {
  const root = appEl();
  if (!root) return;

  // App shell por defecto cuando hay sesión.
  const usuarioActivo = getUsuarioActivo();
  const loggedIn = Boolean(usuarioActivo);

  if (loggedIn && viewRender !== renderLoginView) {
    root.innerHTML = `
      <div class="app-shell">
        <header class="app-header">
          <div class="app-header__inner">
            ${renderHeader({ usuarioActivo, currentRoute })}
          </div>
        </header>
        <div class="app-body">
          <aside class="app-sidebar">
            ${renderSidebar({ usuarioActivo, currentRoute })}
          </aside>
          <main class="app-content" aria-live="polite"></main>
        </div>
      </div>
    `;
    setViewCss(viewCss);

    const content = root.querySelector('.app-content');
    viewRender(content, ctx);
  } else {
    // Login (sin shell)
    root.innerHTML = `<main aria-live="polite"></main>`;
    setViewCss(viewCss);
    const content = root.querySelector('main');
    viewRender(content, ctx);
  }
}

function resolveAndRender() {
  const { ruta, param, query } = parseRoute();
  const usuarioActivo = getUsuarioActivo();
  const loggedIn = Boolean(usuarioActivo);

  // Sin sesión: solo login.
  if (!loggedIn) {
    if (ruta !== 'login') {
      window.location.hash = '#/login';
      return;
    }
  } else if (!ruta || ruta === 'login') {
    // Con sesión, no se vuelve a login salvo por el botón de salir.
    // Hash vacío (#) o login forzado → redirigir a inicio.
    window.location.hash = '#/inicio';
    return;
  }

  const ctx = { ...getState(), param, query };

  switch (ruta) {
    case 'login':
      mountUnaVista(renderLoginView, ctx, './css/views/login.css', ruta);
      break;
    case 'inicio':
      mountUnaVista(renderInicioView, ctx, './css/views/inicio.css', ruta);
      break;
    case 'bolsa-profesionales':
      mountUnaVista(renderBolsaProfesionalesView, ctx, './css/views/bolsa-profesionales.css', ruta);
      break;
    case 'ficha-profesional':
      // Alias por si lo usas en el futuro.
      mountUnaVista(renderFichaProfesionalView, { ...ctx, param }, './css/views/ficha-profesional.css', ruta);
      break;
    case 'ficha':
      mountUnaVista(renderFichaProfesionalView, ctx, './css/views/ficha-profesional.css', ruta);
      break;
    case 'solicitudes':
      mountUnaVista(renderSolicitudesView, ctx, './css/views/solicitudes.css', ruta);
      break;
    case 'profesionales':
      mountUnaVista((c) => {
        c.innerHTML = '';
      }, ctx, '', ruta);
      break;
    case 'mi-perfil':
      mountUnaVista(renderMiPerfilView, ctx, './css/views/mi-perfil.css', ruta);
      break;
    case 'validaciones':
    case 'conflictos':
      // Rutas reservadas (pantallas pendientes). Sin placeholder de "en construcción".
      mountUnaVista((container) => {
        container.innerHTML = '';
      }, ctx, '', ruta);
      break;
    case 'admin':
      // Subrutas Admin (#/admin/usuarios, workflow, logs, …) — stubs vacíos.
      mountUnaVista((container) => {
        container.innerHTML = '';
      }, ctx, '', ruta);
      break;
    default:
      // Ruta desconocida: reencaminamos.
      window.location.hash = loggedIn ? '#/inicio' : '#/login';
      break;
  }

  // Wiring de acciones globales (logout) una vez montada la UI.
  const root = appEl();
  if (root) {
    wireSidebarStubs(root);

    const logoutBtn = root.querySelector('[data-action="logout"]');
    if (logoutBtn) {
      logoutBtn.onclick = () => {
        cerrarSesion();
        salirDeLaDemo();
      };
    }
  }
}

export function startRouter() {
  window.addEventListener('hashchange', resolveAndRender);
  resolveAndRender();
}

