export const SENIORITIES = ['Junior', 'Semi Senior', 'Senior', 'Manager'];
export const ESTADOS_DISPONIBILIDAD = ['Disponible', 'Reservado', 'Asignado', 'No disponible'];
export const ESTADOS_GDD_MENU = ['Disponible', 'Reservado', 'Asignado', 'No disponible'];

export const ORDEN_OPCIONES = [
  { value: 'matching', label: 'Mejor matching' },
  { value: 'disponibilidad', label: 'Mayor disponibilidad' },
  { value: 'coste', label: 'Menor coste' },
  { value: 'experiencia', label: 'Más experiencia' },
];

export const PAGE_SIZE = 10;
export const MAX_COMPARADOR = 4;

export const DEFAULT_FILTROS_RP = {
  keyword: '',
  tecnologia: '',
  rol: '',
  seniority: '',
  disponibilidad: '',
  soloDisponibles: false,
};

/** GDD: por defecto oculta "No disponible" salvo que se marque el checkbox. */
export const DEFAULT_FILTROS_GDD = {
  keyword: '',
  tecnologia: '',
  rol: '',
  seniority: '',
  disponibilidad: '__TODOS__',
  incluirNoDisponibles: false,
};

export function labelSeniority(seniority) {
  if (seniority === 'Mid') return 'Semi Senior';
  return seniority ?? '—';
}

export function labelEstadoBolsa(estado) {
  if (estado === 'Reservado') return 'Reservada';
  return estado ?? '—';
}

export function seniorityFilterValue(seniority) {
  if (seniority === 'Mid') return 'Semi Senior';
  return seniority ?? '';
}

export function getTagsProfesional(profesional, limit = 4) {
  const fromSkills = (profesional.skills ?? []).map((s) =>
    typeof s === 'string' ? s : s.nombre
  );
  const fromTech = profesional.tecnologias ?? [];
  const seen = new Set();
  const tags = [];
  for (const t of [...fromSkills, ...fromTech]) {
    if (!t || seen.has(t)) continue;
    seen.add(t);
    tags.push(t);
    if (tags.length >= limit) break;
  }
  return tags;
}

export function getCatalogos(profesionales = []) {
  const tecnologias = new Set();
  const roles = new Set();

  for (const p of profesionales) {
    if (p.rol) roles.add(p.rol);
    for (const t of p.tecnologias ?? []) tecnologias.add(t);
    for (const s of p.skills ?? []) {
      const nombre = typeof s === 'string' ? s : s.nombre;
      if (nombre) tecnologias.add(nombre);
    }
  }

  return {
    tecnologias: [...tecnologias].sort((a, b) => a.localeCompare(b, 'es')),
    roles: [...roles].sort((a, b) => a.localeCompare(b, 'es')),
  };
}

/**
 * @param {'rp'|'gdd'} variant
 */
export function filtrarProfesionales(profesionales = [], filtros = {}, variant = 'rp') {
  const keyword = String(filtros.keyword ?? '')
    .trim()
    .toLowerCase();

  return profesionales.filter((p) => {
    if (variant === 'rp') {
      if (filtros.soloDisponibles && p.estado !== 'Disponible') return false;
      if (!filtros.disponibilidad && p.estado === 'No disponible') return false;
    }

    if (variant === 'gdd') {
      if (!filtros.incluirNoDisponibles && p.estado === 'No disponible') return false;
    }

    const disp = filtros.disponibilidad;
    if (disp && disp !== '__TODOS__' && p.estado !== disp) return false;

    if (filtros.rol && p.rol !== filtros.rol) return false;

    if (filtros.seniority && seniorityFilterValue(p.seniority) !== filtros.seniority) {
      return false;
    }

    if (filtros.tecnologia) {
      const tags = getTagsProfesional(p, 99);
      if (!tags.some((t) => t === filtros.tecnologia)) return false;
    }

    if (keyword) {
      const haystack = [p.nombre, p.rol, ...getTagsProfesional(p, 99)]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(keyword)) return false;
    }

    return true;
  });
}

export function ordenarProfesionales(profesionales = [], orden = 'matching') {
  const list = [...profesionales];

  list.sort((a, b) => {
    if (orden === 'disponibilidad') {
      return (b.disponibilidad?.porcentaje ?? 0) - (a.disponibilidad?.porcentaje ?? 0);
    }
    if (orden === 'coste') {
      return (a.coste?.tarifaDia ?? 0) - (b.coste?.tarifaDia ?? 0);
    }
    if (orden === 'experiencia') {
      return (b.experienciaAnios ?? 0) - (a.experienciaAnios ?? 0);
    }
    return (b.matchingDemo ?? 0) - (a.matchingDemo ?? 0);
  });

  return list;
}

export function paginar(lista = [], pagina = 1, pageSize = PAGE_SIZE) {
  const total = lista.length;
  const totalPaginas = Math.max(1, Math.ceil(total / pageSize));
  const paginaSegura = Math.min(Math.max(1, pagina), totalPaginas);
  const inicio = (paginaSegura - 1) * pageSize;
  return {
    items: lista.slice(inicio, inicio + pageSize),
    pagina: paginaSegura,
    totalPaginas,
    total,
  };
}

export function matchingMostrable(profesional) {
  if (profesional?.estado === 'No disponible') return null;
  if (profesional?.matchingDemo == null) return null;
  return profesional.matchingDemo;
}

export function exportarProfesionalesCsv(profesionales = []) {
  const headers = ['Nombre', 'Rol', 'Estado', 'Disponibilidad %', 'Matching %', 'Coste/día'];
  const rows = profesionales.map((p) => {
    const matching = matchingMostrable(p);
    return [
      p.nombre ?? '',
      p.rol ?? '',
      p.estado ?? '',
      p.disponibilidad?.porcentaje ?? '',
      matching != null ? matching : '',
      p.coste?.tarifaDia ?? '',
    ];
  });

  const escape = (v) => `"${String(v).replace(/"/g, '""')}"`;
  const csv = [headers, ...rows].map((row) => row.map(escape).join(',')).join('\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `bolsa-profesionales-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
