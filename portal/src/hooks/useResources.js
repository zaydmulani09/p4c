import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../context/AuthContext.jsx'

export function useResources() {
  const { user } = useAuth()
  const [resources, setResources] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)

  const fetchResources = useCallback(async () => {
    setLoading(true)
    const { data, error: fetchErr } = await supabase
      .from('resources')
      .select('*')
      .order('category')
      .order('created_at', { ascending: false })
    if (fetchErr) { setError(fetchErr.message); setLoading(false); return }
    setResources(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchResources() }, [fetchResources])

  async function uploadResource({ title, description, category, file }) {
    // Upload file to Storage
    const ext       = file.name.split('.').pop()
    const path      = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    const { data: storageData, error: storageErr } = await supabase.storage
      .from('resources')
      .upload(path, file, { upsert: false })
    if (storageErr) return { error: storageErr }

    const { data: { publicUrl } } = supabase.storage.from('resources').getPublicUrl(path)

    const { data, error: insertErr } = await supabase
      .from('resources')
      .insert({ title, description: description || null, category: category || null, file_url: publicUrl, uploaded_by: user?.id })
      .select()
      .single()
    if (insertErr) return { error: insertErr }

    setResources(prev => [data, ...prev])
    return { data, error: null }
  }

  async function deleteResource(id, fileUrl) {
    // Extract storage path from URL
    if (fileUrl) {
      const parts = fileUrl.split('/resources/')
      if (parts.length > 1) {
        await supabase.storage.from('resources').remove([parts[1]])
      }
    }
    const { error: deleteErr } = await supabase.from('resources').delete().eq('id', id)
    if (!deleteErr) setResources(prev => prev.filter(r => r.id !== id))
    return { error: deleteErr }
  }

  async function updateResource(id, fields) {
    const { data, error: updateErr } = await supabase
      .from('resources')
      .update(fields)
      .eq('id', id)
      .select()
      .single()
    if (!updateErr && data) setResources(prev => prev.map(r => r.id === id ? data : r))
    return { data, error: updateErr }
  }

  return { resources, loading, error, uploadResource, deleteResource, updateResource, refetch: fetchResources }
}
