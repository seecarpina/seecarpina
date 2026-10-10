import { copyFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Cada portal publica uma cópia dos recursos compartilhados em suas URLs atuais.
const fonte = fileURLToPath(new URL("./", import.meta.url));
const portal = process.cwd();
for (const arquivo of ["src/js/pedidoPDF.js", "src/css/login.css", "src/images/papel-timbrado.png"]) {
  const destino = resolve(portal, arquivo);
  await mkdir(dirname(destino), { recursive: true });
  await copyFile(resolve(fonte, arquivo), destino);
}
console.log("Recursos compartilhados preparados.");
