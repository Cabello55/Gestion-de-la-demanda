/**
 * Paginación client-side reutilizable.
 */
export function renderPaginacion({ pagina = 1, totalPaginas = 1 } = {}) {
  if (totalPaginas <= 1) {
    return `<nav class="bolsa-pagination" aria-label="Paginación"></nav>`;
  }

  const pages = buildPageList(pagina, totalPaginas);

  return `
    <nav class="bolsa-pagination" aria-label="Paginación">
      <button
        type="button"
        class="bolsa-pagination__btn"
        data-action="pagina"
        data-page="${pagina - 1}"
        ${pagina <= 1 ? 'disabled' : ''}
        aria-label="Página anterior"
      >
        <i class="fa-solid fa-chevron-left" aria-hidden="true"></i>
      </button>

      ${pages
        .map((item) => {
          if (item === '…') {
            return `<span class="bolsa-pagination__ellipsis">…</span>`;
          }
          const active = item === pagina;
          return `
            <button
              type="button"
              class="bolsa-pagination__btn ${active ? 'bolsa-pagination__btn--active' : ''}"
              data-action="pagina"
              data-page="${item}"
              ${active ? 'aria-current="page"' : ''}
            >
              ${item}
            </button>
          `;
        })
        .join('')}

      <button
        type="button"
        class="bolsa-pagination__btn"
        data-action="pagina"
        data-page="${pagina + 1}"
        ${pagina >= totalPaginas ? 'disabled' : ''}
        aria-label="Página siguiente"
      >
        <i class="fa-solid fa-chevron-right" aria-hidden="true"></i>
      </button>
    </nav>
  `;
}

function buildPageList(current, total) {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages = new Set([1, total, current, current - 1, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);

  const result = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) result.push('…');
    result.push(sorted[i]);
  }
  return result;
}
