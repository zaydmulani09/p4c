export default async function handler(req, res) {
  const url = `${process.env.VITE_SUPABASE_URL}/rest/v1/chapters?select=id&limit=1`

  try {
    const response = await fetch(url, {
      headers: {
        'apikey': process.env.VITE_SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${process.env.VITE_SUPABASE_ANON_KEY}`
      }
    })

    const text = await response.text()
    console.log('Supabase response status:', response.status)
    console.log('Supabase response body:', text)

    if (!response.ok) {
      return res.status(500).json({ error: text })
    }

    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('Keep-alive error:', err.message)
    return res.status(500).json({ error: err.message })
  }
}
