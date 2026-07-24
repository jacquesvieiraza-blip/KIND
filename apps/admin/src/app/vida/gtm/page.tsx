// Vida-native — renders the real GTM Hub inside the Vida shell.
import GtmPage from '@/app/gtm/page'
export default function VidaGtm(props: { searchParams: { tab?: string } }) {
  return <div className="h-full overflow-y-auto"><GtmPage {...props} /></div>
}
