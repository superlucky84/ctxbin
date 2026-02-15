const META_HEADER = "ctxbin-meta@1\n";
const META_SEPARATOR = "\n---\n";

export interface Metadata {
  savedAt: string;
  by?: string;
}

export function injectMetadata(body: string, meta: Metadata): string {
  return `${META_HEADER}${JSON.stringify(meta)}${META_SEPARATOR}${body}`;
}

export function stripMetadata(value: string): string {
  if (!value.startsWith(META_HEADER)) return value;
  const sepIdx = value.indexOf(META_SEPARATOR, META_HEADER.length);
  if (sepIdx === -1) return value;
  return value.slice(sepIdx + META_SEPARATOR.length);
}

export function extractMetadata(value: string): Metadata | null {
  if (!value.startsWith(META_HEADER)) return null;
  const sepIdx = value.indexOf(META_SEPARATOR, META_HEADER.length);
  if (sepIdx === -1) return null;
  try {
    return JSON.parse(value.slice(META_HEADER.length, sepIdx));
  } catch {
    return null;
  }
}

export function formatMetadataBlock(meta: Metadata): string {
  let out = `savedAt: ${meta.savedAt}`;
  if (meta.by) out += `\nby: ${meta.by}`;
  return out + "\n---\n";
}
