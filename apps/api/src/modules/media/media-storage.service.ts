import { Injectable } from "@nestjs/common";
import { mkdir, writeFile, unlink } from "fs/promises";
import { join } from "path";

// Object storage provider is an unresolved Open Decision (CLAUDE.md SS39 — "production
// ...object storage" is explicitly listed as something not to invent). This is a
// provider-agnostic local-disk implementation for development, mirroring the same
// interface/local-implementation split already used for identity (AuthProvider /
// LocalAuthProvider). Swapping in a real object storage provider later means adding a new
// implementation of this same shape, not touching any caller.
//
// `storageKey` is an opaque relative path; callers never construct filesystem paths
// themselves. `resolveUrl()` is the only place that knows how a key becomes a URL.
export interface MediaStorage {
  save(key: string, buffer: Buffer): Promise<void>;
  delete(key: string): Promise<void>;
  resolveUrl(key: string): string;
}

const UPLOAD_ROOT = join(process.cwd(), "uploads");

@Injectable()
export class LocalDiskMediaStorage implements MediaStorage {
  async save(key: string, buffer: Buffer): Promise<void> {
    const fullPath = join(UPLOAD_ROOT, key);
    await mkdir(join(fullPath, ".."), { recursive: true });
    await writeFile(fullPath, buffer);
  }

  async delete(key: string): Promise<void> {
    try {
      await unlink(join(UPLOAD_ROOT, key));
    } catch {
      // Already gone — deleting a DB row whose file was already removed shouldn't fail.
    }
  }

  resolveUrl(key: string): string {
    const base = process.env.API_PUBLIC_BASE_URL ?? `http://localhost:${process.env.PORT ?? 4000}`;
    return `${base}/uploads/${key}`;
  }
}
