import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

for (const pasta of ["secretaria", "gestao-escolar"]) {
  test(`instalação em ${pasta} resolve os recursos na raiz de cada publicação`, () => {
    const base = resolve(pasta);
    const manifesto = JSON.parse(readFileSync(resolve(base, "manifest.webmanifest"), "utf8"));
    assert.equal(manifesto.display, "standalone");
    assert.ok(manifesto.name);
    for (const url of ["https://app.example/manifest.webmanifest", "https://app.example/gestao-escolar/manifest.webmanifest"]) {
      const escopo = new URL(manifesto.scope, url);
      assert.equal(new URL(manifesto.start_url, url).href, escopo.href);
      assert.equal(new URL(manifesto.id, url).href, escopo.href);
      for (const icone of manifesto.icons) assert.ok(new URL(icone.src, url).href.startsWith(escopo.href));
    }
    for (const dimensao of [192, 512]) {
      const icone = manifesto.icons.find(item => item.sizes === `${dimensao}x${dimensao}`);
      assert.ok(icone);
      const png = readFileSync(new URL(icone.src, pathToFileURL(resolve(base, "manifest.webmanifest"))));
      assert.equal(png.readUInt32BE(16), dimensao);
      assert.equal(png.readUInt32BE(20), dimensao);
    }
    for (const arquivo of readdirSync(base).filter(nome => nome.endsWith(".html"))) {
      const caminho = resolve(base, arquivo);
      const html = readFileSync(caminho, "utf8");
      assert.match(html, /rel="manifest" href="\.\/manifest\.webmanifest"/, arquivo);
      const iconeApple = html.match(/rel="apple-touch-icon"[^>]*href="([^"]+)"/);
      assert.ok(iconeApple, arquivo);
      const png = readFileSync(new URL(iconeApple[1], pathToFileURL(caminho)));
      assert.equal(png.readUInt32BE(16), 180);
      assert.equal(png.readUInt32BE(20), 180);
    }
  });
}
