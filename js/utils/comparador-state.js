import { MAX_COMPARADOR } from './bolsa-busqueda.js';

const comparadorByVariant = { rp: [], gdd: [] };

export function getComparador(variant = 'rp') {
  return comparadorByVariant[variant] ?? [];
}

export function isInComparador(variant, id) {
  return getComparador(variant).includes(id);
}

export function addToComparador(variant, id) {
  const list = getComparador(variant);
  if (list.includes(id)) return { ok: true, full: false, already: true };
  if (list.length >= MAX_COMPARADOR) return { ok: false, full: true, already: false };
  comparadorByVariant[variant] = [...list, id];
  return { ok: true, full: false, already: false };
}

export function toggleComparador(variant, id) {
  const list = getComparador(variant);
  if (list.includes(id)) {
    comparadorByVariant[variant] = list.filter((x) => x !== id);
    return { removed: true };
  }
  if (list.length >= MAX_COMPARADOR) return { removed: false, full: true };
  comparadorByVariant[variant] = [...list, id];
  return { removed: false, full: false };
}

export function seleccionarPaginaComparador(variant, idsPagina) {
  const next = [...getComparador(variant)];
  for (const id of idsPagina) {
    if (next.includes(id)) continue;
    if (next.length >= MAX_COMPARADOR) break;
    next.push(id);
  }
  comparadorByVariant[variant] = next;
}

export function deseleccionarPaginaComparador(variant, idsPagina) {
  const quitar = new Set(idsPagina);
  comparadorByVariant[variant] = getComparador(variant).filter((id) => !quitar.has(id));
}

const STORAGE_GUARDADOS = 'profesionalesGuardados';

export function guardarProfesionalParaDespues(profesionalId) {
  try {
    const raw = localStorage.getItem(STORAGE_GUARDADOS);
    const list = raw ? JSON.parse(raw) : [];
    if (!list.includes(profesionalId)) {
      list.push(profesionalId);
      localStorage.setItem(STORAGE_GUARDADOS, JSON.stringify(list));
    }
    return true;
  } catch {
    return false;
  }
}
