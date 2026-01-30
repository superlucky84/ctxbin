import tar from "tar";

export interface TarEntryInfo {
  path: string;
  type: string;
  size: number;
  mode: number;
}

export async function listTarEntries(file: string): Promise<TarEntryInfo[]> {
  const entries: TarEntryInfo[] = [];
  await tar.t({
    file,
    onentry(entry) {
      entries.push({
        path: entry.path,
        type: entry.type,
        size: entry.size ?? 0,
        mode: entry.mode ?? 0,
      });
    },
  });
  return entries;
}
