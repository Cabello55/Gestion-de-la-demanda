/** Catálogo de RPs del ámbito (para joins de nombre; no todos son usuarios de login). */
export const catalogoRp = [
  { id: 'USR-RP-001', nombre: 'Ana García' },
  { id: 'USR-RP-002', nombre: 'Laura Gómez' },
  { id: 'USR-RP-003', nombre: 'Carlos Ruiz' },
  { id: 'USR-RP-004', nombre: 'María López' },
  { id: 'USR-RP-005', nombre: 'Marta López' },
];

export function getNombreRp(rpId) {
  const hit = catalogoRp.find((r) => r.id === rpId);
  return hit?.nombre ?? rpId ?? '—';
}
