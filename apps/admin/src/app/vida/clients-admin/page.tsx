// Vida-native — renders the real clients page inside the Vida shell (no old-admin chrome, no exit).
import SourcePage from '@/app/clients/page'
export default function VidaNative_clients_admin(props: { searchParams?: Record<string, string>; params?: Record<string, string> }) {
  return <div className="h-full overflow-y-auto"><SourcePage {...(props as never)} /></div>
}
