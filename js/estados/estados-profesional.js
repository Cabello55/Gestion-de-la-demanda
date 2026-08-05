// Máquina de estados (esqueleto).
// Disponible -> Solicitado -> Reservado -> Asignado
// con posibilidad de retorno a Disponible y un estado extra: No disponible.

export const estadosProfesional = ['Disponible', 'Solicitado', 'Reservado', 'Asignado', 'No disponible'];

// Transiciones simuladas (pendiente de definir según matriz de permisos).
export function getTransiciones(_estadoActual, _rolKey) {
  return [];
}

