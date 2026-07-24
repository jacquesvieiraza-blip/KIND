// Vida-native — renders the real revenue page inside the Vida shell (no old-admin chrome, no exit).
import SourcePage from '@/app/revenue/page'
export default function VidaNative_revenue(props: { searchParams?: Record<string, string>; params?: Record<string, string> }) {
  return <div className="h-full overflow-y-auto"><SourcePage {...(props as never)} /></div>
}
