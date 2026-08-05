# Design System Ayesa Digital — Colores y Tipografía

> **Uso:** Este documento es la fuente única de verdad de color y tipografía para cualquier desarrollo dentro del ecosistema Ayesa Digital, incluida la Plataforma Staffing. Cursor debe usar **exclusivamente** estos valores — nunca inventar tonos, variantes o fuentes alternativas. Documento de solo fundaciones (color + tipografía); botones, espaciados y demás componentes se documentarán en una fase posterior.

---

## 1. Paleta de colores primarios

Colores más reconocibles de la marca. Uso prioritario en interfaz, marca y elementos principales.

| Nombre | HEX | RGB | CMYK | PMS |
|---|---|---|---|---|
| **Azul eléctrico** | `#0000D0` | 0, 0, 208 | 100/76/0/9 | 293 C |
| **Magenta** | `#FF3184` | 255, 49, 132 | 4/90/0/0 | 225 C |
| **Blanco** | `#FFFFFF` | 255, 255, 255 | 0/0/0/0 | — |
| **Negro** | `#000000` | 0, 0, 0 | 100/100/100/100 | — |

## 2. Paleta de colores secundarios

Uso principal: infografías, tablas con abundante información, codificación visual de categorías/estados (no para elementos de marca principales).

| Nombre | HEX | RGB | CMYK |
|---|---|---|---|
| **Azul Cielo** | `#06CDFF` | 6, 205, 255 | 67/0/3/0 |
| **Turquesa** | `#43D8C9` | 67, 216, 201 | 63/0/34/0 |
| **Índigo Lavanda** | `#AB76FF` | 171, 118, 255 | 55/59/0/0 |
| **Naranja** | `#FF6D2E` | 255, 109, 46 | 0/69/82/0 |
| **Amarillo** | `#F5E300` | 245, 227, 0 | 13/6/89/0 |

---

## 3. Tipografía

| Fuente | Rol | Uso | Restricción |
|---|---|---|---|
| **Metropolis** | Tipografía corporativa principal | Marca, comunicación, interfaz cuando esté disponible | **Uso exclusivo del departamento de Comunicación y Marketing** — para producto/plataforma interna se debe validar si aplica o si se usa la de sustitución (ver más abajo) |
| **Arial** | Tipografía de sustitución | Plantillas, presentaciones, ofertas, y cualquier documento/sistema donde Metropolis no esté instalada por defecto | Fuente de fallback garantizada en todos los sistemas |

**Regla práctica para Cursor:** la Plataforma Staffing usa **Metropolis** (fuente gratuita bajo licencia Unlicense, self-hosted en `assets/fonts/`) con **Arial** como fallback.

---

## 4. Variables CSS de referencia (para Cursor)

```css
:root {
  /* Colores primarios */
  --ayesa-azul-electrico: #0000D0;
  --ayesa-magenta: #FF3184;
  --ayesa-blanco: #FFFFFF;
  --ayesa-negro: #000000;

  /* Colores secundarios */
  --ayesa-azul-cielo: #06CDFF;
  --ayesa-turquesa: #43D8C9;
  --ayesa-indigo-lavanda: #AB76FF;
  --ayesa-naranja: #FF6D2E;
  --ayesa-amarillo: #F5E300;

  /* Tipografía */
  --font-primary: 'Metropolis', Arial, sans-serif; /* Metropolis (Unlicense) — self-hosted */
  --font-fallback: Arial, sans-serif;
}
```

---

## 5. Notas de aplicación observadas en la suite existente (a validar, no normativas todavía)

Estas notas provienen de la inspección visual de aplicaciones ya construidas (App2U, RODAS, SmartJob Planner, SharePoint AyesaON) y **no sustituyen al manual oficial** — se incluyen para que Cursor entienda el patrón de uso real hasta que se cierre una guía de componentes definitiva:

- El **Azul eléctrico** (`#0000D0`) se usa como color dominante de cabecera/header y como color de marca en sidebars activos.
- El **Magenta** (`#FF3184`) se usa como color de acento para acciones/estados destacados (ej. botón "Salida" en RODAS, día seleccionado en calendario, iconos de sección activa).
- En SmartJob Planner se observa una codificación de color por tipo de estado en calendario: celeste tipo Azul Cielo para "TLT" (teletrabajo) y magenta para "AUJ" (ausencia) — un patrón de **color por estado** que es candidato directo a reutilizar en Staffing para Disponible/Solicitado/Reservado/Asignado.
- Cada sección del Apps Center (People, Smart Job, Working Tools, Gestión de Producción) usa un color dominante distinto para sus tarjetas, sugiriendo una paleta secundaria asignada por familia de aplicaciones más que un uso libre.

Estas observaciones se resolverán como decisiones formales cuando lleguemos a la fase de diseño visual de Staffing, y se registrarán entonces en el documento de metodología.

---

*Documento de fundaciones — colores y tipografía únicamente. Pendiente: espaciados, tamaños de tipografía, componentes (botones, inputs, tarjetas), iconografía. Se ampliará solo con permiso explícito del Usuario.*
