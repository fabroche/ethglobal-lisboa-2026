# Mobile-first · Adaptabilidad y UX móvil

Norma **transversal y obligatoria** para todos los módulos. Complementa el sistema de diseño
(`transversal/sistema-de-diseno.md`): este documento es *cómo* cada pantalla debe sentirse en móvil.

> **Principio.** La app se demuestra y se consume tanto en escritorio como en el teléfono (un juez puede
> abrir la demo en su móvil). Diseñamos **mobile-first**: la base de estilos es la vista móvil y se *escala
> hacia arriba* con breakpoints (`sm:`, `md:`, `lg:`). Nunca al revés. Ninguna pantalla se considera
> terminada si en el teléfono se siente como un escritorio comprimido.

## Breakpoints (Tailwind v4, defaults)
| Prefijo | Ancho min | Uso típico |
|---------|-----------|------------|
| *(base)* | 0 | **Móvil. Es el punto de partida de toda clase.** |
| `sm:` | 40rem (640px) | móvil grande / tablet vertical |
| `md:` | 48rem (768px) | tablet / desktop pequeño — **corte nav y tablas** |
| `lg:` | 64rem (1024px) | desktop |

Regla práctica: escribe primero la versión móvil sin prefijo y añade `sm:`/`md:`/`lg:` solo para *agrandar*
o *reorganizar* en pantallas mayores.

## Patrones obligatorios
### 1. Navegación
- **Móvil:** bottom tab bar fija al viewport, al alcance del pulgar (icono + etiqueta, activo en color de marca).
- **Desktop:** nav-píldora del header.
- **Fuente única** de secciones (`nav-items.tsx`): header y bottom bar la consumen; nunca duplicar la lista.
- El layout reserva padding inferior en móvil = alto de la barra + `safe-area-inset-bottom`.

### 2. Tablas densas → tarjetas apiladas
Una tabla de movimientos on-chain (fecha, tipo, token, cantidad, precio, PnL) es ilegible encogida. Debajo de
`md` se refluye a **tarjetas apiladas**, una por fila, con cada celda etiquetada por su `data-label`.
```html
<table class="reflow-cards w-full text-sm">
  …
  <td data-label="PnL">…</td>   <!-- el label aparece a la izquierda en móvil -->
```

### 3. Tipografía fluida
La base es el tamaño **móvil**; se agranda en `sm:`/`lg:`. Cuerpo legible ≥14px.
```html
<h1 class="text-3xl sm:text-4xl">
<div class="text-2xl sm:text-3xl">…</div>  <!-- número de KPI (valor de cartera / PnL) -->
```

### 4. Touch targets ≥ 44px
Controles táctiles ≥44px. Botones `size="sm"` se elevan en móvil (`max-sm:h-11 max-sm:px-5`). Nada depende
**solo** de `hover` (no existe en táctil): toda acción hover tiene equivalente tap/visible.

### 5. Inputs y filtros
Full-width en móvil, ancho natural en desktop; barras de filtros con `flex-wrap`.

### 6. Layout y safe-area
- `container-app` con padding lateral responsive.
- Respetar el notch / barra inferior con `env(safe-area-inset-*)` cuando haya elementos fijos.
- Grids: 1 columna en móvil → `sm:grid-cols-2` → `lg:grid-cols-4`.

### 7. Light + dark
Toda pantalla se prueba en ambos temas (tokens semánticos, nunca colores sueltos).

## DoD móvil (checklist antes de mergear)
- [ ] Probado a **360–390px** de ancho en light **y** dark.
- [ ] **Sin scroll horizontal** accidental.
- [ ] Tablas densas reflujadas (`.reflow-cards`) o con scroll **intencional** e indicado.
- [ ] Touch targets ≥44px; ninguna acción depende solo de `hover`.
- [ ] Navegación principal alcanzable con el pulgar.
- [ ] Tipografía legible (cuerpo ≥14px) y titulares escalados.
- [ ] `safe-area` respetada si hay elementos fijos.
- [ ] Cubierto por test RTL (DoD general) y, si aplica, story en Storybook.

## Anti-patrones (NO hacer)
- Diseñar desktop y "encoger".
- Tablas de 5–6 columnas sin reflow ni scroll intencional.
- Tamaños fijos en px que no escalan; texto < 14px en cuerpo.
- Acciones disponibles solo en `hover`.
