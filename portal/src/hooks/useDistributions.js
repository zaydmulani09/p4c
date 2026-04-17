import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../context/AuthContext.jsx'

export function useDistributions() {
  const { chapterId } = useAuth()
  const [distributions, setDistributions] = useState([])
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState(null)

  const fetch = useCallback(async () => {
    if (!chapterId) { setLoading(false); return }
    setLoading(true)

    const { data, error: fetchErr } = await supabase
      .from('distributions')
      .select('*, organizations(org_name)')
      .eq('chapter_id', chapterId)
      .order('distribution_date', { ascending: false })

    if (fetchErr) { setError(fetchErr.message); setLoading(false); return }
    setDistributions(data ?? [])
    setLoading(false)
  }, [chapterId])

  useEffect(() => { fetch() }, [fetch])

  return { distributions, loading, error, refetch: fetch }
}
