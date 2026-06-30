import assert from 'node:assert/strict';
import { sanitizeHtml } from '../scripts/fetch-events.mjs';

// 1) elimina <script> y su contenido
assert.equal(sanitizeHtml('<p>Hola<script>alert(1)</script> mundo</p>'), '<p>Hola mundo</p>');
// 2) elimina atributos on* y desconocidos, conserva el tag permitido
assert.equal(sanitizeHtml('<p onclick="x()" style="color:red">Hola</p>'), '<p>Hola</p>');
// 3) href javascript: se descarta; el <a> queda sin href
assert.equal(sanitizeHtml('<a href="javascript:alert(1)">x</a>'), '<a>x</a>');
// 4) href https se conserva con target/rel forzados
assert.equal(sanitizeHtml('<a href="https://x.com/y">x</a>'),
  '<a href="https://x.com/y" target="_blank" rel="noopener">x</a>');
// 5) img https se conserva normalizada; sin src http(s) se elimina
assert.equal(sanitizeHtml('<img src="https://x/y.jpg" onerror="x">'),
  '<img src="https://x/y.jpg" alt="" loading="lazy">');
assert.equal(sanitizeHtml('<img src="data:image/png;base64,AAAA">'), '');
// 6) tag no permitido se elimina pero conserva el texto
assert.equal(sanitizeHtml('<div>hola</div>'), 'hola');
// 7) null/undefined → ''
assert.equal(sanitizeHtml(null), '');

// ── Regresión de seguridad (vectores hallados por revisión) ──
// 8) entidad-contrabando de <script>: se decodifica primero y se elimina
assert.equal(sanitizeHtml('&lt;script&gt;alert(1)&lt;/script&gt;'), '');
// 9) tag en MAYÚSCULAS también se elimina
assert.equal(sanitizeHtml('<SCRIPT>alert(1)</SCRIPT>ok'), 'ok');
// 10) breakout vía &quot; en src (con y sin espacio): NO debe quedar una comilla que cierre el atributo seguida de un handler
assert.ok(!/"\s*onerror/i.test(sanitizeHtml('&lt;img src="https://x.com&amp;quot; onerror=alert(1)"&gt;')), 'breakout &quot; con espacio');
assert.ok(!/"\s*onerror/i.test(sanitizeHtml('&lt;img src="https://x.com&amp;quot;onerror=alert(1)"&gt;')), 'breakout &quot; sin espacio');
// 11) breakout vía comilla simple que contiene comilla doble en href
assert.ok(!/"\s*onmouseover/i.test(sanitizeHtml("<a href='https://x\" onmouseover=alert(1) y='>z</a>")), 'breakout comilla mixta');

console.log('OK sanitizeHtml: 11/11 (incl. regresión XSS)');
