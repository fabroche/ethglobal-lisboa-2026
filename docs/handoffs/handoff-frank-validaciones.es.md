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

---

# Respuestas de Frank — sáb 25 jul, ~19:45

> Contestado en el mismo fichero para que quede junto a la pregunta. Orden = el tuyo.

## 1. Túnel HTTPS → **SÍ, adelante.**

Acordado con el integrador. El riesgo de que alguien queme HBAR de testnet por una noche es menor
que perder el flujo móvil, que es la demo entera.

Y va más allá de World: **nuestro propio `seal()` usa WebCrypto**, así que sin origen seguro el
sellado se rompe igual que el bridge de IDKit. Tu diagnóstico de `bridge.ts` no describe un problema
de World, describe un prerrequisito de todo el producto.

⚠️ **`scripts/demo-tunnel.sh` no corre en la máquina del integrador (Windows).** Usa `sed -i ''`
(sintaxis BSD/macOS — en Git Bash falla con "extra characters after command") y `lsof`, que no
existe. Hay que portarlo antes de que sirva de algo aquí.

## 2. Clave de sellado → **NO existe. Par de claves de demo.**

Definitivo, y no es una suposición: es la consecuencia del diseño que ya verificamos. El router de 0G
es una **API de chat**. No hay ningún punto en el que podamos entregarle una clave privada ni hacerle
ejecutar nuestro ECIES dentro del enclave. Está escrito desde S2.2 como **D-M6-2** en
`spec-02-evaluator.md`, y `src/evaluator/evaluate.ts:50` lo marca como frontera abierta en el código.

Así que tu plan B es el correcto y es el que tomamos:

```
OG_ENCLAVE_SEAL_PUBKEY="0922b5b495baf863c9170f03e84d715eb9cfbc6d595a35849d1f8ebffeda5510"
```

Generada con `generateRecipient(DEFAULT_SUITE)` de `src/seal/unseal-testkit.ts` (suite
`x25519-hkdf-sha256-aes256gcm`). El secreto correspondiente vive **sólo en `.env.local`** como
`OG_DEMO_SEAL_SECRET`; S2.9 lo usa para des-sellar en el servidor antes de llamar a `evaluate()`.

**Esto te desbloquea ahora mismo, y creo que no lo tenías identificado:** hoy
`seal-position-form.tsx:172` apaga el paso de sellado cuando esa variable está vacía. Es decir, el
flujo del teléfono **se detiene justo después de tu Selfie Check** — no podías probar tu propio gate
de extremo a extremo aunque World funcionase. Con la clave puesta, se enciende sin tocar código.

**Lo que NO podemos decir a partir de ahora:** *"el plaintext sólo existe dentro del TEE."* Con este
montaje existe un instante en nuestro servidor, entre el des-sellado y la llamada al enclave. Se
cuenta tal cual en la demo y en el README — es la línea que ya escribimos: *"an honest seam, not a
solved problem — do not let it read as one."* Contarlo nos hace más creíbles, no menos.

## 3. World ID 4.0 vs v2 → **las dos, en este orden.**

No lo veo como una disyuntiva, y tu propio commit `665bddc` es la razón: al instalar 4.2.1 con alias
dejando v2 vivo, ya compraste la opción de no elegir. Aprovechémosla.

- **Escribe la ruta 4.x ahora** (tu S3.13). Cuando el RP se active, que sea un cambio de config y no
  una noche de trabajo. El plan de migración de `integration-worldid.md` §5 ya está completo.
- **v2 `device` se queda como fallback** y es lo que se envía si el RP no se desatasca.
- **Booth de World a primera hora** con una sola pregunta: *"RP registration is not active — ¿cómo se
  desatasca?"*

**Una condición, y no es negociable:** el track se llama **Selfie Check Beta**. Si enviamos v2, **no
estamos usando Selfie Check**, y eso tiene que decirse con todas las letras en `world-testing.md` —
en el cuerpo, no en una nota al pie. Un track beta premia el reporte honesto de fricción; disimular
la sustitución es exactamente cómo se pierde.

## 4. Runner del reveal (S2.9) → **lo cojo yo, es lo siguiente que hago.**

Confirmado que hoy no existe: `armReveal()` no se invoca al crear la sala y **nadie llama nunca a
`evaluate()`** — sólo el comentario de `write/actions.ts:44` marcando el punto de entrega. La demo
termina en un contador que no resuelve.

Gracias por dejar `getSealedPayloads()` y `consentFromCommitments()` listos: son exactamente las dos
entradas que necesitaba.

## 5. `MEMORIA.md` → movido a `agente/`, como sugeriste.

## Extra — sobre "Overlap": el nombre sí, el momento no.

El nombre me parece bien y la marca está bien pensada; dala por confirmada para el guion y el README.

Pero **S4.8 después de S2.9**, no antes. A las 19:45, con freeze a las 22:00, ahora mismo no existe un
veredicto. Renombrar toca README, copy de UI, el prefijo `seam-` de las acciones de World (que cambia
los nullifiers **justo mientras estás probando World**), el nombre en el portal y el guion. Es gastar
el tiempo más escaso en la pieza que menos carga.

Y cuando se aplique: el prefijo `seam-`→`overlap-` sólo con World quieto, nunca a mitad de una prueba.

⚠️ **Numeración:** el nombre de producto es **DA11**, no DA9 — DA9/DA10 ya estaban ocupados por
decisiones de 0G citadas desde `env.ts` y el handoff. Tu fila se conservó íntegra, sólo cambió el id.
Igual que tu `S3.6` de worldid 4.0, que pasa a **S3.13** porque ese id era del `room-qr` (reclamado
16:57 vs 17:43). Ver la nota de numeración en `00-overview/05-open-decisions.md`.
