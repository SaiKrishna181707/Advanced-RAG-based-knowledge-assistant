/**
 * Dashboard showing system stats and retrieval performance.
 */

import { useEffect, useState } from 'react'
import { FileText, Hash, MessageSquare, Clock, Layers, Zap, Loader2 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { analyticsAPI } from '../api/client'
import Topbar from '../components/layout/Topbar'

function StatCard({ icon: Icon, label, value, sub, color = 'text-accent-purpleLight' }) {
  return (
    <div className="bg-bg-card border border-bg-border rounded-card p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 rounded-lg bg-accent-purpleDim flex items-center justify-center">
          <Icon size={17} className={color} />
        </div>
      </div>
      <p className="text-2xl font-semibold text-text-primary">{value ?? '—'}</p>
      <p className="text-xs text-text-muted mt-1">{label}</p>
      {sub && <p className="text-xs text-text-secondary mt-0.5">{sub}</p>}
    </div>
  )
}

const CHART_COLORS = ['#7c3aed', '#a78bfa', '#6d28d9', '#8b5cf6', '#4c1d95']

export default function AnalyticsPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    analyticsAPI.get()
      .then(r => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="flex flex-col h-full">
      <Topbar title="Analytics" />
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex justify-center py-24">
            <Loader2 size={28} className="text-accent-purple animate-spin" />
          </div>
        ) : !data ? (
          <p className="text-text-muted text-sm text-center py-24">Failed to load analytics</p>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
              <StatCard icon={FileText} label="Total Documents" value={data.total_documents} />
              <StatCard icon={Hash} label="Total Chunks" value={data.total_chunks} />
              <StatCard icon={Layers} label="Embeddings in Index" value={data.total_embeddings} />
              <StatCard icon={MessageSquare} label="Conversations" value={data.total_conversations} />
              <StatCard icon={Zap} label="Avg Retrieval" value={data.avg_retrieval_time_ms + 'ms'} sub="Hybrid RRF search" color="text-green-400" />
              <StatCard icon={Clock} label="Avg LLM Response" value={data.avg_llm_time_ms + 'ms'} sub="Groq generation time" color="text-yellow-400" />
              <StatCard icon={MessageSquare} label="Total Messages" value={data.total_messages} />
            </div>

            {data.documents_by_collection?.length > 0 && (
              <div className="bg-bg-card border border-bg-border rounded-card p-6 mb-6">
                <h3 className="text-sm font-medium text-text-primary mb-5">Documents by Collection</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.documents_by_collection} margin={{ left: -20 }}>
                    <XAxis dataKey="collection" tick={{ fontSize: 12, fill: '#a0a0b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: '#a0a0b8' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: '#16161f', border: '1px solid #2a2a3a', borderRadius: '10px', fontSize: '12px', color: '#f8f8ff' }} />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {data.documents_by_collection.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            <div className="bg-bg-card border border-bg-border rounded-card p-5">
              <h3 className="text-sm font-medium text-text-primary mb-3">Pipeline Info</h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                {[
                  ['Embedding model', 'Local feature hashing (512d)'],
                  ['Vector store', 'FAISS IndexFlatIP'],
                  ['Search strategy', 'Hybrid — Dense + BM25 (RRF)'],
                  ['LLM', 'Llama-3.3-70b via Groq'],
                  ['Chunk size', '500 chars / 50 overlap'],
                  ['Top-K retrieved', '5 chunks per query'],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3 bg-bg-hover rounded-lg px-3 py-2">
                    <span className="text-text-muted">{k}</span>
                    <span className="text-text-primary font-medium text-right">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
