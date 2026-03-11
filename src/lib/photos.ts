const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const photosPublicBaseUrl = supabaseUrl
  ? `${supabaseUrl}/storage/v1/object/public/photos/`
  : ""

export function getPhotoUrl(path: string) {
  return `${photosPublicBaseUrl}${path}`
}
