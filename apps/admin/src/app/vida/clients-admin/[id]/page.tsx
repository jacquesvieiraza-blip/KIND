// Vida-native — renders the real per-client detail page inside the Vida shell (no old-admin
// chrome, no exit). This closes a Vida-side escape bug: "Manage →" from the clients list used
// to link to /clients/[id], which sits OUTSIDE /vida and drops the top bar + rail — the same
// class of bug as the Milla /dashboard escape (fixed in #1145), just on the operator side.
import SourcePage from '@/app/clients/[id]/page'

export default function VidaNative_clientDetail({ params }: { params: { id: string } }) {
  return <div className="h-full overflow-y-auto"><SourcePage params={params} /></div>
}
