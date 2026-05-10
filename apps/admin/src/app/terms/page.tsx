export const dynamic = 'force-dynamic'

import { TermsLibrary } from './TermsLibrary'

export default function TermsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Terms Library</h1>
        <p className="text-sm text-gray-500 mt-1">
          Upload your T&amp;C documents once. They appear as an expandable section on every client&apos;s Order Form.
        </p>
      </div>
      <TermsLibrary />
    </div>
  )
}
