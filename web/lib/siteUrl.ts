/** Canonical public site URL (no trailing slash). */
export function getSiteUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ??
    'https://shimeji.blog'
  );
}
