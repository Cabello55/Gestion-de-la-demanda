# Metodología de trabajo — Plataforma Staffing (demo)

La demo se construye **pantalla a pantalla** y **rol a rol**, tomando como base:

1. Boceto Funcional (roles, pantallas, flujos)
2. Design System Ayesa (colores + tipografía)
3. Decisiones confirmadas en implementación (fuente de verdad de lo construido)

## Fuente de verdad de desviaciones

Cuando lo construido se desvía del plan (con criterio aceptado), se registra en:

→ [`Decisiones_Implementacion_Demo.md`](./Decisiones_Implementacion_Demo.md)

## Orden de trabajo actual

1. Shell común (header / sidebar) — hecho
2. Login por rol — hecho
3. **Inicio PROFESIONAL** — hecho (ver decisiones)
4. Siguiente: Inicio RP (y resto de roles)
5. Luego: Bolsa → Ficha → Solicitudes → Mi perfil

## Regla práctica

El código en `js/permisos/permisos.js` (`NAVEGACION_POR_ROL`) manda sobre borradores de menú.
Si hay conflicto plan vs. app, prevalece lo documentado en *Decisiones* + el código.
