// Vida-native — renders the real billing page inside the Vida shell (no old-admin chrome, no exit).
import SourcePage from '@/app/billing/page'
export default function VidaNative_billing(props: { searchParams?: Record<string, string>; params?: Record<string, string> }) {
  return <div className="h-full overflow-y-auto"><SourcePage {...(props as never)} /></div>
}
