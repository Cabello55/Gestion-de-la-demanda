import { getUsuarioActivo } from '../state.js';

export function renderMiPerfilView(container) {
  const usuarioActivo = getUsuarioActivo();

  container.innerHTML = `
    <section>
      <h2 class="section-title">Mi Perfil</h2>
      <p class="muted" style="margin-top:0;">
        Rol: <strong>${usuarioActivo?.rolKey ?? '-'}</strong>. (Stub)
      </p>

      <div class="role-card">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:var(--space-3);">
          <div>
            <div style="font-weight:900;font-size:16px;">${usuarioActivo?.nombre ?? '-'}</div>
            <div class="muted" style="font-size:12px;margin-top:var(--space-1);">
              id: ${usuarioActivo?.id ?? '-'}
            </div>
          </div>
          <div class="avatar">${(usuarioActivo?.avatarIniciales ?? '--').toUpperCase()}</div>
        </div>
      </div>

      <div style="margin-top:var(--space-4);" class="muted">
        Esta vista se irá completando con campos reales del perfil en la siguiente iteración.
      </div>
    </section>
  `;
}

