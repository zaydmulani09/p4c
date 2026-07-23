import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'

export function useChapters(filters = {}) {
  const [chapters, setChapters] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)

  const filtersKey = JSON.stringify(filters)

  const fetchChapters = useCallback(async () => {
    setLoading(true)
    const { search = '', statusFilter = '' } = filters

    let q = supabase.rpc('get_chapter_stats').order('name')

    if (statusFilter) q = q.eq('status', statusFilter)

    const { data, error: fetchErr } = await q
    if (fetchErr) { setError(fetchErr.message); setLoading(false); return }

    let results = data ?? []

    // Client-side search
    if (search) {
      const s = search.toLowerCase()
      results = results.filter(c =>
        c.name.toLowerCase().includes(s) || c.school.toLowerCase().includes(s)
      )
    }

    setChapters(results)
    setLoading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey])

  useEffect(() => { fetchChapters() }, [fetchChapters])

  async function suspendChapter(id) {
    const { error } = await supabase.from('chapters').update({ status: 'suspended' }).eq('id', id)
    if (!error) setChapters(prev => prev.map(c => c.id === id ? { ...c, status: 'suspended' } : c))
    return { error }
  }

  async function reactivateChapter(id) {
    const { error } = await supabase.from('chapters').update({ status: 'active' }).eq('id', id)
    if (!error) setChapters(prev => prev.map(c => c.id === id ? { ...c, status: 'active' } : c))
    return { error }
  }

  return { chapters, loading, error, suspendChapter, reactivateChapter, refetch: fetchChapters }
}
