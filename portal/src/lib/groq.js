const GROQ_API = 'https://api.groq.com/openai/v1/chat/completions'
const MODEL    = 'llama3-70b-8192'
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

async function callGroq(messages, maxTokens = 400) {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY
  if (!apiKey) return FALLBACK
  console.log('[Groq] model:', MODEL)
  const res = await fetch(GROQ_API, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, messages, max_tokens: maxTokens }),
  })
  const data = await res.json()
  if (!res.ok) {
    console.error('[Groq] error response:', res.status, data)
    return FALLBACK
  }
  return data.choices?.[0]?.message?.content ?? FALLBACK
}

export async function generateWeeklySummary(stats, scope) {
  const weekNum = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000))
  const key = `p4c_groq_weekly_${scope}_w${weekNum}`
  const cached = getCached(key)
  if (cached) return cached

  const isZeroData = scope === 'national'
    ? !stats.totalBooksDistributed && !stats.totalOrgsContacted
    : !stats.orgs && !stats.books && !stats.distributions

  const content = isZeroData
    ? `Pages for Change is a new student-led literacy nonprofit just getting started. Write a brief, encouraging message (under 4 sentences, no bullet points) for the ${scope === 'national' ? 'national leadership team' : 'chapter lead'} about the exciting opportunity ahead to build a book distribution network and make a lasting impact in their community.`
    : scope === 'national'
      ? `Network stats: ${stats.totalChapters} active chapters, ${stats.totalBooksDistributed} books in inventory, ${stats.totalOrgsContacted} organizations contacted, ${stats.totalPartnerships} established partnerships.`
      : `This week: ${stats.orgs} new organizations logged, ${stats.books} books received, ${stats.distributions} distributions made, ${stats.activeConversations} active conversations ongoing.`

  try {
    const text = await callGroq([
      {
        role: 'system',
        content: 'You are a helpful assistant for Pages for Change, a student-led literacy nonprofit. Write a brief, encouraging weekly summary. Be specific with numbers. Under 4 sentences. No bullet points.',
      },
      { role: 'user', content },
    ], 200)
    setCached(key, text)
    return text
  } catch (e) {
    console.error('[Groq] generateWeeklySummary:', e)
    return FALLBACK
  }
}

export async function generateImpactReport(data, period, scope) {
  const periodKey = period.replace(/[^a-zA-Z0-9]/g, '_')
  const chapterKey = data.chapterId ?? 'network'
  const key = `p4c_groq_report_${scope}_${chapterKey}_${periodKey}`
  const cached = getCached(key)
  if (cached) return cached

  const isNational = scope === 'national'

  const systemMsg = `You are writing a formal impact report body for Pages for Change, a student-led literacy nonprofit. Do NOT include the report header — it is added separately. Write exactly 4 sections using ALL CAPS headers followed by a blank line, then a paragraph. Use this format:

OUTREACH SUMMARY
[2–3 sentence paragraph with specific numbers]

PARTNERSHIP HIGHLIGHTS
[2–3 sentence paragraph]

BOOK DISTRIBUTION
[2–3 sentence paragraph]

LOOKING AHEAD
[1 forward-looking sentence]

Be specific with every number provided. Professional, grant-ready tone.`

  const userMsg = isNational
    ? `Period: ${period}. Network data: ${data.totalChapters} active chapters, ${data.totalOrgs} organizations contacted network-wide, status breakdown: ${data.statusBreakdown}, ${data.totalBooksDistributed} total books distributed across ${data.totalDistributions} distributions, ${data.totalPartnerships} partnerships established, top performing chapter: ${data.topChapter} (${data.topChapterBooks} books distributed), geographic spread: ${data.states}.`
    : `Period: ${period}. Chapter: ${data.chapterName}. Data: ${data.totalOrgs} organizations contacted, status breakdown: ${data.statusBreakdown}, ${data.booksReceived} books received, ${data.booksDistributed} books distributed across ${data.totalDistributions} distributions to organizations including: ${data.distributionOrgs}, ${data.partnerships} partnerships established, top volunteer: ${data.topVolunteer}.`

  try {
    const text = await callGroq([
      { role: 'system', content: systemMsg },
      { role: 'user', content: userMsg },
    ], 600)
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

  const systemMsg = `You are generating a formal leadership certificate body for Pages for Change. Return ONLY the body text — the heading "CHAPTER LEADERSHIP CERTIFICATE" is added separately. Start with "This certifies that [NAME] served as Chapter Lead..." then a brief sentence, then a bullet list of 4 accomplishments using the exact numbers provided. Finish with a blank line before the signature area. Use this structure:

This certifies that [FULL NAME] served as Chapter Lead of the [CHAPTER] Chapter of Pages for Change during [YEAR].

Under their leadership, the chapter:
• Contacted [N] organizations
• Established [N] partnerships
• Distributed [N] books to [N] partner organizations
• Contributed to a network of [N] chapters across [N] states`

  const userMsg = `Lead: ${data.leadName}. Chapter: ${data.chapterName}. Year: ${data.year}. Stats: orgsContacted=${data.orgsContacted}, partnerships=${data.partnerships}, booksDistributed=${data.booksDistributed}, partnerOrgs=${data.partnerOrgs}, networkChapters=${data.networkChapters}, networkStates=${data.networkStates}.`

  try {
    const text = await callGroq([
      { role: 'system', content: systemMsg },
      { role: 'user', content: userMsg },
    ], 400)
    setCached(key, text)
    return text
  } catch (e) {
    console.error('[Groq] generateImpactCertificate:', e)
    return FALLBACK
  }
}
