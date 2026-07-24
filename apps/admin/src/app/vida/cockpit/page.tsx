// Vida-native — renders the real Cockpit inside the Vida shell (no old-admin chrome).
import CockpitPage from '@/app/cockpit/page'
export default function VidaCockpit(props: { searchParams?: Record<string, string> }) {
  return <div className="h-full overflow-y-auto"><CockpitPage {...(props as never)} /></div>
}
