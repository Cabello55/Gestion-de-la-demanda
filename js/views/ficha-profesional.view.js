import { getProfesionales, getUsuarioActivo } from '../state.js';

export function renderFichaProfesionalView(container, ctx) {
  const usuarioActivo = getUsuarioActivo();
  const profesionales = getProfesionales();
  const profesionalId = ctx?.param ?? null;

  const prof = profesionales.find((p) => p.id === profesionalId);

  if (!prof) {
    container.innerHTML = `
      <section>
        <h2 class="section-title">Ficha profesional</h2>
        <p class="muted">No se encontró el profesional: <strong>${profesionalId ?? '-'}</strong></p>
        <a class="btn" href="#/bolsa-profesionales">Volver</a>
      </section>
    `;
    return;
  }

  container.innerHTML = `
    <section>
      <h2 class="section-title">Ficha profesional</h2>
      <p class="muted" style="margin-top:0;">
        Rol: <strong>${usuarioActivo?.rolKey ?? '-'}</strong>
      </p>

      <div class="role-card">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:var(--space-3);">
          <div>
            <div style="font-weight:900;font-size:16px;">${prof.nombre}</div>
            <div class="muted" style="font-size:12px;margin-top:var(--space-1);">
              ${prof.ubicacion ?? ''} • Estado: ${prof.estado ?? '-'}
            </div>
          </div>
          <div class="avatar" title="Identificador">${prof.id.slice(0, 2).toUpperCase()}</div>
        </div>

        <div style="margin-top:var(--space-4);display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4);">
          <div>
            <div class="muted" style="font-size:12px;">Seniority</div>
            <div style="font-weight:900;">${prof.seniority ?? '-'}</div>
          </div>
          <div>
            <div class="muted" style="font-size:12px;">Disponibilidad</div>
            <div style="font-weight:900;">${prof.disponibilidad?.porcentaje ?? '-'}%</div>
          </div>
        </div>
      </div>

      <div style="margin-top:var(--space-4);" class="muted">
        Esta ficha es un stub inicial. En la siguiente iteración rellenaremos campos y acciones según rol.
      </div>
    </section>
  `;
}

