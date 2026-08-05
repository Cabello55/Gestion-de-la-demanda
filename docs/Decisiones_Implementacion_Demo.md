# Decisiones de implementación — Demo Staffing

Documento vivo: registra desviaciones confirmadas entre el plan/Boceto y lo construido,
para que la documentación sea **fuente de verdad fiel a la app**, no solo al plan original.

---

## Vista Inicio — rol PROFESIONAL (cerrada)

### Sidebar (construido)

Ítems finales del sidebar:

1. **Inicio**
2. **Mi perfil**
3. **Mis Procesos**

**Desviaciones respecto a posibles borradores previos:**

| Plan / borrador | Construido | Motivo / decisión |
|---|---|---|
| “Mis Solicitudes” como ítem aparte | Consolidado dentro de **Mis Procesos** | Una sola entrada de navegación hacia `#/solicitudes` (procesos del profesional). |
| “Notificaciones” en sidebar | **No** se pinta | Notificaciones son evolución funcional (fase 2); no forman parte del alcance inicial del sidebar Profesional. |
| “Guía de Uso” en sidebar | **No** se pinta | Tampoco en el header Profesional; queda fuera del menú lateral. |

Fuente de verdad en código: `js/permisos/permisos.js` → `NAVEGACION_POR_ROL.PROFESIONAL.sidebar`.

### Badges — “Próximos compromisos”

| Plan documentado | Construido | Decisión |
|---|---|---|
| 2 colores / variantes de badge | **3 colores** según `estadoBadge` | Aceptado: más rico y alineado con los estados mock. |

Mapeo actual (`js/components/badge-estado.js` + tokens):

| `estadoBadge` | Variante visual |
|---|---|
| Confirmado | éxito (turquesa / verde de estado disponible) |
| Pendiente | aviso (naranja) |
| En curso | aviso / info operativa (naranja / patrón pendiente) |

Datos demo: `js/data/mock-compromisos.js`.

---

## Navegación header — recordatorio (ya confirmado)

- **Profesional / RP:** Inicio · Bolsa de Profesionales · Solicitudes (sin Informes)
- **KCM / GDD:** + Informes
- **GDD:** sin Administración (exclusivo de Admin / Gestor)
- **Admin:** Administración en header

---

*Última actualización: Bolsa PROFESIONAL.*

---

## Bolsa de Profesionales — rol PROFESIONAL

Sin filtros / Chat IA / Comparador (no puede buscar candidatos). Solo banner + card propia (`card-profesional.js`) con matching 100% fijo y CTA a `#/ficha/{id}`.

---

## Vista Inicio — rol ADMIN / Gestor (propuesta inicial)

Sin mockup en Boceto Funcional. Panel de **salud técnica**, no métricas de staffing.

### Header
`Inicio · Administración · Logs` (sin Bolsa ni Solicitudes).

### Sidebar
Inicio · Usuarios y Roles · Configuración de Workflow · Parámetros de IA · Integraciones · Logs y Auditoría · Notificaciones (config.).

### Datos nuevos
`mockUsuarios`, `mock-logs.js`, `mock-integraciones.js`, `mock-notificaciones-config.js` (seed + state).

### Nota
Sujeto a cambios tras revisión visual.

---

## Vista Inicio — rol GDD (cerrada)

### Header
`Inicio · Bolsa de Profesionales · Solicitudes · Informes` (sin Administración).

### Sidebar
Inicio · Solicitudes · Profesionales · Validaciones · Conflictos · Informes · Notificaciones (badge 9).

### Contenido
- 4 cards globales (pendientes solicitudes, pendientes profesionales, conflictos, % disponibilidad)
- Listas top 3 + evolución SVG + donut últimos 30 días
- Nuevos mocks: `validacion` en profesionales, `mock-conflictos.js`, `mock-historico-disponibilidad.js`

---

## Vista Inicio — rol KCM (cerrada)

### Header
`Inicio · Bolsa de Profesionales · Solicitudes · Informes` (Informes sí se mantiene).

### Sidebar
Inicio · Mis Solicitudes · Solicitudes de mi Equipo · Recursos Asignados · Recursos Pendientes · Buscar Profesionales · Informes · Notificaciones (badge 6).

### Contenido
- 4 cards: propias, equipo, asignados, pendientes
- Donut SVG por estado + Top 5 proyectos + tabla equipo + acceso rápido
- Helpers compartidos en `js/utils/solicitudes-helpers.js`
- Catálogo RP en `js/data/catalogo-rp.js` para la columna Responsable

---

## Vista Inicio — rol RP (cerrada)

### Header
`Inicio · Bolsa de Profesionales · Solicitudes` (sin Informes, decisión ya confirmada).

### Sidebar (construido)
1. Inicio  
2. Buscar Profesionales  
3. Mis Solicitudes  
4. Recursos Incorporados (sin ruta aún)  
5. Notificaciones (badge demo `5`, sin ruta aún)

### Contenido
- 4 cards: búsqueda rápida, mis solicitudes, pendientes, recursos incorporados (mes actual)
- Solicitudes recientes (top 4) + recursos incorporados recientemente (top 3)
- Cálculo de incorporaciones vía `historicoEstados` con `estado === 'Asignado'` + `solicitudId`/`rpResponsableId` del RP activo
