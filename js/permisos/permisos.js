// Matriz de permisos + especificación de navegación por rol.
// Fuente de verdad de header/sidebar según Boceto Funcional y cambios confirmados.

export const NAVEGACION_POR_ROL = {
  PROFESIONAL: {
    header: [
      { ruta: 'inicio', label: 'Inicio', href: '#/inicio' },
      { ruta: 'bolsa-profesionales', label: 'Bolsa de Profesionales', href: '#/bolsa-profesionales' },
      { ruta: 'solicitudes', label: 'Solicitudes', href: '#/solicitudes' },
    ],
    // Sidebar Profesional (construido): solo Inicio, Mi perfil, Mis Procesos.
    // "Mis Solicitudes" consolidado en Mis Procesos; sin Notificaciones ni Guía de Uso.
    sidebar: [
      { ruta: 'inicio', label: 'Inicio', href: '#/inicio', icon: 'fa-house' },
      { ruta: 'mi-perfil', label: 'Mi perfil', href: '#/mi-perfil', icon: 'fa-user' },
      { ruta: 'solicitudes', label: 'Mis Procesos', href: '#/solicitudes', icon: 'fa-clipboard-list' },
    ],
  },

  RP: {
    // Header sin Informes (decisión confirmada).
    header: [
      { ruta: 'inicio', label: 'Inicio', href: '#/inicio' },
      { ruta: 'bolsa-profesionales', label: 'Bolsa de Profesionales', href: '#/bolsa-profesionales' },
      { ruta: 'solicitudes', label: 'Solicitudes', href: '#/solicitudes' },
    ],
    // Sidebar RP según Inicio [4.1]: Inicio, Buscar, Mis Solicitudes, Recursos Incorporados, Notificaciones.
    sidebar: [
      { ruta: 'inicio', label: 'Inicio', href: '#/inicio', icon: 'fa-house' },
      {
        ruta: 'bolsa-profesionales',
        label: 'Buscar Profesionales',
        href: '#/bolsa-profesionales',
        icon: 'fa-magnifying-glass',
      },
      { ruta: 'solicitudes', label: 'Mis Solicitudes', href: '#/solicitudes', icon: 'fa-file-lines' },
      {
        ruta: 'recursos-incorporados',
        label: 'Recursos Incorporados',
        href: null,
        icon: 'fa-box',
      },
      {
        ruta: 'notificaciones',
        label: 'Notificaciones',
        href: null,
        icon: 'fa-bell',
        badge: 5,
      },
    ],
  },

  KCM: {
    // Header con Informes (decisión confirmada: KCM y GDD sí lo mantienen).
    header: [
      { ruta: 'inicio', label: 'Inicio', href: '#/inicio' },
      { ruta: 'bolsa-profesionales', label: 'Bolsa de Profesionales', href: '#/bolsa-profesionales' },
      { ruta: 'solicitudes', label: 'Solicitudes', href: '#/solicitudes' },
      { ruta: 'informes', label: 'Informes', href: null },
    ],
    // Sidebar KCM según Inicio [4.1].
    sidebar: [
      { ruta: 'inicio', label: 'Inicio', href: '#/inicio', icon: 'fa-house' },
      { ruta: 'solicitudes', label: 'Mis Solicitudes', href: '#/solicitudes', icon: 'fa-file-lines' },
      {
        ruta: 'solicitudes-equipo',
        label: 'Solicitudes de mi Equipo',
        href: '#/solicitudes?vista=equipo',
        icon: 'fa-users',
      },
      { ruta: 'recursos-asignados', label: 'Recursos Asignados', href: null, icon: 'fa-box' },
      { ruta: 'recursos-pendientes', label: 'Recursos Pendientes', href: null, icon: 'fa-hourglass-half' },
      {
        ruta: 'bolsa-profesionales',
        label: 'Buscar Profesionales',
        href: '#/bolsa-profesionales',
        icon: 'fa-magnifying-glass',
      },
      { ruta: 'informes', label: 'Informes', href: null, icon: 'fa-chart-column' },
      {
        ruta: 'notificaciones',
        label: 'Notificaciones',
        href: null,
        icon: 'fa-bell',
        badge: 6,
      },
    ],
  },

  GDD: {
    // Sin "Administración": GDD no administra usuarios/roles/config técnica.
    header: [
      { ruta: 'inicio', label: 'Inicio', href: '#/inicio' },
      { ruta: 'bolsa-profesionales', label: 'Bolsa de Profesionales', href: '#/bolsa-profesionales' },
      { ruta: 'solicitudes', label: 'Solicitudes', href: '#/solicitudes' },
      { ruta: 'informes', label: 'Informes', href: null },
    ],
    // Sidebar GDD según Inicio [4.1].
    sidebar: [
      { ruta: 'inicio', label: 'Inicio', href: '#/inicio', icon: 'fa-house' },
      { ruta: 'solicitudes', label: 'Solicitudes', href: '#/solicitudes', icon: 'fa-file-lines' },
      {
        ruta: 'bolsa-profesionales',
        label: 'Profesionales',
        href: '#/bolsa-profesionales',
        icon: 'fa-users',
      },
      { ruta: 'validaciones', label: 'Validaciones', href: '#/validaciones', icon: 'fa-circle-check' },
      {
        ruta: 'conflictos',
        label: 'Conflictos',
        href: '#/conflictos',
        icon: 'fa-triangle-exclamation',
      },
      { ruta: 'informes', label: 'Informes', href: null, icon: 'fa-chart-column' },
      {
        ruta: 'notificaciones',
        label: 'Notificaciones',
        href: null,
        icon: 'fa-bell',
        badge: 9,
      },
    ],
  },

  // Gestor de Plataforma (Admin). No participa en Staffing (sin Bolsa / Solicitudes).
  ADMIN: {
    header: [
      { ruta: 'inicio', label: 'Inicio', href: '#/inicio' },
      { ruta: 'administracion', label: 'Administración', href: '#/admin/usuarios' },
      { ruta: 'logs', label: 'Logs', href: '#/admin/logs' },
    ],
    sidebar: [
      { ruta: 'inicio', label: 'Inicio', href: '#/inicio', icon: 'fa-house' },
      {
        ruta: 'admin-usuarios',
        label: 'Usuarios y Roles',
        href: '#/admin/usuarios',
        icon: 'fa-users',
      },
      {
        ruta: 'admin-workflow',
        label: 'Configuración de Workflow',
        href: '#/admin/workflow',
        icon: 'fa-diagram-project',
      },
      {
        ruta: 'admin-ia',
        label: 'Parámetros de IA',
        href: '#/admin/ia',
        icon: 'fa-robot',
      },
      {
        ruta: 'admin-integraciones',
        label: 'Integraciones',
        href: '#/admin/integraciones',
        icon: 'fa-plug',
      },
      {
        ruta: 'admin-logs',
        label: 'Logs y Auditoría',
        href: '#/admin/logs',
        icon: 'fa-file-lines',
      },
      {
        ruta: 'admin-notificaciones',
        label: 'Notificaciones (config.)',
        href: '#/admin/notificaciones',
        icon: 'fa-bell',
      },
    ],
  },
};

/** Alias interno del rol demo GESTOR → ADMIN */
const ROL_ALIASES = {
  GESTOR: 'ADMIN',
};

export function normalizarRolKey(rolKey) {
  if (!rolKey) return 'PROFESIONAL';
  return ROL_ALIASES[rolKey] ?? rolKey;
}

export function getNavegacionPorRol(rolKey) {
  const key = normalizarRolKey(rolKey);
  return NAVEGACION_POR_ROL[key] ?? NAVEGACION_POR_ROL.PROFESIONAL;
}

export function getHeaderPorRol(rolKey) {
  return getNavegacionPorRol(rolKey).header;
}

export function getSidebarPorRol(rolKey) {
  return getNavegacionPorRol(rolKey).sidebar;
}

export function getPermisosPorRol(_rolKey) {
  return {
    puedeVer: true,
    puedeEditar: false,
    puedeAprobar: false,
    puedeCambiarEstadoProfesional: false,
  };
}

export function tienePermiso(rolKey, _accion) {
  // Temporal: todo permitido para construir pantallas. Se refinará con la matriz real.
  return Boolean(rolKey);
}
