import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

export default async function handler(req, res) {
  const { error } = await supabase.from('chapters').select('id').limit(1)
  if (error) return res.status(500).json({ error: error.message })
  return res.status(200).json({ ok: true, timestamp: new Date().toISOString() })
}
