import fs from "node:fs/promises";

export async function safeChmod(path: string, mode: number): Promise<void> {
  try {
    await fs.chmod(path, mode);
  } catch (err) {
    if (process.platform === "win32") {
      return;
    }
    throw err;
  }
}
