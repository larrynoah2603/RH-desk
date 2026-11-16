#!/usr/bin/env node
/**
 * One-time provisioning. Creates a private .env with a scrypt password hash.
 * No plaintext password is written to disk or committed to Git.
 */
import { randomBytes, scryptSync } from "node:crypto";
import { existsSync } from "node:fs";
import { chmod, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline/promises";

const directory = dirname(fileURLToPath(import.meta.url));
const destination = join(directory, ".env");

if (existsSync(destination)) {
  console.error("Le fichier selfhost/.env existe déjà. Ne le remplacez pas : les sessions et identifiants existants doivent être conservés.");
  process.exitCode = 1;
} else {
  const prompts = createInterface({ input: process.stdin, output: process.stdout });
  const email = (await prompts.question("Adresse e-mail du compte administrateur local : ")).trim().toLowerCase();
  prompts.close();
  if (!/^[^\s@=]+@[^\s@=]+\.[^\s@=]+$/.test(email) || email.length > 254) {
    console.error("Adresse e-mail invalide.");
    process.exitCode = 1;
  } else {
    // 256-bit random password; the cleartext is displayed only once in terminal.
    const password = randomBytes(24).toString("base64url");
    const salt = randomBytes(16);
    const digest = scryptSync(password, salt, 64);
    const hash = "scrypt:" + salt.toString("hex") + ":" + digest.toString("hex");
    const sessionSecret = randomBytes(32).toString("hex");
    const env = [
      "# RH Desk — édition locale. Secret : ne pas partager ni committer ce fichier.",
      "RH_DESK_BACKEND=local",
      "NEXT_PUBLIC_RH_DESK_REMOTE=1",
      "NEXT_PUBLIC_RH_DESK_STORAGE=local-server",
      "RH_DESK_PUBLIC_ORIGIN=http://localhost:3000",
      "RH_LOCAL_DATA_DIR=/data",
      "RH_LOCAL_COOKIE_SECURE=0",
      "RH_LOCAL_ADMIN_EMAIL=" + email,
      "RH_LOCAL_ADMIN_PASSWORD_HASH=" + hash,
      "RH_LOCAL_SESSION_SECRET=" + sessionSecret,
      "",
    ].join("\n");
    await writeFile(destination, env, { flag: "wx", mode: 0o600 });
    await chmod(destination, 0o600);
    console.log("\n====================================");
    console.log("RH DESK LOCAL — COMPTE INITIALISÉ");
    console.log("Adresse : " + email);
    console.log("Mot de passe à conserver : " + password);
    console.log("====================================");
    console.log("Le mot de passe ne sera plus affiché.");
    console.log("Lancement : cd selfhost && docker compose up --build -d");
    console.log("Ouverture : http://localhost:3000");
  }
}
