import fs from "node:fs/promises";
import path from "node:path";

export async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

export async function pathExists(target: string) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

export async function emptyDir(dir: string) {
  await fs.rm(dir, { recursive: true, force: true });
  await ensureDir(dir);
}

export async function copyDir(source: string, target: string) {
  await fs.rm(target, { recursive: true, force: true });
  await ensureDir(path.dirname(target));
  await fs.cp(source, target, { recursive: true, force: true });
}

export function stamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

