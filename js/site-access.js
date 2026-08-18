const STORAGE_KEY = 'gdd_site_access_ok';

/**
 * Credenciales de la barrera previa a la demo.
 * Cámbialas aquí y vuelve a desplegar. Estas son las que compartirás con el enlace.
 */
export const SITE_ACCESS_CREDENTIALS = {
  usuario: 'ayesa',
  password: 'Demanda2026',
};

export function hasSiteAccess() {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function grantSiteAccess() {
  try {
    sessionStorage.setItem(STORAGE_KEY, '1');
  } catch {
    // Si el navegador bloquea sessionStorage, la sesión no se recuerda.
  }
}

export function checkSiteAccess(usuario, password) {
  return (
    usuario.trim() === SITE_ACCESS_CREDENTIALS.usuario &&
    password === SITE_ACCESS_CREDENTIALS.password
  );
}

export function revokeSiteAccess() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Si el navegador bloquea el storage, no hay nada que limpiar.
  }
}

export function salirDeLaDemo() {
  revokeSiteAccess();
  window.location.hash = '#/login';
  window.location.reload();
}
