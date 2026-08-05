import { getProfesionales, getUsuarioActivo } from '../state.js';
import { renderCardProfesional } from '../components/card-profesional.js';

function isPerfilCompleto(profesional) {
  return Boolean(profesional?.id && profesional?.nombre && profesional?.rol);
}

function resolveProfesionalPropio(usuarioActivo, profesionales) {
  if (usuarioActivo?.profesionalId) {
    return profesionales.find((p) => p.id === usuarioActivo.profesionalId) ?? null;
  }
  return profesionales.find((p) => p.nombre === usuarioActivo?.nombre) ?? null;
}

function renderBolsaEmptyPropio() {
  return `
    <div class="bolsa-empty">
      <p class="bolsa-empty__text">
        Tu perfil aún no está completo — ve a Mi Perfil para completarlo
      </p>
      <a class="btn btn--primary" href="#/mi-perfil">Ir a Mi Perfil</a>
    </div>
  `;
}

function renderBolsaProfesional(container, usuarioActivo) {
  const profesionales = getProfesionales();
  const propio = resolveProfesionalPropio(usuarioActivo, profesionales);
  const completo = isPerfilCompleto(propio);

  container.innerHTML = `
    <section class="bolsa">
      <header class="bolsa__header">
        <h1 class="bolsa__title">Bolsa de Profesionales</h1>
        <p class="bolsa__subtitle">Busca y encuentra el talento que tu proyecto necesita.</p>
      </header>

      <div class="bolsa-banner" role="status">
        <i class="fa-solid fa-circle-info bolsa-banner__icon" aria-hidden="true"></i>
        <p class="bolsa-banner__text">Solo puedes ver tu propio perfil</p>
      </div>

      <div class="bolsa-results">
        ${
          completo
            ? renderCardProfesional(propio, {
                matching: 100,
                matchingLabel: 'Matching con tu perfil',
                ctaLabel: 'Ver mi perfil',
                ctaHref: `#/ficha/${propio.id}`,
              })
            : renderBolsaEmptyPropio()
        }
      </div>

      ${
        completo
          ? `<p class="bolsa-footer">Mostrando 1 de 1 profesional</p>`
          : ''
      }
    </section>
  `;
}

function renderBolsaOtrosRoles(container, usuarioActivo) {
  container.innerHTML = `
    <section class="bolsa">
      <header class="bolsa__header">
        <h1 class="bolsa__title">Bolsa de Profesionales</h1>
        <p class="bolsa__subtitle">Busca y encuentra el talento que tu proyecto necesita.</p>
      </header>
      <p class="bolsa__pending muted">
        Vista de búsqueda para el rol <strong>${usuarioActivo?.rolKey ?? '-'}</strong>
        (pendiente de especificar en tareas posteriores).
      </p>
    </section>
  `;
}

export function renderBolsaProfesionalesView(container) {
  const usuarioActivo = getUsuarioActivo();

  if (usuarioActivo?.rolKey === 'PROFESIONAL') {
    renderBolsaProfesional(container, usuarioActivo);
    return;
  }

  renderBolsaOtrosRoles(container, usuarioActivo);
}
