/**
 * Badge de estado reutilizable.
 * @param {{ estado?: string, variante?: string }} opts
 * variante opcional fuerza la clase; si no, se infiere del texto.
 */
export function renderBadgeEstado({ estado, variante } = {}) {
  const label = estado ?? '-';
  const variantClass = variante
    ? `badge-estado--${variante}`
    : `badge-estado--${inferVariante(label)}`;

  return `
    <span class="badge-estado ${variantClass}">
      ${label}
    </span>
  `;
}

/** Etiqueta de visualización para estados de solicitud en tablas. */
export function labelEstadoSolicitud(estado) {
  if (estado === 'Pendiente') return 'Pendiente de aprobación';
  return estado ?? '-';
}

/** Etiqueta visual para niveles de log. */
export function labelNivelLog(nivel) {
  const key = String(nivel ?? '').toLowerCase();
  if (key === 'info') return 'Info';
  if (key === 'warning') return 'Warning';
  if (key === 'error') return 'Error';
  return nivel ?? '-';
}

function inferVariante(label) {
  const key = String(label).toLowerCase();

  if (
    [
      'disponible',
      'actualizado',
      'completada',
      'confirmado',
      'aprobada',
      'activa',
    ].includes(key)
  ) {
    return 'exito';
  }
  if (
    key === 'pendiente' ||
    key === 'pendiente de aprobación' ||
    key === 'solicitado' ||
    key === 'en curso' ||
    key === 'warning'
  ) {
    return 'aviso';
  }
  if (key === 'en entrevista' || key === 'reservado') {
    return 'info';
  }
  if (key === 'asignado') {
    return 'asignado';
  }
  if (key === 'rechazada' || key === 'cancelada' || key === 'error') {
    return 'error';
  }
  // Logs "info" y estados inactivos → gris neutro
  if (key === 'info' || key === 'no disponible' || key === 'finalizada' || key === 'inactiva') {
    return 'neutro';
  }
  return 'neutro';
}
