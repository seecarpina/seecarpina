import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, rmSync, readdirSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { execFileSync } from "node:child_process";

const json = caminho => JSON.parse(readFileSync(caminho, "utf8"));
const recursos = ["src/js/pedidoPDF.js", "src/css/login.css", "src/images/papel-timbrado.png"];

test("portais separados declaram a dependência compartilhada no workspace e no lockfile", () => {
  const raiz = json("package.json");
  assert.deepEqual(raiz.workspaces, ["secretaria", "gestao-escolar", "packages/*"]);
  const compartilhado = json("packages/compartilhado/package.json");
  const lock = json("package-lock.json");
  const nomes = new Set([raiz.name, compartilhado.name]);
  for (const pasta of ["secretaria", "gestao-escolar"]) {
    const pacote = json(`${pasta}/package.json`);
    assert.ok(!nomes.has(pacote.name));
    nomes.add(pacote.name);
    assert.equal(pacote.dependencies[compartilhado.name], compartilhado.version);
    assert.equal(lock.packages[pasta].dependencies[compartilhado.name], compartilhado.version);
    assert.equal(json(`${pasta}/vercel.json`).outputDirectory, ".");
    assert.ok(existsSync(`${pasta}/index.html`));
  }
});

test("build copia somente os recursos compartilhados e preserva seus bytes", () => {
  const destino = mkdtempSync(join(tmpdir(), "see-compartilhado-"));
  try {
    execFileSync(process.execPath, [resolve("packages/compartilhado/preparar.mjs")], { cwd: destino });
    for (const recurso of recursos) {
      assert.deepEqual(readFileSync(join(destino, recurso)), readFileSync(join("packages/compartilhado", recurso)));
    }
    assert.deepEqual(readdirSync(destino), ["src"]);
    const pdf = readFileSync(join(destino, "src/js/pedidoPDF.js"), "utf8");
    assert.match(pdf, /\.\.\/images\/papel-timbrado\.png/);
    assert.ok(existsSync(join(destino, "src/images/papel-timbrado.png")));
  } finally {
    rmSync(destino, { recursive: true, force: true });
  }
});

test("imports locais dos portais se resolvem dentro da própria publicação após o build", () => {
  function arquivos(pasta) {
    return readdirSync(pasta, { withFileTypes: true }).flatMap(item => {
      const caminho = join(pasta, item.name);
      return item.isDirectory() ? arquivos(caminho) : caminho.endsWith(".js") ? [caminho] : [];
    });
  }
  for (const pasta of ["secretaria", "gestao-escolar"]) {
    for (const arquivo of arquivos(`${pasta}/src/js`)) {
      const fonte = readFileSync(arquivo, "utf8");
      for (const [, caminho] of fonte.matchAll(/(?:from\s+|import\s*)["'](\.[^"']+)["']/g)) {
        const destino = resolve(dirname(arquivo), caminho);
        assert.ok(destino.startsWith(resolve(pasta) + "/"), `${arquivo}: ${caminho} fora do portal`);
        assert.ok(existsSync(destino), `${arquivo}: ${caminho} ausente`);
      }
    }
  }
});

test("raiz antiga não publica páginas ausentes e a API permanece no projeto da secretaria", () => {
  assert.equal(json("vercel.json").git.deploymentEnabled, false);
  assert.notEqual(json("secretaria/vercel.json").git?.deploymentEnabled, false);
  assert.ok(existsSync("secretaria/api/revisar-texto.js"));
  assert.ok(existsSync("secretaria/server/revisao.js"));
  assert.ok(!existsSync("gestao-escolar/api/revisar-texto.js"));
});
