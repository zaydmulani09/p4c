import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../context/AuthContext.jsx'

export function useChapter() {
  const { chapterId } = useAuth()
  const [chapter, setChapter] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState(null)

  useEffect(() => {
    if (!chapterId) { setLoading(false); return }
    supabase
      .from('chapters')
      .select('*')
      .eq('id', chapterId)
      .single()
      .then(({ data, error }) => {
        if (error) setError(error.message)
        else setChapter(data)
        setLoading(false)
      })
  }, [chapterId])

  return { chapter, loading, error }
}
