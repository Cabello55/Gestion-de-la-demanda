/**
 * Reglas de notificación — Boceto Funcional §[5.2].
 */
export const mockNotificacionesConfig = [
  {
    id: 'NOTIF-001',
    evento: 'Perfil pendiente de validación',
    destinatario: 'GDD',
    activa: true,
  },
  {
    id: 'NOTIF-002',
    evento: 'Perfil validado o rechazado',
    destinatario: 'Profesional/RP',
    activa: true,
  },
  {
    id: 'NOTIF-003',
    evento: 'Asignación aprobada',
    destinatario: 'Profesional y RP',
    activa: true,
  },
  {
    id: 'NOTIF-004',
    evento: 'Asignación rechazada',
    destinatario: 'RP',
    activa: true,
  },
  {
    id: 'NOTIF-005',
    evento: 'Solicitud de actualización del CV',
    destinatario: 'Profesional',
    activa: true,
  },
];
