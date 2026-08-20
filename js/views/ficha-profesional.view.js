import { getProfesionales, getUsuarioActivo } from '../state.js';
import { renderBadgeEstado } from '../components/badge-estado.js';
import { renderModalAgendar } from '../components/tabla-candidatos.js';
import {
  addToComparador,
  guardarProfesionalParaDespues,
  isInComparador,
} from '../utils/comparador-state.js';
import { getTagsProfesional, MAX_COMPARADOR } from '../utils/bolsa-busqueda.js';

const ROLES_FICHA_TERCEROS = ['RP'];

const FICHA_TABS = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'skills', label: 'Skills' },
  { id: 'tecnologias', label: 'Tecnologías' },
  { id: 'experiencia', label: 'Experiencia' },
  { id: 'formacion', label: 'Formación' },
  { id: 'idiomas', label: 'Idiomas' },
  { id: 'certificaciones', label: 'Certificaciones' },
  { id: 'disponibilidad', label: 'Disponibilidad' },
  { id: 'historico', label: 'Histórico' },
];

function formatMesAnio(iso) {
  if (!iso) return '—';
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
}

function esVistaTerceros(modo) {
  return modo === 'tercero' || modo === 'gdd';
}

function formatFecha(iso) {
  if (!iso) return '—';
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function calcularEdad(fechaNacimiento, ref = new Date('2026-08-05')) {
  if (!fechaNacimiento) return null;
  const nac = new Date(`${fechaNacimiento}T00:00:00`);
  if (Number.isNaN(nac.getTime())) return null;
  let edad = ref.getFullYear() - nac.getFullYear();
  const m = ref.getMonth() - nac.getMonth();
  if (m < 0 || (m === 0 && ref.getDate() < nac.getDate())) edad -= 1;
  return edad;
}

function buildFichaHash(profId, tab, query = {}) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v != null && v !== '') params.set(k, v);
  }
  params.set('tab', tab);
  const qs = params.toString();
  return `#/ficha/${profId}${qs ? `?${qs}` : ''}`;
}

function getTabActivo(query) {
  return FICHA_TABS.some((t) => t.id === query?.tab) ? query.tab : 'resumen';
}

function renderChips(items = []) {
  if (!items.length) return `<p class="ficha-muted">Sin datos</p>`;
  return `
    <ul class="ficha-chips">
      ${items.map((t) => `<li class="ficha-chip">${t}</li>`).join('')}
    </ul>
  `;
}

function renderBloque(titulo, contenido) {
  return `
    <section class="ficha-block">
      <h3 class="ficha-block__title">${titulo}</h3>
      <div class="ficha-block__body">${contenido}</div>
    </section>
  `;
}

function renderModalCvVersiones(prof) {
  const versiones = prof.cv?.versiones ?? [
    { archivo: prof.cv?.archivo, fecha: prof.cv?.actualizado },
  ];

  return `
    <div class="ficha-modal" data-modal="cv-versiones" role="dialog" aria-modal="true">
      <div class="ficha-modal__backdrop" data-action="cerrar-modal"></div>
      <div class="ficha-modal__card">
        <header class="ficha-modal__head">
          <h2 class="ficha-modal__title">Historial de versiones del CV</h2>
          <button type="button" class="ficha-modal__close" data-action="cerrar-modal" aria-label="Cerrar">
            <i class="fa-solid fa-xmark" aria-hidden="true"></i>
          </button>
        </header>
        <ul class="ficha-versiones">
          ${versiones
            .map(
              (v) => `
            <li class="ficha-versiones__item">
              <span class="ficha-versiones__archivo">${v.archivo ?? 'CV'}</span>
              <span class="ficha-versiones__fecha">${formatFecha(v.fecha)}</span>
            </li>
          `
            )
            .join('')}
        </ul>
        <footer class="ficha-modal__footer">
          <button type="button" class="btn btn--primary" data-action="cerrar-modal">Cerrar</button>
        </footer>
      </div>
    </div>
  `;
}

function descargarCvMock(prof) {
  const contenido = `CV — ${prof.nombre}\nRol: ${prof.rol}\nActualizado: ${prof.cv?.actualizado ?? '—'}\n\n(Demo — archivo simulado)`;
  const blob = new Blob([contenido], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = prof.cv?.archivo ?? `cv-${prof.id}.txt`;
  link.click();
  URL.revokeObjectURL(url);
}

function renderLineaDisponibilidadProf(puntos = []) {
  if (!puntos.length) return `<p class="ficha-muted">Sin histórico de disponibilidad</p>`;
  if (puntos.length === 1) {
    return `<p class="ficha-muted">Disponibilidad actual: ${puntos[0].porcentaje}%</p>`;
  }

  const width = 480;
  const height = 180;
  const padL = 36;
  const padR = 12;
  const padT = 12;
  const padB = 28;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;
  const xs = puntos.map((_, i) => padL + (i / (puntos.length - 1)) * plotW);
  const ys = puntos.map((p) => padT + plotH - (p.porcentaje / 100) * plotH);
  const polyline = xs.map((x, i) => `${x},${ys[i]}`).join(' ');

  return `
    <div class="ficha-chart">
      <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Histórico de disponibilidad">
        <polyline points="${polyline}" class="ficha-chart__line" fill="none" />
        ${xs
          .map(
            (x, i) => `
          <circle cx="${x}" cy="${ys[i]}" r="4" class="ficha-chart__dot" />
          <text x="${x}" y="${height - 6}" class="ficha-chart__label" text-anchor="middle">
            ${formatFecha(puntos[i].fecha).slice(0, 5)}
          </text>
        `
          )
          .join('')}
      </svg>
    </div>
  `;
}

function renderLineaDisponibilidadPersonal(puntos = []) {
  if (!puntos.length) return `<p class="ficha-muted">Sin histórico de disponibilidad</p>`;
  if (puntos.length === 1) {
    return `<p class="ficha-muted">Disponibilidad: ${puntos[0].porcentaje}% (${formatMesAnio(puntos[0].fecha)})</p>`;
  }

  const width = 560;
  const height = 220;
  const padL = 40;
  const padR = 16;
  const padT = 16;
  const padB = 36;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;
  const yMax = 100;
  const yMin = 0;
  const yTicks = [0, 25, 50, 75, 100];

  const xs = puntos.map((_, i) => padL + (i / (puntos.length - 1)) * plotW);
  const ys = puntos.map(
    (p) => padT + plotH - ((Math.min(p.porcentaje, yMax) - yMin) / (yMax - yMin)) * plotH
  );
  const polyline = xs.map((x, i) => `${x},${ys[i]}`).join(' ');

  return `
    <div class="ficha-chart ficha-chart--wide">
      <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Histórico de disponibilidad individual">
        ${yTicks
          .map((t) => {
            const y = padT + plotH - ((t - yMin) / (yMax - yMin)) * plotH;
            return `
              <line x1="${padL}" y1="${y}" x2="${width - padR}" y2="${y}" class="ficha-chart__grid" />
              <text x="${padL - 8}" y="${y + 4}" class="ficha-chart__tick" text-anchor="end">${t}%</text>
            `;
          })
          .join('')}
        <polyline points="${polyline}" class="ficha-chart__line" fill="none" />
        ${xs
          .map(
            (x, i) => `
          <circle cx="${x}" cy="${ys[i]}" r="4" class="ficha-chart__dot" />
          <text x="${x}" y="${height - 10}" class="ficha-chart__label" text-anchor="middle">
            ${formatMesAnio(puntos[i].fecha)}
          </text>
        `
          )
          .join('')}
      </svg>
    </div>
  `;
}

function renderEntradaExperiencia(e) {
  return `
    <li class="ficha-exp">
      <div class="ficha-exp__head">
        <strong>${e.puesto ?? '—'}</strong>
        <span class="ficha-muted">${e.periodo ?? '—'}</span>
      </div>
      <div class="ficha-muted">${e.proyecto ?? '—'} · ${e.cliente ?? '—'}</div>
      ${e.descripcion ? `<p class="ficha-text ficha-text--sm">${e.descripcion}</p>` : ''}
    </li>
  `;
}

function renderEntradaFormacion(f) {
  const years =
    f.anioInicio && f.anioFin ? `${f.anioInicio}–${f.anioFin}` : f.anioFin ?? f.anioInicio ?? '—';
  return `
    <div class="ficha-form">
      <strong>${f.titulo ?? '—'}</strong>
      <div class="ficha-muted">${f.centro ?? '—'} · ${years}</div>
    </div>
  `;
}

function mediaValoraciones(prof) {
  const vals = prof.valoraciones ?? [];
  if (!vals.length) return null;
  const sum = vals.reduce((acc, v) => acc + (v.global ?? 0), 0);
  return Math.round((sum / vals.length) * 10) / 10;
}

function renderEstrellas(nota) {
  const full = Math.floor(nota);
  const half = nota - full >= 0.5;
  let html = '';
  for (let i = 0; i < 5; i++) {
    if (i < full) html += '<i class="fa-solid fa-star ficha-star ficha-star--on"></i>';
    else if (i === full && half) html += '<i class="fa-solid fa-star-half-stroke ficha-star ficha-star--on"></i>';
    else html += '<i class="fa-regular fa-star ficha-star"></i>';
  }
  return html;
}

function renderBloqueValoraciones(prof) {
  const vals = prof.valoraciones ?? [];
  if (!vals.length) {
    return `<p class="ficha-muted">Sin valoraciones todavía</p>`;
  }
  const media = mediaValoraciones(prof);
  return `
    <div class="ficha-valoraciones">
      <div class="ficha-valoraciones__score">
        <span class="ficha-valoraciones__num">${media?.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
        <span class="ficha-valoraciones__max">/ 5</span>
      </div>
      <div class="ficha-stars" aria-hidden="true">${renderEstrellas(media ?? 0)}</div>
      <p class="ficha-muted">Basado en ${vals.length} valoracion${vals.length === 1 ? '' : 'es'}</p>
      <button type="button" class="ficha-link" data-action="ver-valoraciones">
        Ver histórico de valoraciones ›
      </button>
    </div>
  `;
}

function renderBloqueCv(prof, { mostrarVersiones }) {
  const versionesBtn = mostrarVersiones
    ? `<button type="button" class="ficha-link" data-action="ver-versiones-cv">Ver historial de versiones</button>`
    : '';

  return `
    <div class="ficha-cv">
      <button type="button" class="btn btn--primary" data-action="descargar-cv">Descargar CV</button>
      <p class="ficha-muted">Actualizado: ${formatFecha(prof.cv?.actualizado)}</p>
      ${versionesBtn}
    </div>
  `;
}

function renderTabResumen(prof, modo = 'propio') {
  const edad = calcularEdad(prof.fechaNacimiento);
  const fechaNac = prof.fechaNacimiento
    ? `${formatFecha(prof.fechaNacimiento)}${edad != null ? ` (${edad} años)` : ''}`
    : '—';

  const skills = (prof.skills ?? []).map((s) => (typeof s === 'string' ? s : s.nombre));
  const expLimit = esVistaTerceros(modo) ? 3 : 2;
  const expDestacada = (prof.experiencia ?? []).slice(0, expLimit);
  const formReciente = (prof.formacion ?? [])[0];

  const resumenBody =
    esVistaTerceros(modo)
      ? prof.resumenProfesional
        ? `
          <p class="ficha-text">${prof.resumenProfesional}</p>
          <p class="ficha-meta">
            <strong>Seniority:</strong> ${prof.seniority ?? '—'} ·
            <strong>Experiencia:</strong> ${prof.experienciaAnios ?? '—'} años
          </p>
        `
        : `<p class="ficha-muted">Sin resumen profesional</p>`
      : prof.resumenProfesional
        ? `
          <p class="ficha-text">${prof.resumenProfesional}</p>
          <p class="ficha-meta">
            <strong>Seniority:</strong> ${prof.seniority ?? '—'} ·
            <strong>Experiencia:</strong> ${prof.experienciaAnios ?? '—'} años
          </p>
        `
        : `
          <p class="ficha-muted">
            Aún no has añadido un resumen profesional —
            <a href="#/mi-perfil?seccion=perfil">añádelo en Mi Perfil</a>
          </p>
        `;

  const datosPersonales =
    esVistaTerceros(modo)
      ? `
        <dl class="ficha-dl">
          <div><dt>Nombre completo</dt><dd>${prof.nombre ?? '—'}</dd></div>
          <div><dt>Ubicación</dt><dd>${prof.ubicacion ?? '—'}</dd></div>
          <div><dt>Fecha de nacimiento</dt><dd>${fechaNac}</dd></div>
          <div><dt>Email</dt><dd>${prof.email ?? '—'}</dd></div>
          <div><dt>Teléfono</dt><dd>${prof.telefono ?? '—'}</dd></div>
        </dl>
      `
      : `
        <dl class="ficha-dl">
          <div><dt>Ubicación</dt><dd>${prof.ubicacion ?? '—'}</dd></div>
          <div><dt>Fecha de nacimiento</dt><dd>${fechaNac}</dd></div>
          <div><dt>Email</dt><dd>${prof.email ?? '—'}</dd></div>
          <div><dt>Teléfono</dt><dd>${prof.telefono ?? '—'}</dd></div>
        </dl>
      `;

  const bloques = [
    renderBloque('Datos personales', datosPersonales),
    renderBloque('Resumen profesional', resumenBody),
    renderBloque(
      modo === 'tercero' ? 'Disponibilidad' : modo === 'gdd' ? 'Disponibilidad' : 'Estado y disponibilidad',
      `
        <dl class="ficha-dl">
          <div><dt>Estado</dt><dd>${renderBadgeEstado({ estado: prof.estado })}</dd></div>
          <div><dt>${esVistaTerceros(modo) ? 'Disponibilidad total' : 'Disponibilidad actual'}</dt><dd>${prof.disponibilidad?.porcentaje ?? '—'}%</dd></div>
          <div><dt>Desde</dt><dd>${formatFecha(prof.disponibilidad?.desde)}</dd></div>
          <div><dt>Movilidad</dt><dd>${prof.disponibilidad?.movilidad ?? '—'}</dd></div>
        </dl>
      `
    ),
    renderBloque('CV', renderBloqueCv(prof, { mostrarVersiones: modo === 'propio' })),
  ];

  if (esVistaTerceros(modo)) {
    bloques.push(
      renderBloque(
        'Coste / día',
        `
        <p class="ficha-coste">${prof.coste?.tarifaDia ?? '—'} €</p>
        <p class="ficha-muted">Tipo de contratación: ${prof.coste?.tipoContratacion ?? '—'}</p>
      `
      ),
      renderBloque('Últimas valoraciones', renderBloqueValoraciones(prof))
    );
  }

  bloques.push(
    renderBloque('Skills principales', renderChips(skills)),
    renderBloque('Tecnologías', renderChips(prof.tecnologias ?? [])),
    renderBloque(
      'Experiencia destacada',
      `
        ${
          expDestacada.length
            ? `<ul class="ficha-lista-exp">${expDestacada.map((e) => renderEntradaExperiencia(e)).join('')}</ul>`
            : `<p class="ficha-muted">Sin experiencia registrada</p>`
        }
        <button type="button" class="ficha-link" data-action="cambiar-tab" data-tab="experiencia">
          ${esVistaTerceros(modo) ? 'Ver toda la experiencia ›' : 'Ver toda mi experiencia ›'}
        </button>
      `
    )
  );

  if (modo === 'propio') {
    bloques.push(
      renderBloque(
        'Formación',
        `
          ${formReciente ? renderEntradaFormacion(formReciente) : `<p class="ficha-muted">Sin formación registrada</p>`}
          <button type="button" class="ficha-link" data-action="cambiar-tab" data-tab="formacion">
            Ver toda mi formación ›
          </button>
        `
      ),
      renderBloque(
        'Acciones rápidas',
        `
        <div class="ficha-quick">
          <a class="ficha-quick__btn" href="#/mi-perfil">
            <i class="fa-solid fa-pen" aria-hidden="true"></i><span>Editar mi perfil</span>
          </a>
          <a class="ficha-quick__btn" href="#/mi-perfil?seccion=cv">
            <i class="fa-solid fa-file-lines" aria-hidden="true"></i><span>Actualizar CV</span>
          </a>
          <a class="ficha-quick__btn" href="#/mi-perfil?seccion=disponibilidad">
            <i class="fa-solid fa-calendar" aria-hidden="true"></i><span>Actualizar disponibilidad</span>
          </a>
        </div>
      `
      )
    );
  }

  return `<div class="ficha-grid">${bloques.join('')}</div>`;
}

function renderTabSkills(prof) {
  const items = prof.skills ?? [];
  if (!items.length) return `<p class="ficha-muted">Sin skills registrados</p>`;
  return `
    <ul class="ficha-simple-list">
      ${items
        .map((s) => {
          const nombre = typeof s === 'string' ? s : s.nombre;
          const nivel = typeof s === 'string' ? null : s.nivel;
          return `<li><strong>${nombre}</strong>${nivel ? ` — ${nivel}` : ''}</li>`;
        })
        .join('')}
    </ul>
  `;
}

function renderTabTecnologias(prof) {
  return `<div class="ficha-panel">${renderChips(prof.tecnologias ?? [])}</div>`;
}

function renderTabExperiencia(prof) {
  const items = prof.experiencia ?? [];
  if (!items.length) return `<p class="ficha-muted">Sin experiencia registrada</p>`;
  return `<ul class="ficha-lista-exp">${items.map((e) => renderEntradaExperiencia(e)).join('')}</ul>`;
}

function renderTabFormacion(prof) {
  const items = prof.formacion ?? [];
  if (!items.length) return `<p class="ficha-muted">Sin formación registrada</p>`;
  return `<div class="ficha-stack">${items.map((f) => renderEntradaFormacion(f)).join('')}</div>`;
}

function renderTabIdiomas(prof) {
  const items = prof.idiomas ?? [];
  if (!items.length) return `<p class="ficha-muted">Sin idiomas registrados</p>`;
  return `
    <ul class="ficha-simple-list">
      ${items.map((i) => `<li><strong>${i.idioma}</strong> — ${i.nivel}</li>`).join('')}
    </ul>
  `;
}

function renderTabCertificaciones(prof) {
  const items = prof.certificaciones ?? [];
  if (!items.length) return `<p class="ficha-muted">Sin certificaciones registradas</p>`;
  return `
    <ul class="ficha-simple-list">
      ${items
        .map(
          (c) => `
        <li>
          <strong>${c.nombre ?? '—'}</strong>
          <span class="ficha-muted"> · ${c.emisor ?? '—'} · ${c.anio ?? '—'}</span>
        </li>
      `
        )
        .join('')}
    </ul>
  `;
}

function renderTabDisponibilidad(prof) {
  return `
    <div class="ficha-panel">
      <dl class="ficha-dl">
        <div><dt>Estado actual</dt><dd>${renderBadgeEstado({ estado: prof.estado })}</dd></div>
        <div><dt>Disponibilidad</dt><dd>${prof.disponibilidad?.porcentaje ?? '—'}%</dd></div>
        <div><dt>Desde</dt><dd>${formatFecha(prof.disponibilidad?.desde)}</dd></div>
        <div><dt>Movilidad</dt><dd>${prof.disponibilidad?.movilidad ?? '—'}</dd></div>
      </dl>
      <h4 class="ficha-subtitle">Histórico de disponibilidad</h4>
      ${renderLineaDisponibilidadProf(prof.historicoDisponibilidadProf ?? [])}
    </div>
  `;
}

function renderModalValoraciones(prof) {
  const vals = prof.valoraciones ?? [];
  return `
    <div class="ficha-modal" data-modal="valoraciones" role="dialog" aria-modal="true">
      <div class="ficha-modal__backdrop" data-action="cerrar-modal"></div>
      <div class="ficha-modal__card ficha-modal__card--wide">
        <header class="ficha-modal__head">
          <h2 class="ficha-modal__title">Histórico de valoraciones</h2>
          <button type="button" class="ficha-modal__close" data-action="cerrar-modal" aria-label="Cerrar">
            <i class="fa-solid fa-xmark" aria-hidden="true"></i>
          </button>
        </header>
        ${
          vals.length
            ? `
          <div class="ficha-table-wrap">
            <table class="ficha-table">
              <thead><tr><th>Proyecto</th><th>Valoración</th><th>Técnica</th><th>Fecha</th></tr></thead>
              <tbody>
                ${vals
                  .map(
                    (v) => `
                  <tr>
                    <td>${v.proyecto ?? '—'}</td>
                    <td>${v.global ?? '—'}</td>
                    <td>${v.tecnica ?? '—'}</td>
                    <td>${formatFecha(v.fecha)}</td>
                  </tr>
                `
                  )
                  .join('')}
              </tbody>
            </table>
          </div>
        `
            : `<p class="ficha-muted">Sin valoraciones registradas</p>`
        }
        <footer class="ficha-modal__footer">
          <button type="button" class="btn btn--primary" data-action="cerrar-modal">Cerrar</button>
        </footer>
      </div>
    </div>
  `;
}

function renderTabHistorico(prof) {
  const items = [...(prof.historicoEstados ?? [])].sort((a, b) =>
    String(b.fecha).localeCompare(String(a.fecha))
  );
  if (!items.length) return `<p class="ficha-muted">Sin histórico de estados</p>`;

  return `
    <div class="ficha-table-wrap">
      <table class="ficha-table">
        <thead>
          <tr><th>Fecha</th><th>Estado</th><th>Usuario</th><th>Comentario</th></tr>
        </thead>
        <tbody>
          ${items
            .map(
              (h) => `
            <tr>
              <td>${formatFecha(h.fecha)}</td>
              <td>${renderBadgeEstado({ estado: h.estado })}</td>
              <td>${h.usuario ?? '—'}</td>
              <td>${h.comentario ?? '—'}</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderTablaHistoricoEstadosGdd(prof) {
  const items = [...(prof.historicoEstados ?? [])].sort((a, b) =>
    String(b.fecha).localeCompare(String(a.fecha))
  );
  if (!items.length) return `<p class="ficha-muted">Sin histórico de estados</p>`;

  return `
    <div class="ficha-table-wrap">
      <table class="ficha-table">
        <thead>
          <tr><th>Estado</th><th>Fecha</th><th>Motivo</th><th>Usuario</th><th>Comentario</th></tr>
        </thead>
        <tbody>
          ${items
            .map(
              (h) => `
            <tr>
              <td>${renderBadgeEstado({ estado: h.estado })}</td>
              <td>${formatFecha(h.fecha)}</td>
              <td>${h.motivo ?? '—'}</td>
              <td>${h.usuario ?? '—'}</td>
              <td>${h.comentario ?? '—'}</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderTablaValoracionesGdd(prof) {
  const vals = [...(prof.valoraciones ?? [])].sort((a, b) =>
    String(b.fecha).localeCompare(String(a.fecha))
  );
  if (!vals.length) return `<p class="ficha-muted">Sin valoraciones registradas</p>`;

  return `
    <div class="ficha-table-wrap">
      <table class="ficha-table ficha-table--valoraciones">
        <thead>
          <tr>
            <th>Fecha</th><th>Proyecto</th><th>Val. global</th><th>Val. técnica</th>
            <th>Comunicación</th><th>Autonomía</th><th>Trabajo en equipo</th>
            <th>Responsable</th><th>Comentario</th>
          </tr>
        </thead>
        <tbody>
          ${vals
            .map(
              (v) => `
            <tr>
              <td>${formatFecha(v.fecha)}</td>
              <td>${v.proyecto ?? '—'}</td>
              <td>
                <span class="ficha-val-cell">
                  ${v.global?.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) ?? '—'}
                  <span class="ficha-stars ficha-stars--inline" aria-hidden="true">${renderEstrellas(v.global ?? 0)}</span>
                </span>
              </td>
              <td>${v.tecnica?.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) ?? '—'}</td>
              <td>${v.comunicacion?.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) ?? '—'}</td>
              <td>${v.autonomia?.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) ?? '—'}</td>
              <td>${v.trabajoEquipo?.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) ?? '—'}</td>
              <td>${v.responsable ?? '—'}</td>
              <td>${v.comentario ? `"${v.comentario}"` : '—'}</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderAccionesRapidasGdd(prof) {
  return `
    <div class="ficha-quick">
      <a class="ficha-quick__btn" href="#/ficha/${prof.id}?modo=edicion">
        <i class="fa-solid fa-pen" aria-hidden="true"></i><span>Editar información</span>
      </a>
      <a class="ficha-quick__btn" href="#/solicitudes?profesionalId=${prof.id}">
        <i class="fa-solid fa-briefcase" aria-hidden="true"></i><span>Ver recursos asignados</span>
      </a>
      <button type="button" class="ficha-quick__btn" data-action="agendar-reunion">
        <i class="fa-solid fa-calendar" aria-hidden="true"></i><span>Agendar reunión</span>
      </button>
      <button type="button" class="ficha-quick__btn" data-action="enviar-mensaje">
        <i class="fa-solid fa-envelope" aria-hidden="true"></i><span>Enviar mensaje</span>
      </button>
      <button type="button" class="ficha-quick__btn" data-action="ver-archivos">
        <i class="fa-solid fa-file-lines" aria-hidden="true"></i><span>Ver archivos</span>
      </button>
    </div>
  `;
}

function renderTabHistoricoGdd(prof) {
  return `
    <div class="ficha-grid ficha-grid--historico-gdd">
      ${renderBloque('Histórico de estados', renderTablaHistoricoEstadosGdd(prof))}
      ${renderBloque(
        'Histórico de disponibilidad (%)',
        renderLineaDisponibilidadPersonal(prof.historicoDisponibilidadPersonal ?? [])
      )}
      ${renderBloque('Histórico de valoraciones', renderTablaValoracionesGdd(prof))}
      ${renderBloque(
        'Vista 360° - Posición Relativa',
        `<p class="ficha-placeholder">Disponible en una próxima fase</p>`
      )}
      ${renderBloque('Acciones rápidas', renderAccionesRapidasGdd(prof))}
    </div>
  `;
}

function renderModalConfirmarSolicitud(prof) {
  return `
    <div class="ficha-modal" data-modal="confirmar-solicitud" role="dialog" aria-modal="true">
      <div class="ficha-modal__backdrop" data-action="cerrar-modal"></div>
      <div class="ficha-modal__card">
        <header class="ficha-modal__head">
          <h2 class="ficha-modal__title">Profesional asignado</h2>
          <button type="button" class="ficha-modal__close" data-action="cerrar-modal" aria-label="Cerrar">
            <i class="fa-solid fa-xmark" aria-hidden="true"></i>
          </button>
        </header>
        <p class="ficha-modal__text">
          Este profesional ya está asignado a un proyecto — ¿continuar de todos modos?
        </p>
        <footer class="ficha-modal__footer">
          <button type="button" class="btn" data-action="cerrar-modal">Cancelar</button>
          <button type="button" class="btn btn--primary" data-action="confirmar-solicitud" data-id="${prof.id}">
            Continuar
          </button>
        </footer>
      </div>
    </div>
  `;
}

function renderModalEnviarMensaje(prof) {
  return `
    <div class="ficha-modal" data-modal="enviar-mensaje" role="dialog" aria-modal="true">
      <div class="ficha-modal__backdrop" data-action="cerrar-modal"></div>
      <div class="ficha-modal__card">
        <header class="ficha-modal__head">
          <h2 class="ficha-modal__title">Enviar mensaje</h2>
          <button type="button" class="ficha-modal__close" data-action="cerrar-modal" aria-label="Cerrar">
            <i class="fa-solid fa-xmark" aria-hidden="true"></i>
          </button>
        </header>
        <form class="ficha-modal__form" data-form="enviar-mensaje">
          <label class="ficha-field">
            <span class="ficha-field__label">Para</span>
            <input class="ficha-field__input" type="text" value="${prof.nombre}" readonly />
          </label>
          <label class="ficha-field">
            <span class="ficha-field__label">Mensaje</span>
            <textarea class="ficha-field__input ficha-field__textarea" rows="4" placeholder="Escribe tu mensaje…"></textarea>
          </label>
        </form>
        <footer class="ficha-modal__footer">
          <button type="button" class="btn" data-action="cerrar-modal">Cancelar</button>
          <button type="button" class="btn btn--primary" data-action="enviar-mensaje-ok">Enviar</button>
        </footer>
      </div>
    </div>
  `;
}

function renderModalVerArchivos(prof) {
  const versiones = prof.cv?.versiones ?? [{ archivo: prof.cv?.archivo, fecha: prof.cv?.actualizado }];
  return `
    <div class="ficha-modal" data-modal="ver-archivos" role="dialog" aria-modal="true">
      <div class="ficha-modal__backdrop" data-action="cerrar-modal"></div>
      <div class="ficha-modal__card">
        <header class="ficha-modal__head">
          <h2 class="ficha-modal__title">Archivos del profesional</h2>
          <button type="button" class="ficha-modal__close" data-action="cerrar-modal" aria-label="Cerrar">
            <i class="fa-solid fa-xmark" aria-hidden="true"></i>
          </button>
        </header>
        <ul class="ficha-versiones">
          ${versiones
            .map(
              (v) => `
            <li class="ficha-versiones__item">
              <span class="ficha-versiones__archivo"><i class="fa-solid fa-file-pdf" aria-hidden="true"></i> ${v.archivo ?? 'CV'}</span>
              <span class="ficha-versiones__fecha">${formatFecha(v.fecha)}</span>
            </li>
          `
            )
            .join('')}
        </ul>
        <footer class="ficha-modal__footer">
          <button type="button" class="btn btn--primary" data-action="cerrar-modal">Cerrar</button>
        </footer>
      </div>
    </div>
  `;
}

function renderTabContent(prof, tabId, modo = 'propio') {
  switch (tabId) {
    case 'resumen':
      return renderTabResumen(prof, modo);
    case 'skills':
      return renderTabSkills(prof);
    case 'tecnologias':
      return renderTabTecnologias(prof);
    case 'experiencia':
      return renderTabExperiencia(prof);
    case 'formacion':
      return renderTabFormacion(prof);
    case 'idiomas':
      return renderTabIdiomas(prof);
    case 'certificaciones':
      return renderTabCertificaciones(prof);
    case 'disponibilidad':
      return renderTabDisponibilidad(prof);
    case 'historico':
      return modo === 'gdd' ? renderTabHistoricoGdd(prof) : renderTabHistorico(prof);
    default:
      return renderTabResumen(prof, modo);
  }
}

function renderFichaTabs(profId, tabActivo, query) {
  return `
    <div class="ficha-tabs" role="tablist">
      ${FICHA_TABS.map((tab) => {
        const active = tabActivo === tab.id;
        return `
          <button type="button" class="ficha-tabs__btn ${active ? 'ficha-tabs__btn--active' : ''}"
            role="tab" aria-selected="${active}" data-action="cambiar-tab" data-tab="${tab.id}">
            ${tab.label}
          </button>
        `;
      }).join('')}
    </div>
  `;
}

function renderMatchingBanner(prof, query) {
  const pct = prof.matchingDemo ?? 0;
  const conSolicitud = Boolean(query?.solicitudId);
  const label = conSolicitud ? 'Matching con mi solicitud' : 'Matching general';
  return `
    <div class="ficha-matching">
      <span class="ficha-matching__label">${label}: <strong>${pct}%</strong></span>
      ${
        conSolicitud
          ? `<button type="button" class="ficha-link" data-action="matching-detalle">Ver detalle ›</button>`
          : ''
      }
    </div>
  `;
}

function renderAccionesGdd(prof) {
  return `
    <div class="ficha-hero__actions">
      <button type="button" class="btn" data-action="abrir-perfil">Abrir perfil</button>
      <div class="ficha-dropdown" data-dropdown="reunion">
        <button type="button" class="btn ficha-dropdown__toggle" data-action="toggle-reunion">
          Solicitar reunión <i class="fa-solid fa-chevron-down" aria-hidden="true"></i>
        </button>
        <div class="ficha-dropdown__menu" hidden>
          <button type="button" class="ficha-dropdown__item" data-action="solicitar-entrevista">
            Solicitar entrevista
          </button>
          <button type="button" class="ficha-dropdown__item" data-action="agendar-reunion">
            Agendar reunión
          </button>
          <button type="button" class="ficha-dropdown__item" data-action="guardar-despues">
            Guardar para más tarde
          </button>
        </div>
      </div>
      <button type="button" class="btn btn--primary" data-action="iniciar-solicitud">Iniciar solicitud</button>
    </div>
  `;
}

function navegarNuevaSolicitud(profId) {
  window.location.hash = `#/solicitudes/nueva?profesionalId=${profId}`;
}

function abrirModal(root, html, onWire) {
  root.querySelector('[data-modal]')?.remove();
  root.insertAdjacentHTML('beforeend', html);
  root.querySelectorAll('[data-action="cerrar-modal"]').forEach((el) => {
    el.addEventListener('click', () => root.querySelector('[data-modal]')?.remove());
  });
  onWire?.();
}

function wireFichaGdd(root, prof, profId, query, rerender) {
  wireFichaComun(root, prof, profId, query, rerender);

  root.querySelector('[data-action="volver-resultados"]')?.addEventListener('click', () => {
    if (window.history.length > 1) window.history.back();
    else window.location.hash = '#/bolsa-profesionales';
  });

  root.querySelector('[data-action="abrir-perfil"]')?.addEventListener('click', () => {
    window.open(window.location.href, '_blank', 'noopener');
  });

  root.querySelector('[data-action="toggle-reunion"]')?.addEventListener('click', (e) => {
    e.stopPropagation();
    const menu = root.querySelector('[data-dropdown="reunion"] .ficha-dropdown__menu');
    if (menu) menu.hidden = !menu.hidden;
  });

  if (!root.dataset.gddDropdownWired) {
    root.dataset.gddDropdownWired = '1';
    root.addEventListener('click', (e) => {
      if (!e.target.closest('[data-dropdown="reunion"]')) {
        root.querySelector('[data-dropdown="reunion"] .ficha-dropdown__menu')?.setAttribute('hidden', '');
      }
    });
  }

  const handleAgendar = () => {
    abrirModal(root, renderModalAgendar(prof.nombre));
  };

  root.querySelectorAll('[data-action="agendar-reunion"]').forEach((btn) => {
    btn.addEventListener('click', handleAgendar);
  });

  root.querySelector('[data-action="solicitar-entrevista"]')?.addEventListener('click', () => {
    handleAgendar();
  });

  root.querySelector('[data-action="guardar-despues"]')?.addEventListener('click', () => {
    guardarProfesionalParaDespues(prof.id);
    showFichaToast(root, 'Profesional guardado para más tarde');
  });

  root.querySelector('[data-action="iniciar-solicitud"]')?.addEventListener('click', () => {
    if (prof.estado === 'Asignado') {
      abrirModal(root, renderModalConfirmarSolicitud(prof), () => {
        root.querySelector('[data-action="confirmar-solicitud"]')?.addEventListener('click', () => {
          root.querySelector('[data-modal]')?.remove();
          navegarNuevaSolicitud(prof.id);
        });
      });
    } else {
      navegarNuevaSolicitud(prof.id);
    }
  });

  root.querySelector('[data-action="matching-detalle"]')?.addEventListener('click', () => {
    showFichaToast(root, 'Detalle de matching — disponible en evolución futura');
  });

  root.querySelector('[data-action="ver-valoraciones"]')?.addEventListener('click', () => {
    abrirModal(root, renderModalValoraciones(prof));
  });

  root.querySelector('[data-action="enviar-mensaje"]')?.addEventListener('click', () => {
    abrirModal(root, renderModalEnviarMensaje(prof), () => {
      root.querySelector('[data-action="enviar-mensaje-ok"]')?.addEventListener('click', () => {
        root.querySelector('[data-modal]')?.remove();
        showFichaToast(root, 'Mensaje enviado (demo)');
      });
    });
  });

  root.querySelector('[data-action="ver-archivos"]')?.addEventListener('click', () => {
    abrirModal(root, renderModalVerArchivos(prof));
  });

  root.querySelectorAll('[data-action="cambiar-tab"]').forEach((btn) => {
    if (btn.dataset.tab) {
      btn.addEventListener('click', () => {
        window.location.hash = buildFichaHash(profId, btn.dataset.tab, query);
      });
    }
  });
}

function renderAccionesTerceros(prof) {
  const enComparador = isInComparador('rp', prof.id);
  return `
    <div class="ficha-hero__actions">
      <button type="button" class="btn" data-action="comparar" ${enComparador ? 'disabled' : ''}>
        ${enComparador ? 'En comparador' : 'Comparar'}
      </button>
      <div class="ficha-dropdown" data-dropdown="interes">
        <button type="button" class="btn btn--primary ficha-dropdown__toggle" data-action="toggle-interes">
          Marcar interés <i class="fa-solid fa-chevron-down" aria-hidden="true"></i>
        </button>
        <div class="ficha-dropdown__menu" hidden>
          <button type="button" class="ficha-dropdown__item" data-action="solicitar-entrevista">
            Solicitar entrevista
          </button>
          <button type="button" class="ficha-dropdown__item" data-action="comparar">
            Añadir a comparador
          </button>
          <button type="button" class="ficha-dropdown__item" data-action="guardar-despues">
            Guardar para más tarde
          </button>
        </div>
      </div>
    </div>
  `;
}

function showFichaToast(root, mensaje) {
  root.querySelector('.ficha-toast')?.remove();
  root.insertAdjacentHTML(
    'beforeend',
    `<div class="ficha-toast" role="status">${mensaje}</div>`
  );
  setTimeout(() => root.querySelector('.ficha-toast')?.remove(), 2800);
}

function wireFichaComun(root, prof, profId, query, rerender) {
  root.querySelectorAll('[data-action="cambiar-tab"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      window.location.hash = buildFichaHash(profId, btn.dataset.tab, query);
    });
  });

  root.querySelector('[data-action="descargar-cv"]')?.addEventListener('click', () => {
    descargarCvMock(prof);
  });

  root.querySelector('[data-action="ver-versiones-cv"]')?.addEventListener('click', () => {
    root.querySelector('[data-modal]')?.remove();
    root.insertAdjacentHTML('beforeend', renderModalCvVersiones(prof));
    root.querySelectorAll('[data-action="cerrar-modal"]').forEach((el) => {
      el.addEventListener('click', () => root.querySelector('[data-modal]')?.remove());
    });
  });
}

function wireFichaTerceros(root, prof, profId, query, rerender) {
  wireFichaComun(root, prof, profId, query, rerender);

  root.querySelector('[data-action="volver-resultados"]')?.addEventListener('click', () => {
    if (window.history.length > 1) window.history.back();
    else window.location.hash = '#/bolsa-profesionales';
  });

  const handleComparar = () => {
    const result = addToComparador('rp', prof.id);
    if (result.full) showFichaToast(root, `Máximo ${MAX_COMPARADOR} candidatos para comparar`);
    else if (result.already) showFichaToast(root, 'Ya está en el comparador');
    else showFichaToast(root, 'Añadido al comparador');
    rerender();
  };

  root.querySelectorAll('[data-action="comparar"]').forEach((btn) => {
    btn.addEventListener('click', handleComparar);
  });

  root.querySelector('[data-action="toggle-interes"]')?.addEventListener('click', (e) => {
    e.stopPropagation();
    const menu = root.querySelector('[data-dropdown="interes"] .ficha-dropdown__menu');
    if (menu) menu.hidden = !menu.hidden;
  });

  if (!root.dataset.dropdownWired) {
    root.dataset.dropdownWired = '1';
    root.addEventListener('click', (e) => {
      if (!e.target.closest('[data-dropdown="interes"]')) {
        root.querySelector('[data-dropdown="interes"] .ficha-dropdown__menu')?.setAttribute('hidden', '');
      }
    });
  }

  root.querySelector('[data-action="solicitar-entrevista"]')?.addEventListener('click', () => {
    window.location.hash = `#/solicitudes/nueva?profesionalId=${prof.id}`;
  });

  root.querySelector('[data-action="guardar-despues"]')?.addEventListener('click', () => {
    guardarProfesionalParaDespues(prof.id);
    showFichaToast(root, 'Profesional guardado para más tarde');
  });

  root.querySelector('[data-action="matching-detalle"]')?.addEventListener('click', () => {
    showFichaToast(root, 'Detalle de matching — disponible en evolución futura');
  });

  root.querySelector('[data-action="ver-valoraciones"]')?.addEventListener('click', () => {
    root.querySelector('[data-modal]')?.remove();
    root.insertAdjacentHTML('beforeend', renderModalValoraciones(prof));
    root.querySelectorAll('[data-action="cerrar-modal"]').forEach((el) => {
      el.addEventListener('click', () => root.querySelector('[data-modal]')?.remove());
    });
  });
}

function renderFichaHero(prof, accionesHtml = '') {
  const headerTags = getTagsProfesional(prof, 5);
  return `
    <header class="ficha-hero">
      <div class="ficha-hero__top">
        <div class="ficha-hero__main">
          <h1 class="ficha-hero__name">${prof.nombre}</h1>
          <p class="ficha-hero__role">${prof.rol ?? '—'}</p>
          <div class="ficha-hero__estado">${renderBadgeEstado({ estado: prof.estado })}</div>
        </div>
        ${accionesHtml}
      </div>
      ${headerTags.length ? renderChips(headerTags) : ''}
    </header>
  `;
}

function renderFichaProfesionalPropio(container, prof, ctx) {
  const profId = prof.id;
  const query = ctx?.query ?? {};
  const tabActivo = getTabActivo(query);

  container.innerHTML = `
    <section class="ficha">
      <a class="ficha-back" href="#/inicio">← Volver al inicio</a>
      ${renderFichaHero(prof)}
      ${renderFichaTabs(profId, tabActivo, query)}
      <div class="ficha-tabpanel" role="tabpanel">${renderTabContent(prof, tabActivo, 'propio')}</div>
    </section>
  `;

  wireFichaComun(container, prof, profId, query, () =>
    renderFichaProfesionalPropio(container, prof, ctx)
  );
}

function renderFichaGdd(container, prof, ctx) {
  const profId = prof.id;
  const query = ctx?.query ?? {};
  const tabActivo = getTabActivo(query);

  container.innerHTML = `
    <section class="ficha">
      <button type="button" class="ficha-back ficha-back--btn" data-action="volver-resultados">
        ← Volver a resultados
      </button>
      ${renderFichaHero(prof, renderAccionesGdd(prof))}
      ${renderMatchingBanner(prof, query)}
      ${renderFichaTabs(profId, tabActivo, query)}
      <div class="ficha-tabpanel" role="tabpanel">${renderTabContent(prof, tabActivo, 'gdd')}</div>
    </section>
  `;

  wireFichaGdd(container, prof, profId, query, () => renderFichaGdd(container, prof, ctx));
}

function renderFichaTerceros(container, prof, ctx) {
  const profId = prof.id;
  const query = ctx?.query ?? {};
  const tabActivo = getTabActivo(query);

  container.innerHTML = `
    <section class="ficha">
      <button type="button" class="ficha-back ficha-back--btn" data-action="volver-resultados">
        ← Volver a resultados
      </button>
      ${renderFichaHero(prof, renderAccionesTerceros(prof))}
      ${renderMatchingBanner(prof, query)}
      ${renderFichaTabs(profId, tabActivo, query)}
      <div class="ficha-tabpanel" role="tabpanel">${renderTabContent(prof, tabActivo, 'tercero')}</div>
    </section>
  `;

  wireFichaTerceros(container, prof, profId, query, () =>
    renderFichaTerceros(container, prof, ctx)
  );
}

function renderFichaAccesoDenegado(container) {
  container.innerHTML = `
    <section class="ficha">
      <a class="ficha-back" href="#/inicio">← Volver al inicio</a>
      <div class="ficha-empty">
        <p>No puedes consultar la ficha de otro profesional.</p>
        <a class="btn btn--primary" href="#/bolsa-profesionales">Ver mi perfil</a>
      </div>
    </section>
  `;
}

function renderFichaStub(container, prof, usuarioActivo) {
  container.innerHTML = `
    <section class="ficha">
      <a class="ficha-back" href="#/bolsa-profesionales">← Volver</a>
      ${renderFichaHero(prof)}
      <p class="ficha-muted">
        Vista completa de ficha para el rol <strong>${usuarioActivo?.rolKey ?? '-'}</strong>
        (pendiente en tareas posteriores).
      </p>
    </section>
  `;
}

export function renderFichaProfesionalView(container, ctx) {
  const usuarioActivo = getUsuarioActivo();
  const profesionales = getProfesionales();
  const profesionalId = ctx?.param ?? null;
  const prof = profesionales.find((p) => p.id === profesionalId);

  if (!prof) {
    container.innerHTML = `
      <section class="ficha">
        <h2 class="ficha-hero__name">Ficha profesional</h2>
        <p class="ficha-muted">No se encontró el profesional: <strong>${profesionalId ?? '-'}</strong></p>
        <a class="btn" href="#/bolsa-profesionales">Volver</a>
      </section>
    `;
    return;
  }

  if (usuarioActivo?.rolKey === 'PROFESIONAL') {
    if (profesionalId !== usuarioActivo.profesionalId) {
      renderFichaAccesoDenegado(container);
      return;
    }
    renderFichaProfesionalPropio(container, prof, ctx);
    return;
  }

  if (ROLES_FICHA_TERCEROS.includes(usuarioActivo?.rolKey)) {
    renderFichaTerceros(container, prof, ctx);
    return;
  }

  if (usuarioActivo?.rolKey === 'GDD') {
    renderFichaGdd(container, prof, ctx);
    return;
  }

  renderFichaStub(container, prof, usuarioActivo);
}
