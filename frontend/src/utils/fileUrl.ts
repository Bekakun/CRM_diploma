/**
 * Converts a relative /api/v1/files/... path to a full backend URL.
 * On Vercel the frontend and backend are on different domains,
 * so relative paths would resolve to the Vercel domain instead of Render.
 */
export function getFileUrl(url: string | null | undefined): string {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://')) return url

  const backendUrl = import.meta.env.VITE_BACKEND_URL || ''
  if (backendUrl && url.startsWith('/')) {
    return `${backendUrl}${url}`
  }
  return url
}
