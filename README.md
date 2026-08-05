# Gestión de la Demanda - Demo Staffing (arquitectura inicial)

Proyecto de demo funcional basado en **Vanilla JavaScript (ES Modules)**, sin frameworks y sin build.

## Qué contiene ahora
- Andamiaje técnico: router con `location.hash`, estado global en `localStorage`, autenticación simulada por rol.
- Vistas **stub** para que puedas navegar por la demo y empezar a pulir pantalla por pantalla.

## Cómo ejecutar (sin `npm`)
1. Desde esta carpeta, levanta un servidor estático:
   - `python3 -m http.server 8080`
2. Abre la URL:
   - http://localhost:8080/

## Rutas
- `#/login`
- `#/inicio`
- `#/bolsa-profesionales`
- `#/ficha/:id` (ej: `#/ficha/PROF-001`)
- `#/solicitudes`
- `#/mi-perfil`

