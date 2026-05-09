import { MessageSquare } from 'lucide-react'

export default function ChatbotPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Chatbot Agent</h1>
        <p className="text-gray-500 text-sm mt-1">
          Web and WhatsApp AI chatbot for your customers.
        </p>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 p-6 text-center py-16 text-gray-400">
        <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm">Chatbot Agent builds in Week 3.</p>
      </div>
    </div>
  )
}
