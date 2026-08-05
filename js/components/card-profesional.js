import { renderBadgeEstado } from './badge-estado.js';

function inicialesNombre(nombre = '') {
  const parts = String(nombre).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '--';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function formatUbicacion(profesional) {
  const raw = profesional.ubicacion ?? '';
  const ciudad = raw.split(',')[0].trim() || raw;
  const movilidad = profesional.disponibilidad?.movilidad;
  if (ciudad && movilidad) return `${ciudad} (${movilidad})`;
  return ciudad || movilidad || '—';
}

function topTags(profesional, limit = 4) {
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

/**
 * Card de profesional para resultados de Bolsa (reutilizable por rol).
 *
 * @param {object} profesional
 * @param {{
 *   matching?: number | null,
 *   matchingLabel?: string,
 *   ctaLabel?: string,
 *   ctaHref?: string,
 * }} [opts]
 */
export function renderCardProfesional(profesional, opts = {}) {
  if (!profesional) return '';

  const {
    matching = null,
    matchingLabel = 'Matching',
    ctaLabel = 'Ver ficha',
    ctaHref = `#/ficha/${profesional.id}`,
  } = opts;

  const pct = profesional.disponibilidad?.porcentaje;
  const pctText = pct == null ? '' : `${pct}%`;
  const tags = topTags(profesional);
  const matchingClamped =
    matching == null ? null : Math.max(0, Math.min(100, Number(matching) || 0));

  return `
    <article class="card-profesional">
      <div class="card-profesional__main">
        <div class="card-profesional__avatar" aria-hidden="true">
          ${inicialesNombre(profesional.nombre)}
        </div>

        <div class="card-profesional__content">
          <div class="card-profesional__identity">
            <h3 class="card-profesional__name">${profesional.nombre ?? '—'}</h3>
            <p class="card-profesional__role">${profesional.rol ?? '—'}</p>
          </div>

          <div class="card-profesional__meta">
            <span class="card-profesional__disponibilidad">
              ${renderBadgeEstado({ estado: profesional.estado })}
              ${pctText ? `<span class="card-profesional__pct">${pctText}</span>` : ''}
            </span>
            <span class="card-profesional__ubicacion">
              <i class="fa-solid fa-location-dot" aria-hidden="true"></i>
              ${formatUbicacion(profesional)}
            </span>
          </div>

          ${
            tags.length
              ? `<ul class="card-profesional__tags">
                  ${tags.map((t) => `<li class="card-profesional__tag">${t}</li>`).join('')}
                </ul>`
              : ''
          }

          <div class="card-profesional__facts">
            <span><strong>Seniority:</strong> ${profesional.seniority ?? '—'}</span>
            <span><strong>Experiencia:</strong> ${
              profesional.experienciaAnios != null
                ? `${profesional.experienciaAnios} años`
                : '—'
            }</span>
          </div>

          ${
            matchingClamped != null
              ? `
            <div class="card-profesional__matching">
              <div class="card-profesional__matching-label">
                <span>${matchingLabel}:</span>
                <strong>${matchingClamped}%</strong>
              </div>
              <div class="card-profesional__matching-track" aria-hidden="true">
                <span
                  class="card-profesional__matching-fill"
                  style="width:${matchingClamped}%"
                ></span>
              </div>
            </div>
          `
              : ''
          }
        </div>
      </div>

      <div class="card-profesional__actions">
        <a class="btn btn--primary" href="${ctaHref}">${ctaLabel}</a>
      </div>
    </article>
  `;
}
