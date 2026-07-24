// Marca un módulo como server-only: si acaba en un bundle de cliente, el build falla.
// Importar al principio de módulos que tocan secretos (service role, RPC con claves, etc.).
import "server-only";
