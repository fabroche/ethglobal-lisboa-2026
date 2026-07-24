# Server Actions (`lib/actions`)

Frontera app → dominio. Cada action:

- Empieza con `"use server"`.
- **Valida la entrada con Zod** antes de tocar nada.
- Llama a `lib/services` (dominio); **no** habla directamente con `lib/onchain` ni con APIs externas.
- Devuelve datos serializables; los errores se modelan (no se filtran stack traces al cliente).

Ver `docs/00-overview/04-convenciones.md`.
