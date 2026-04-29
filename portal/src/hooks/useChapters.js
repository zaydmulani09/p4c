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

    let q = supabase
      .from('chapters')
      .select('*')
      .order('name')

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

    // Enrich with aggregate stats
    const ids = results.map(c => c.id)

    const [leadUsers, dists, partnerships, orgCounts, bookCounts, distCounts, orgActivity, bookActivity] = await Promise.all([
      // lead user names
      ids.length ? supabase.from('users').select('id, full_name').in('id', results.map(c => c.lead_user_id).filter(Boolean)) : { data: [] },
      // books distributed per chapter
      ids.length ? supabase.from('distributions').select('chapter_id, quantity').in('chapter_id', ids) : { data: [] },
      // partnerships per chapter
      ids.length ? supabase.from('organizations').select('chapter_id').eq('current_status', 'Partnership Established').in('chapter_id', ids) : { data: [] },
      // org count per chapter
      ids.length ? supabase.from('organizations').select('chapter_id').in('chapter_id', ids) : { data: [] },
      // book rows per chapter (summing quantity)
      ids.length ? supabase.from('books').select('chapter_id, quantity').in('chapter_id', ids) : { data: [] },
      // distribution rows per chapter
      ids.length ? supabase.from('distributions').select('chapter_id').in('chapter_id', ids) : { data: [] },
      // last org activity per chapter
      ids.length ? supabase.from('organizations').select('chapter_id, created_at').in('chapter_id', ids).order('created_at', { ascending: false }) : { data: [] },
      // last book activity per chapter
      ids.length ? supabase.from('books').select('chapter_id, created_at').in('chapter_id', ids).order('created_at', { ascending: false }) : { data: [] },
    ])

    const leadMap = {}
    leadUsers.data?.forEach(u => { leadMap[u.id] = u.full_name })

    const distMap = {}
    dists.data?.forEach(d => { distMap[d.chapter_id] = (distMap[d.chapter_id] ?? 0) + (d.quantity ?? 0) })

    const partnerMap = {}
    partnerships.data?.forEach(p => { partnerMap[p.chapter_id] = (partnerMap[p.chapter_id] ?? 0) + 1 })

    const orgMap = {}
    orgCounts.data?.forEach(o => { orgMap[o.chapter_id] = (orgMap[o.chapter_id] ?? 0) + 1 })

    const bookMap = {}
    bookCounts.data?.forEach(b => { bookMap[b.chapter_id] = (bookMap[b.chapter_id] ?? 0) + (b.quantity ?? 0) })

    const distCountMap = {}
    distCounts.data?.forEach(d => { distCountMap[d.chapter_id] = (distCountMap[d.chapter_id] ?? 0) + 1 })

    const lastActMap = {}
    ;[...(orgActivity.data ?? []), ...(bookActivity.data ?? [])].forEach(r => {
      const existing = lastActMap[r.chapter_id]
      if (!existing || new Date(r.created_at) > new Date(existing)) lastActMap[r.chapter_id] = r.created_at
    })

    const enriched = results.map(c => ({
      ...c,
      leadName:         leadMap[c.lead_user_id] ?? '—',
      booksDistributed: distMap[c.id] ?? 0,
      partnerships:     partnerMap[c.id] ?? 0,
      orgCount:         orgMap[c.id] ?? 0,
      bookCount:        bookMap[c.id] ?? 0,
      distCount:        distCountMap[c.id] ?? 0,
      lastActivity:     lastActMap[c.id] ?? null,
    }))

    setChapters(enriched)
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
