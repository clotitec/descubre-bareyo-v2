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

console.log('OK sanitizeHtml: 7/7');
