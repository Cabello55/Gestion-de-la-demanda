import { getSolicitudes, getUsuarioActivo, getProfesionales } from '../state.js';

export function renderSolicitudesView(container) {
  const usuarioActivo = getUsuarioActivo();
  const solicitudes = getSolicitudes();
  const profesionales = getProfesionales();

  const profById = new Map(profesionales.map((p) => [p.id, p]));

  container.innerHTML = `
    <section>
      <h2 class="section-title">Solicitudes</h2>
      <p class="muted" style="margin-top:0;">
        Rol: <strong>${usuarioActivo?.rolKey ?? '-'}</strong>. (Stub)
      </p>

      <div style="display:flex;flex-direction:column;gap:var(--space-3);">
        ${
          solicitudes.length === 0
            ? `<div class="muted">No hay solicitudes.</div>`
            : solicitudes
                .map((s) => {
                  const p = profById.get(s.profesionalId);
                  return `
                    <div class="role-card">
                      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:var(--space-3);">
                        <div>
                          <div style="font-weight:900;">${s.proyecto}</div>
                          <div class="muted" style="font-size:12px;margin-top:var(--space-1);">
                            Cliente: ${s.cliente ?? '-'} • Estado: ${s.estado ?? '-'}
                          </div>
                          <div class="muted" style="font-size:12px;margin-top:var(--space-1);">
                            Profesional: ${p?.nombre ?? s.profesionalId}
                          </div>
                        </div>
                        <a class="btn" href="#/ficha/${s.profesionalId}">Abrir</a>
                      </div>
                    </div>
                  `;
                })
                .join('')
        }
      </div>
    </section>
  `;
}

