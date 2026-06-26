#!/usr/bin/env node
/**
 * fetch-events.mjs — Descubre Bareyo
 * Baja noticias/actividades del Ayuntamiento de Bareyo (WordPress REST, público sin tokens)
 * y genera events.json en la raíz del repo. Lo ejecuta GitHub Actions (cron diario) y, si hay
 * cambios, commitea → Vercel auto-despliega. Mantiene el proyecto 100% estático.
 *
 * Fuente: https://www.aytobareyo.org/wp-json/wp/v2/posts  (RSS/REST público — ver memoria
 * bareyo-eventos-fuente). Las redes sociales NO se ingieren (requieren tokens del cliente).
 *
 * Sin dependencias npm: solo Node >= 18 (global fetch). Tolerante a fallos: si la red falla,
 * conserva el events.json previo y sale con código 0 para no romper el workflow.
 */

import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'events.json');

const SOURCE = 'https://www.aytobareyo.org';
const API = `${SOURCE}/wp-json/wp/v2/posts?per_page=20&_embed`;
const MAX_EVENTS = 18;
const SUMMARY_LEN = 220;

// — Helpers de limpieza de HTML de WordPress —
const ENTITIES = {
  '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#039;': "'", '&#39;': "'",
  '&#8217;': '’', '&#8216;': '‘', '&#8220;': '“', '&#8221;': '”',
  '&#8211;': '–', '&#8212;': '—', '&hellip;': '…', '&#8230;': '…',
  '&nbsp;': ' ', '&aacute;': 'á', '&eacute;': 'é', '&iacute;': 'í', '&oacute;': 'ó',
  '&uacute;': 'ú', '&ntilde;': 'ñ', '&Aacute;': 'Á', '&Eacute;': 'É', '&Iacute;': 'Í',
  '&Oacute;': 'Ó', '&Uacute;': 'Ú', '&Ntilde;': 'Ñ', '&uuml;': 'ü', '&Uuml;': 'Ü'
};

function decodeEntities(s) {
  if (!s) return '';
  return s.replace(/&[a-zA-Z#0-9]+;/g, m => ENTITIES[m] ?? m)
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n));
}

function stripHtml(s) {
  if (!s) return '';
  return decodeEntities(String(s).replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function truncate(s, n) {
  if (s.length <= n) return s;
  const cut = s.slice(0, n);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > n * 0.6 ? cut.slice(0, lastSpace) : cut).trim() + '…';
}

function categoryNames(post) {
  const terms = post?._embedded?.['wp:term'] || [];
  const cats = (terms[0] || []).map(t => t?.name).filter(Boolean);
  return cats.length ? cats : [];
}

function featuredImage(post) {
  const media = post?._embedded?.['wp:featuredmedia']?.[0];
  if (!media) return null;
  // preferir un tamaño medio si existe
  const sizes = media?.media_details?.sizes;
  if (sizes) {
    for (const key of ['medium_large', 'large', 'medium', 'full']) {
      if (sizes[key]?.source_url) return sizes[key].source_url;
    }
  }
  return media.source_url || null;
}

function mapPost(post) {
  return {
    id: post.id,
    title: stripHtml(post?.title?.rendered) || 'Sin título',
    date: (post.date || '').slice(0, 10),       // YYYY-MM-DD (hora local del sitio)
    datetime: post.date || null,                 // ISO completo
    link: post.link || SOURCE,
    summary: truncate(stripHtml(post?.excerpt?.rendered), SUMMARY_LEN),
    image: featuredImage(post),
    categories: categoryNames(post)
  };
}

async function main() {
  let posts;
  try {
    const res = await fetch(API, {
      headers: { 'User-Agent': 'DescubreBareyo/2 (+https://descubre-bareyo-v2.vercel.app)' }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    posts = await res.json();
  } catch (err) {
    console.error('[fetch-events] Error al bajar de WP REST:', err.message);
    if (existsSync(OUT)) {
      console.error('[fetch-events] Conservo el events.json previo. Salida limpia.');
      process.exit(0);
    }
    // Sin red y sin fichero previo: generar uno vacío válido para no romper la app.
    writeFileSync(OUT, JSON.stringify({ generated: null, source: SOURCE, count: 0, events: [] }, null, 2) + '\n', 'utf8');
    process.exit(0);
  }

  if (!Array.isArray(posts)) {
    console.error('[fetch-events] Respuesta inesperada (no es array). Aborto sin tocar events.json.');
    process.exit(0);
  }

  const events = posts
    .map(mapPost)
    .filter(e => e.title && e.date)
    .sort((a, b) => (b.datetime || '').localeCompare(a.datetime || ''))
    .slice(0, MAX_EVENTS);

  // generated se pasa por argumento (GitHub Actions inyecta la fecha) o se omite para
  // mantener diffs estables; aquí usamos la fecha del runner solo si se pide.
  const stamp = process.argv.includes('--stamp') ? new Date().toISOString() : null;

  const payload = { generated: stamp, source: SOURCE, count: events.length, events };
  writeFileSync(OUT, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  console.log(`[fetch-events] OK · ${events.length} eventos escritos en events.json`);
  if (events[0]) console.log(`[fetch-events] Más reciente: ${events[0].date} — ${events[0].title}`);
}

main();
