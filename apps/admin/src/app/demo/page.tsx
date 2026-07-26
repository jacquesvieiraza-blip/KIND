// The demo page moved to /vida/demo so it renders inside the Vida shell rather than the old
// Admin-OS one. This redirect keeps any bookmark or old link working.
import { redirect } from 'next/navigation'

export default function DemoMoved() {
  redirect('/vida/demo')
}
