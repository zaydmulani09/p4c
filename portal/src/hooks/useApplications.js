import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../context/AuthContext.jsx'

export function useApplications(statusFilter = 'pending') {
  const { user } = useAuth()
  const [applications, setApplications] = useState([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState(null)

  const fetchApplications = useCallback(async () => {
    setLoading(true)
    const { data, error: fetchErr } = await supabase
      .from('chapter_applications')
      .select('*')
      .eq('status', statusFilter)
      .order('submitted_at', { ascending: false })
    if (fetchErr) { setError(fetchErr.message); setLoading(false); return }
    setApplications(data ?? [])
    setLoading(false)
  }, [statusFilter])

  useEffect(() => { fetchApplications() }, [fetchApplications])

  async function approveApplication(app) {
    // Create chapter row
    const { data: chapter, error: chapterErr } = await supabase
      .from('chapters')
      .insert({
        name:   app.school_name,
        school: app.school_name,
        city:   app.city,
        state:  app.state,
        status: 'active',
      })
      .select()
      .single()
    if (chapterErr) return { error: chapterErr, inviteNote: null }

    // Create user row (auth user doesn't exist yet — stub, no auth.users row)
    // NOTE: inserting into public.users requires an auth.users row due to FK.
    // We create a placeholder users row only after invite is accepted.
    // For now just update application status and return the chapter.
    const { error: appErr } = await supabase
      .from('chapter_applications')
      .update({ status: 'approved', reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
      .eq('id', app.id)
    if (appErr) return { error: appErr, inviteNote: null }

    setApplications(prev => prev.filter(a => a.id !== app.id))

    return {
      error: null,
      inviteNote: 'Invite email requires a backend service role key — not available in the frontend. Chapter row created; send the invite manually via Supabase Auth dashboard.',
    }
  }

  async function rejectApplication(appId, reason) {
    const { error: appErr } = await supabase
      .from('chapter_applications')
      .update({ status: 'rejected', reviewed_by: user?.id, reviewed_at: new Date().toISOString(), why_interested: reason ?? undefined })
      .eq('id', appId)
    if (appErr) return { error: appErr }
    setApplications(prev => prev.filter(a => a.id !== appId))
    return { error: null }
  }

  return { applications, loading, error, approveApplication, rejectApplication, refetch: fetchApplications }
}
