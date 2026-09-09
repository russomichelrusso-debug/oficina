import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export const UPLOADS_ROOT = path.resolve(__dirname, "../../uploads");

/**
 * Armazenamento de mídia local em disco (spec §4.10 e §2 pedem object
 * storage S3-compatível; este ambiente de desenvolvimento não tem um bucket
 * configurado — ver docs/status-implementacao.md). A interface é
 * propositalmente mínima (`save(key, buffer) => storageKey`) para que trocar
 * por um provedor S3-compatível (ex.: Cloudflare R2) seja só reimplementar
 * esta classe; nenhum outro módulo depende de detalhes de disco.
 */
@Injectable()
export class StorageService {
  async save(key: string, buffer: Buffer): Promise<string> {
    const fullPath = path.join(UPLOADS_ROOT, key);
    await mkdir(path.dirname(fullPath), { recursive: true });
    await writeFile(fullPath, buffer);
    return key;
  }

  buildKey(prefix: string, filename: string): string {
    const safeName = filename.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    return path.posix.join(prefix, `${randomUUID()}-${safeName}`);
  }

  publicUrl(key: string): string {
    return `/uploads/${key}`;
  }
}
