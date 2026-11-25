export function buildImageUrl(path?: string | null): string | undefined {
  if (!path) return undefined;

  const value = path.trim();
  if (!value) return undefined;
  if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(value)) return value;

  const base = (import.meta.env.VITE_API_URL ?? "").replace(/\/+$/, "");
  return `${base}${value.startsWith("/") ? value : `/${value}`}`;
}
