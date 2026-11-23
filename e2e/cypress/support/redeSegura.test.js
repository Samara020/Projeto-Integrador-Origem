const test = require("node:test");
const assert = require("node:assert/strict");
const {
  ehImagemPublicaDeCatalogo,
  IMAGEM_PUBLICA_HOST,
  IMAGEM_PUBLICA_PREFIXO,
} = require("./redeSegura");

const BASE = `https://${IMAGEM_PUBLICA_HOST}${IMAGEM_PUBLICA_PREFIXO}`;

const pedido = (url, extras = {}) => ({
  url,
  method: "GET",
  resourceType: "image",
  ...extras,
});

test("permite GET de imagem no bucket público exato", () => {
  assert.equal(
    ehImagemPublicaDeCatalogo(pedido(`${BASE}vaso-ceramica.jpg`)),
    true,
  );
});

test("permite extensões de imagem em maiúsculas e parâmetros de transformação", () => {
  assert.equal(
    ehImagemPublicaDeCatalogo(pedido(`${BASE}vaso-ceramica.JPG`)),
    true,
  );
  assert.equal(
    ehImagemPublicaDeCatalogo(pedido(`${BASE}vaso-ceramica.webp?width=640&quality=80`)),
    true,
  );
});

test("bloqueia o mesmo host quando não é carregamento de imagem", () => {
  assert.equal(
    ehImagemPublicaDeCatalogo(
      pedido(`${BASE}vaso-ceramica.jpg`, { resourceType: "fetch" }),
    ),
    false,
  );
  assert.equal(
    ehImagemPublicaDeCatalogo(
      pedido(`${BASE}vaso-ceramica.jpg`, { resourceType: "xhr" }),
    ),
    false,
  );
});

test("bloqueia métodos diferentes de GET", () => {
  assert.equal(
    ehImagemPublicaDeCatalogo(
      pedido(`${BASE}vaso-ceramica.jpg`, { method: "POST" }),
    ),
    false,
  );
});

test("bloqueia host parecido, subdomínio malicioso ou HTTP", () => {
  assert.equal(
    ehImagemPublicaDeCatalogo(pedido("https://outro-projeto.supabase.co/storage/v1/object/public/origem-assets/vaso-ceramica.jpg")),
    false,
  );
  assert.equal(
    ehImagemPublicaDeCatalogo(pedido(`https://${IMAGEM_PUBLICA_HOST}.evil.example/storage/v1/object/public/origem-assets/vaso-ceramica.jpg`)),
    false,
  );
  assert.equal(
    ehImagemPublicaDeCatalogo(pedido(`http://${IMAGEM_PUBLICA_HOST}${IMAGEM_PUBLICA_PREFIXO}vaso-ceramica.jpg`)),
    false,
  );
});

test("bloqueia outro bucket/caminho no mesmo host", () => {
  assert.equal(
    ehImagemPublicaDeCatalogo(pedido(`https://${IMAGEM_PUBLICA_HOST}/storage/v1/object/public/outro-bucket/vaso-ceramica.jpg`)),
    false,
  );
  assert.equal(
    ehImagemPublicaDeCatalogo(pedido(`https://${IMAGEM_PUBLICA_HOST}/storage/v1/object/sign/origem-assets/vaso-ceramica.jpg`)),
    false,
  );
  assert.equal(
    ehImagemPublicaDeCatalogo(pedido(`https://${IMAGEM_PUBLICA_HOST}/rest/v1/produtos`)),
    false,
  );
});

test("bloqueia arquivo sem extensão de imagem no prefixo do bucket", () => {
  assert.equal(
    ehImagemPublicaDeCatalogo(pedido(`${BASE}vaso-ceramica.svg.txt`)),
    false,
  );
  assert.equal(
    ehImagemPublicaDeCatalogo(pedido(`${BASE}config.json`)),
    false,
  );
});

test("bloqueia URLs inválidas, requisição sem método/tipo e o runtime principal", () => {
  assert.equal(ehImagemPublicaDeCatalogo(pedido("nao-e-url")), false);
  assert.equal(ehImagemPublicaDeCatalogo(pedido("http://localhost:4000/produtos")), false);
  assert.equal(
    ehImagemPublicaDeCatalogo(pedido(`${BASE}vaso-ceramica.jpg`, { method: undefined })),
    false,
  );
  assert.equal(
    ehImagemPublicaDeCatalogo(pedido(`${BASE}vaso-ceramica.jpg`, { resourceType: undefined })),
    false,
  );
  assert.equal(ehImagemPublicaDeCatalogo(null), false);
});
