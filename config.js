/* Descubre Bareyo — Configuración runtime
 *
 * Este archivo se carga ANTES que app.js. Contiene URLs y claves públicas
 * (anon, no secret) que pueden ir al cliente.
 *
 * Para activar Supabase (S7+):
 *   1. Crea un proyecto en https://supabase.com
 *   2. Copia la URL del proyecto y la `anon` key (Settings > API)
 *   3. Reemplaza los valores vacíos abajo
 *   4. Aplica el esquema SQL de docs/DEPLOY.md (events, business_requests, qr_locations)
 *
 * Si los valores siguen vacíos, la app funciona pero los eventos analytics
 * solo se guardan en localStorage (modo demo). El dashboard sigue
 * funcionando con esos datos locales.
 */

window.BAREYO_CONFIG = {
    SUPABASE_URL: '',
    SUPABASE_ANON_KEY: '',

    // Hash SHA-256 de la clave del dashboard / panel admin.
    // Generar: node -e "console.log(require('crypto').createHash('sha256').update('TU_CLAVE').digest('hex'))"
    // Valor actual = SHA-256 de "bareyo2026" (cámbiala en producción).
    DASHBOARD_PASSWORD_HASH: '2307a700438a5ff02fc8acc40e530b34ba3228e2bc59a88a74a24acc0d211ced',

    // Versión de la app (usada en eventos analytics)
    APP_VERSION: '2.1.0',

    // Clave gratuita de https://openchargemap.org/site/develop/api (Register > Create API Key).
    // Sin ella, el widget de "Servicios" muestra el bloque de carga eléctrica como "próximamente".
    OPENCHARGEMAP_KEY: ''
};
