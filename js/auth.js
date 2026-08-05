import { rolesLabels, usuariosDemo } from './data/mock-usuarios.js';
import { getUsuarioActivo, setUsuarioActivo, logout } from './state.js';

export function getRolesDemo() {
  return usuariosDemo.map((usuario) => ({
    ...usuario,
    label: rolesLabels[usuario.rolKey] ?? usuario.rolKey,
  }));
}

export function loginByRole(rolKey) {
  const user = usuariosDemo.find((u) => u.rolKey === rolKey);
  if (!user) {
    console.warn('Rol no encontrado en mocks:', rolKey);
    return;
  }

  setUsuarioActivo(user);
}

export function cerrarSesion() {
  logout();
}

export function getUsuario() {
  return getUsuarioActivo();
}
