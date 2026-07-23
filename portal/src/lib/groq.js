import { supabase } from './supabase.js'

const FALLBACK = 'Summary unavailable — check back later'

function getCached(key) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const { text, ts } = JSON.parse(raw)
    if (!text || text.toLowerCase().includes('unavailable')) return null
    if (Date.now() - ts < 24 * 60 * 60 * 1000) return text
  } catch {}
  return null
}

function setCached(key, text) {
  try { localStorage.setItem(key, JSON.stringify({ text, ts: Date.now() })) } catch {}
}

export async function generateImpactReport(data, period, scope) {
  const periodKey = period.replace(/[^a-zA-Z0-9]/g, '_')
  const chapterKey = data.chapterId ?? 'network'
  const key = `p4c_groq_report_${scope}_${chapterKey}_${periodKey}`
  const cached = getCached(key)
  if (cached) return cached

  try {
    const { data: resData, error } = await supabase.functions.invoke('groq-summary', {
      body: { type: 'impact_report', data, period, scope }
    })
    
    if (error || !resData?.summary) {
      console.error('[Groq] generateImpactReport:', error)
      return FALLBACK
    }
    
    const text = resData.summary
    setCached(key, text)
    return text
  } catch (e) {
    console.error('[Groq] generateImpactReport:', e)
    return FALLBACK
  }
}

export async function generateImpactCertificate(data) {
  const key = `p4c_groq_cert_${data.leadId}_${data.year}`
  const cached = getCached(key)
  if (cached) return cached

  try {
    const { data: resData, error } = await supabase.functions.invoke('groq-summary', {
      body: { type: 'certificate', data }
    })
    
    if (error || !resData?.summary) {
      console.error('[Groq] generateImpactCertificate:', error)
      return FALLBACK
    }
    
    const text = resData.summary
    setCached(key, text)
    return text
  } catch (e) {
    console.error('[Groq] generateImpactCertificate:', e)
    return FALLBACK
  }
}
