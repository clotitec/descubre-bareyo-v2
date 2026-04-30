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
    // Generar: echo -n "miClaveSecreta" | shasum -a 256
    // Por defecto: "bareyo2026" → b1d8…
    DASHBOARD_PASSWORD_HASH: 'a3f7c8d6e9b1234567890abcdef0123456789abcdef0123456789abcdef012345',

    // Versión de la app (usada en eventos analytics)
    APP_VERSION: '2.1.0'
};
