/**
 * pages/ChatPage.jsx  —  Main chat interface
 *
 * Layout:
 *   - Welcome screen when no messages
 *   - Message list when conversation active
 *   - Fixed input bar at bottom
 */

import { useEffect, useRef, useState } from 'react'
import { Sparkles, FileText, Code, BookOpen } from 'lucide-react'
import { useStore } from '../store'
import MessageBubble from '../components/chat/MessageBubble'
import TypingIndicator from '../components/chat/TypingIndicator'
import ChatInput from '../components/chat/ChatInput'
import UploadZone from '../components/documents/UploadZone'
import Topbar from '../components/layout/Topbar'

const SUGGESTED_PROMPTS = [
  { icon: FileText,  text: 'Summarise the key points from my documents' },
  { icon: Code,      text: 'Explain any technical concepts found in the docs' },
  { icon: BookOpen,  text: 'What are the main topics covered?' },
  { icon: Sparkles,  text: 'Find any recommendations or conclusions' },
]

export default function ChatPage() {
  const { messages, isAsking, loadConversations, askQuestion } = useStore()
  const [showUpload, setShowUpload] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    loadConversations()
  }, [])

  // Auto-scroll to bottom whenever a new message appears
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isAsking])

  const isEmpty = messages.length === 0

  return (
    <div className="flex flex-col h-full">
      <Topbar />

      {/* ─── Message area ─── */}
      <div className="flex-1 overflow-y-auto">
        {isEmpty ? (
          /* Welcome screen */
          <div className="flex flex-col items-center justify-center h-full px-4 pb-20">
            <div className="w-14 h-14 rounded-2xl bg-accent-purpleDim border border-accent-purple/30
                            flex items-center justify-center mb-5">
              <Sparkles size={24} className="text-accent-purpleLight" />
            </div>
            <h2 className="text-2xl font-semibold text-text-primary mb-2">
              How can I help you today?
            </h2>
            <p className="text-sm text-text-secondary mb-10 text-center max-w-sm">
              Upload your PDFs and ask anything. I'll find the answers from your documents.
            </p>

            {/* Suggested prompts */}
            <div className="grid grid-cols-2 gap-3 w-full max-w-2xl">
              {SUGGESTED_PROMPTS.map(({ icon: Icon, text }) => (
                <button
                  key={text}
                  onClick={() => askQuestion(text)}
                  className="flex items-start gap-3 p-4 bg-bg-card border border-bg-border rounded-card
                             hover:border-accent-purple/40 hover:bg-bg-hover transition-all text-left group"
                >
                  <Icon size={16} className="text-accent-purpleLight mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors">
                    {text}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Message list */
          <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            {isAsking && <TypingIndicator />}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* ─── Input bar ─── */}
      <ChatInput onUploadClick={() => setShowUpload(true)} />

      {/* ─── Upload modal ─── */}
      {showUpload && <UploadZone onClose={() => setShowUpload(false)} />}
    </div>
  )
}
