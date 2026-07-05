import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../context/AuthContext.jsx'

function getWeekStart() {
  const d = new Date()
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(d)
  monday.setDate(diff)
  monday.setHours(0, 0, 0, 0)
  return monday.toISOString()
}

const ACTIVE_STATUSES = [
  'Contacted',
  'Meeting Scheduled',
  'Interested',
  'In Progress',
  'Follow-Up Needed',
]

export function useWeeklyStats() {
  const { chapterId } = useAuth()
  const [stats, setStats] = useState({
    orgs: 0,
    books: 0,
    distributions: 0,
    booksDistributed: 0,
    activeConversations: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!chapterId) { setLoading(false); return }
    const since = getWeekStart()

    Promise.all([
      supabase
        .from('organizations')
        .select('id', { count: 'exact', head: true })
        .eq('chapter_id', chapterId)
        .gte('created_at', since),
      supabase
        .from('books')
        .select('quantity')
        .eq('chapter_id', chapterId)
        .gte('created_at', since),
      supabase
        .from('distributions')
        .select('quantity')
        .eq('chapter_id', chapterId)
        .gte('created_at', since),
      supabase
        .from('organizations')
        .select('id', { count: 'exact', head: true })
        .eq('chapter_id', chapterId)
        .in('current_status', ACTIVE_STATUSES),
    ]).then(([orgsRes, booksRes, distRes, activeRes]) => {
      const distRows = distRes.data ?? []
      setStats({
        orgs:                orgsRes.count  ?? 0,
        books:               (booksRes.data ?? []).reduce((s, b) => s + (b.quantity ?? 0), 0),
        distributions:       distRows.length,
        booksDistributed:    distRows.reduce((s, d) => s + (d.quantity ?? 0), 0),
        activeConversations: activeRes.count ?? 0,
      })
      setLoading(false)
    })
  }, [chapterId])

  return { stats, loading }
}
