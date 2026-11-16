import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { dataDir } from "./db";

// Account credentials are encrypted at rest with AES-256-GCM. The key comes from
// APP_SECRET; without it (local use) a random secret is generated next to the database.

let cachedKey: Buffer | undefined;

function key(): Buffer {
  if (cachedKey) return cachedKey;
  let secret = process.env.APP_SECRET;
  if (!secret) {
    const file = path.join(dataDir(), "secret.key");
    if (existsSync(file)) {
      secret = readFileSync(file, "utf8").trim();
    } else {
      mkdirSync(dataDir(), { recursive: true });
      secret = randomBytes(32).toString("hex");
      writeFileSync(file, secret, { mode: 0o600 });
    }
  }
  cachedKey = scryptSync(secret, "asy-credentials-v1", 32);
  return cachedKey;
}

export function encryptJson(value: unknown): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const body = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), body].map((b) => b.toString("base64")).join(".");
}

export function decryptJson<T>(payload: string): T {
  const [iv, tag, body] = payload.split(".").map((p) => Buffer.from(p, "base64"));
  const decipher = createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(tag);
  return JSON.parse(Buffer.concat([decipher.update(body), decipher.final()]).toString("utf8")) as T;
}
