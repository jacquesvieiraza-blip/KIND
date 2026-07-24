// Vida-native — renders the real money-path page inside the Vida shell (no old-admin chrome, no exit).
import SourcePage from '@/app/money-path/page'
export default function VidaNative_money_path(props: { searchParams?: Record<string, string>; params?: Record<string, string> }) {
  return <div className="h-full overflow-y-auto"><SourcePage {...(props as never)} /></div>
}
