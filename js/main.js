import { initState } from './state.js';
import { startRouter } from './router.js';
import { hasSiteAccess } from './site-access.js';
import { renderSiteAccessView } from './views/site-access.view.js';

function startApp() {
  initState();
  startRouter();
}

function showSiteAccessGate() {
  const root = document.getElementById('app');
  const css = document.getElementById('view-css');
  if (!root) return;

  if (css) css.href = './css/views/login.css';
  root.innerHTML = '<main aria-live="polite"></main>';
  renderSiteAccessView(root.querySelector('main'), startApp);
}

if (hasSiteAccess()) {
  startApp();
} else {
  showSiteAccessGate();
}

