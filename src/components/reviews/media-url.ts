export function reviewMediaUrl(path: string): string {
  const base = import.meta.env.VITE_SUPABASE_URL as string;
  return `${base}/storage/v1/object/public/review-media/${path.split("/").map(encodeURIComponent).join("/")}`;
}
