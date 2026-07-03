import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../context/AuthContext.jsx'

export const PAGE_SIZE = 50

export function useOrganizations(filters = {}, page = 0) {
  const { chapterId, user } = useAuth()
  const [orgs,      setOrgs]      = useState([])
  const [count,     setCount]     = useState(0)
  const [memberMap, setMemberMap] = useState({})
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)

  const filtersKey = JSON.stringify(filters)

  const fetchOrgs = useCallback(async () => {
    if (!chapterId) { setLoading(false); return }
    setLoading(true)

    const {
      search   = '',
      status   = [],
      orgType  = '',
      dateFrom = '',
      dateTo   = '',
      sortCol  = 'row_number',
      sortDir  = 'asc',
    } = filters

    let q = supabase
      .from('organizations')
      .select('*', { count: 'exact' })
      .eq('chapter_id', chapterId)
      .order(sortCol, { ascending: sortDir === 'asc' })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

    if (search) {
      q = q.or(
        `org_name.ilike.%${search}%,contact_name.ilike.%${search}%,email.ilike.%${search}%`
      )
    }
    if (status.length > 0) q = q.in('current_status', status)
    if (orgType)           q = q.eq('org_type', orgType)
    if (dateFrom)          q = q.gte('date_first_contacted', dateFrom)
    if (dateTo)            q = q.lte('date_first_contacted', dateTo)

    const { data, count: total, error: fetchErr } = await q

    if (fetchErr) {
      setError(fetchErr.message)
      setLoading(false)
      return
    }

    setOrgs(data ?? [])
    setCount(total ?? 0)

    // Resolve logged_by UUIDs → full names via public.users
    const ids = [...new Set((data ?? []).map(o => o.logged_by).filter(Boolean))]
    if (ids.length > 0) {
      const { data: members } = await supabase
        .from('users')
        .select('id, full_name')
        .in('id', ids)
      const map = {}
      members?.forEach(m => { map[m.id] = m.full_name })
      setMemberMap(map)
    }

    setLoading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterId, page, filtersKey])

  useEffect(() => { fetchOrgs() }, [fetchOrgs])

  async function addOrg(fields) {
    const { data, error: insertErr } = await supabase
      .from('organizations')
      .insert({ ...fields, chapter_id: chapterId, logged_by: user?.id })
      .select()
      .single()
    if (!insertErr && data) {
      setOrgs(prev => [data, ...prev])
      setCount(prev => prev + 1)
    }
    return { data, error: insertErr }
  }

  async function updateOrg(id, fields) {
    const { data, error: updateErr } = await supabase
      .from('organizations')
      .update(fields)
      .eq('id', id)
      .select()
      .single()
    if (!updateErr && data) {
      setOrgs(prev => prev.map(o => (o.id === id ? data : o)))
    }
    return { data, error: updateErr }
  }

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE))

  return { orgs, count, totalPages, loading, error, memberMap, addOrg, updateOrg, refetch: fetchOrgs }
}
