// Vida-native — renders the real outreach page inside the Vida shell (no old-admin chrome, no exit).
import SourcePage from '@/app/outreach/page'
export default function VidaNative_outreach(props: { searchParams?: Record<string, string>; params?: Record<string, string> }) {
  return <div className="h-full overflow-y-auto"><SourcePage {...(props as never)} /></div>
}
