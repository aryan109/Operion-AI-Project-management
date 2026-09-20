import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../..");
const distDir = path.join(rootDir, "dist");
const publicDistDir = path.join(rootDir, "public/dist");
const claudeDir = path.join(rootDir, "connectors/claude");

// Ensure output dirs exist
if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });
if (!fs.existsSync(publicDistDir)) fs.mkdirSync(publicDistDir, { recursive: true });

const destZip = path.join(distDir, "operion.mcpb");
const publicZip = path.join(publicDistDir, "operion.mcpb");

// Remove older archives if present
if (fs.existsSync(destZip)) fs.unlinkSync(destZip);
if (fs.existsSync(publicZip)) fs.unlinkSync(publicZip);

console.log("Packaging Operion Claude Desktop Extension (.mcpb)...");

const tempZip = path.join(distDir, "operion.zip");
if (fs.existsSync(tempZip)) fs.unlinkSync(tempZip);

try {
  // Compress to .zip first (PowerShell requirement), then rename to .mcpb
  const cmd = `powershell -Command "Compress-Archive -Path '${claudeDir}/manifest.json', '${claudeDir}/bridge.mjs', '${claudeDir}/icon.png' -DestinationPath '${tempZip}' -Force"`;
  execSync(cmd, { stdio: "inherit" });

  fs.copyFileSync(tempZip, destZip);
  fs.copyFileSync(tempZip, publicZip);
  fs.unlinkSync(tempZip);

  console.log(`✓ Claude Desktop Extension successfully generated:`);
  console.log(`  -> Local build: ${destZip}`);
  console.log(`  -> Web downloadable: ${publicZip} (accessible at /dist/operion.mcpb)`);
} catch (err) {
  console.error("Failed to package extension:", err);
  process.exit(1);
}
