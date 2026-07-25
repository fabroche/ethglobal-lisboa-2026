# Handoff → Frank · 4 validaciones + 1 tarea (sáb noche)

> En español a pedido del equipo (excepción deliberada a D2, como los espejos de `ux/`).
> Contexto completo en inglés: `docs/world-testing.md` §A, `transversal/integration-worldid.md` §5,
> backlog S2.9/S3.4/S3.6/S4.7. **Orden = prioridad.**

## 1. ⛔ Túnel HTTPS (ngrok) — sí o no. Bloquea la demo en móvil.

**Qué pedimos:** tu OK para exponer la app local por un túnel HTTPS de ngrok (o tu veto, y usamos
TLS local con mkcert).

**Por qué hace falta:** causa raíz probada leyendo el código fuente de IDKit v2
(`bridge.ts`): `createClient` empieza con `await generateKey()` — WebCrypto — y los navegadores
**desactivan WebCrypto en orígenes HTTP no-localhost**. Por eso el botón "Open World App" muere en
silencio en el teléfono. Nuestro propio `seal()` depende de lo mismo. El flujo que verá el juez
(teléfono escanea QR → escribe → sella) **no puede funcionar sin origen HTTPS**. Prerrequisito duro
del E2E a dos navegadores (S3.4) y de la demo.

**Por qué es tu decisión:** el túnel hace la app públicamente accesible — cualquiera con la URL
podría spamear `createRoom` y quemar HBAR de nuestra cuenta testnet escribiendo al topic. Riesgo
probablemente aceptable por una noche de hackathon, pero es una decisión de infraestructura
compartida. Alternativa sin exposición pública: mkcert (~15 min más de fricción; el teléfono debe
confiar en nuestro certificado).

## 2. ⛔ La clave de sellado — tu hilo abierto §3.1. Último callejón sin salida.

**Qué pedimos:** respuesta definitiva sobre `OG_ENCLAVE_SEAL_PUBKEY`: ¿existe una clave de cifrado
del enclave de 0G, sí o no?

**Por qué:** es la única puerta que queda sobre «Seal and commit». Si **sí** — la pegamos en
`.env.local` y todo el flujo se enciende sin tocar código. Si **no** (tu propio diseño del
evaluador lo sugiere: el router de 0G es una API de chat que no puede custodiar una clave de
descifrado) — generamos un par de claves de demo, el servidor des-sella antes de llamar a tu
`evaluate()`, y **contamos esa frontera honestamente en la demo**, como dice tu comentario:
*"an honest seam, not a solved problem — do not let it read as one."* Cualquiera de las dos
respuestas nos desbloquea esta noche; la única mala es no responder.

## 3. World ID 4.0: ¿migrar o enviar v2? — decisión de estrategia de track.

**Qué pedimos:** decidir si peleamos la migración 4.0 esta noche (necesaria para la credencial
oficial `selfieCheckLegacy`, pero el asistente del portal está atascado con un error sin documentar:
"RP registration is not active") o enviamos el flujo v2 `device` que **ya funciona**, declarando la
sustitución honestamente en el doc de testing.

**Datos para decidir:** nuestra app ya tiene `enable_face_check: true` y las acciones dinámicas
por sala **auto-se-crean** (verificado en vivo contra su API); el SDK 4.x está instalado y listo
(v2 sobrevive bajo el alias `idkit2`); el atasco del RP quizá se arregle en 2 minutos en el booth
de World por la mañana. **Mi inclinación:** v2 esta noche, pregunta al booth al alba, migrar sólo
si el RP se activa. Pero toca tu narrativa de demo — co-fírmalo.

## 4. 🔧 El runner del reveal — la pieza que falta del bucle central (tu carril).

**Qué pedimos:** estado/plan para cablear el reveal: scheduler dispara → leer los dos commitments
del topic → tu `evaluate()` → attest → publicar el veredicto. Hoy **nada escribe un veredicto**:
la demo termina en una cuenta atrás.

**Por qué ahora:** tus dos hand-offs ya están merged en `develop` esperándote:
`getSealedPayloads(roomId)` (el almacén de ciphertexts de S3.2) y `consentFromCommitments()`
(el P0 S2.8 que pediste). Si cableas el runner esta noche, el bucle completo — dos navegadores,
un veredicto — existe antes del vídeo. Fila S2.9 del backlog, a tu nombre.

## 5. 🧹 30 segundos: `MEMORIA.md`

Está en la raíz, es pre-pivot y en español (rompe D2). Es de tu lado: consérvalo movido a
`agente/`, o bórralo — antes del freeze (S4.7).
