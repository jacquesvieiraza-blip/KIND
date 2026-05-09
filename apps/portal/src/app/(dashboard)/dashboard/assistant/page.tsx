import { Bot } from 'lucide-react'

export default function AssistantPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Virtual Assistant</h1>
        <p className="text-gray-500 text-sm mt-1">
          Scheduling, email drafting, research, and knowledge queries.
        </p>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 p-6 text-center py-16 text-gray-400">
        <Bot className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm">Virtual Assistant builds in Week 2.</p>
      </div>
    </div>
  )
}
