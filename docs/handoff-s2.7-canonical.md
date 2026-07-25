# Handoff · S2.7 — canonical consolidation (for Dylan)

Status: ⬜ todo · owner **dylan** · raised by frank (S1.4) · blocks a real bug at **S2.3**

> **TL;DR** — there are two canonical serializers in the repo. Frank's is now the shared one at
> `src/lib/canonical.ts`. Please migrate `registry` onto it and delete `src/registry/canonical.ts`.
> Nothing is broken today; it breaks at S2.3 if we leave it.

## Why this matters

Both files answer the same question — *"turn this object into bytes that two machines agree on"* — and
they answer it differently. Right now that is harmless, because today's payloads are plain ASCII
strings validated by Zod. It stops being harmless at **S2.3**, when the verdict record crosses both
boundaries:

```
enclave signs the verdict   -> bytes from lib/canonical      (attest verifies over these)
registry writes the verdict -> bytes from registry/canonical (published to the HCS topic)
```

If those two disagree by one byte, **what was signed is not what was published** — and "the attested
verdict is the one on the topic" is the entire claim Seam is selling. Worse, it fails silently: no
error, no crash, just a signature that does not correspond to the published record. Nobody notices
until a judge checks.

## The measured divergence

Both implementations were run over the same eight inputs (`canonicalize` vs `canonicalJson`):

| Input | `lib/canonical` | `registry/canonical` | |
|---|---|---|:--:|
| `{verdict:"workable", sessionId:"s1"}` | `{"sessionId":"s1","verdict":"workable"}` | same | ✅ |
| same object, keys reordered | identical bytes | same | ✅ |
| nested objects + arrays | identical bytes | same | ✅ |
| `"café"` **NFC** (é as one code point) | `{"t":"café"}` | same | ✅ |
| `"café"` **NFD** (e + combining accent) | `{"t":"café"}` *(normalized)* | `{"t":"café"}` *(not normalized)* | ❌ |
| `{amount: 1.5}` | throws `NotCanonicalError` | `{"amount":1.5}` | ❌ |
| `{at: new Date(0)}` | throws `NotCanonicalError` | **`{"at":{}}`** | ❌ |
| `{n: 10n}` (bigint) | `{"n":10}` | throws `TypeError` | ❌ |

**The NFD row is the one that will actually bite us.** We are in Lisbon, the input is plain-language
text, and accented characters have two valid Unicode encodings that look identical on screen. A user
pasting from one editor vs typing directly can produce different bytes for visibly identical text.
`lib/canonical` normalizes to NFC; the registry one does not.

**The Date row is a bug regardless of this migration.** `canonicalise()` rebuilds the object from
`Object.keys()` before `JSON.stringify` ever runs, so `toJSON()` is never called and a `Date`
silently becomes `{}` — the date is gone, no error. It does not fire today because `session.ts`
converts to ISO strings first (`now.toISOString()`), which is the right habit. But it is a loaded
gun: the next person who passes a `Date` straight in loses the value silently.

## What to do

1. Replace `import { canonicalJson } from "./canonical"` in `src/registry/write.ts` with
   `import { canonicalize } from "../lib/canonical"`. The functions are equivalent for your current
   payloads — `canonicalize` returns the same string type.
2. Update the re-export in `src/registry/index.ts`.
3. Delete `src/registry/canonical.ts` and `src/registry/canonical.test.ts`. The behaviour they cover
   is already tested by `src/lib/canonical.test.ts` (16 tests), which is a strict superset.
4. Run `npm run test` — `write.test.ts` should pass unchanged. If anything fails, it is a real
   divergence and worth a message rather than a workaround.

## One thing to know before you migrate

`lib/canonical` is **stricter**: it throws where the other coerced. Floats, `Date`, `Map`, `Set`,
typed arrays and circular references are rejected instead of silently becoming something else. That
is deliberate — in crypto, failing loudly beats guessing. If a registry payload legitimately needs a
float, say so and we will decide together how to encode it (fixed-point string is the usual answer);
please do not relax the rule locally, because the whole point is that there is one rule.
