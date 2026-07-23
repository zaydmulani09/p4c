import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MODEL = 'qwen/qwen3.6-27b'

function stripThink(text: string): string {
  return text
    .replace(/<think>[\s\S]*?<\/think>/g, '')
    .replace(/<think>[\s\S]*/g, '')
    .trim()
}

// Global in-memory rate limit map (persists for the life of this Deno isolate)
const rateLimits = new Map<string, number>()
const COOLDOWN_MS = 15000 // 15 seconds

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey     = Deno.env.get('SUPABASE_ANON_KEY')!
    const groqKey     = Deno.env.get('GROQ_API_KEY')!

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: authErr } = await callerClient.auth.getUser()
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const now = Date.now()
    const lastRequest = rateLimits.get(user.id) || 0
    if (now - lastRequest < COOLDOWN_MS) {
      console.warn(`[groq-summary] Rate limit triggered for user ${user.id}`)
      return new Response(JSON.stringify({ error: 'Too many requests. Please wait 15 seconds.' }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    rateLimits.set(user.id, now)

    const body = await req.json()
    const { type, stats, data, period, scope } = body
    if (!type) {
      return new Response(JSON.stringify({ error: 'type is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log(`[groq-summary] Processing '${type}' request for user ${user.id}`)

    let systemContent = ''
    let userContent = ''
    let maxTokens = 2048

    if (type === 'national' || type === 'chapter') {
      if (!stats) {
        return new Response(JSON.stringify({ error: 'stats is required for summary' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const isNational   = type === 'national'
      const isEarlyStage = isNational
        ? !stats.totalBooksDistributed && !stats.totalOrgsContacted
        : !stats.orgs && !stats.books && !stats.distributions

      systemContent = isNational
        ? 'You are the communications director for Pages for Change, a student-led national literacy nonprofit. Write a concise, professional weekly network summary for the national leadership team. Tone: warm, mission-driven, and encouraging. Format: 3-4 sentences of flowing prose, no bullet points, no headers. Be specific with the numbers provided. Sound like a real nonprofit update, not a generic AI summary.'
        : 'You are the communications director for Pages for Change, a student-led national literacy nonprofit. Write a concise, professional weekly summary for a chapter lead. Tone: warm, mission-driven, and encouraging. Format: 3-4 sentences of flowing prose, no bullet points, no headers. Be specific with the numbers provided. Sound like a real nonprofit update, not a generic AI summary.'

      userContent = isEarlyStage
        ? (isNational
            ? 'Pages for Change is a new student-led literacy nonprofit just getting started. Write an encouraging message about the exciting opportunity ahead to build a book distribution network and make a lasting impact in communities.'
            : 'This chapter is just getting started with Pages for Change. Write an encouraging message about the exciting opportunity ahead to connect with organizations, collect books, and make a difference in the community.')
        : (isNational
            ? `Network stats: ${stats.totalChapters} active chapters, ${stats.totalBooksDistributed} books in inventory, ${stats.totalOrgsContacted} organizations contacted network-wide, ${stats.totalPartnerships} established partnerships.`
            : `This week: ${stats.orgs} new organizations logged, ${stats.books} books received, ${stats.distributions} distributions made, ${stats.activeConversations} active conversations ongoing.`)
      maxTokens = 1024
    } else if (type === 'impact_report') {
      if (!data || !period || !scope) {
        return new Response(JSON.stringify({ error: 'data, period, and scope are required for impact_report' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const isNational = scope === 'national'
      systemContent = `You are writing a formal impact report body for Pages for Change, a student-led literacy nonprofit. Do NOT include the report header — it is added separately. Write exactly 4 sections using ALL CAPS headers followed by a blank line, then a paragraph. Use this format:\n\nOUTREACH SUMMARY\n[2–3 sentence paragraph with specific numbers]\n\nPARTNERSHIP HIGHLIGHTS\n[2–3 sentence paragraph]\n\nBOOK DISTRIBUTION\n[2–3 sentence paragraph]\n\nLOOKING AHEAD\n[1 forward-looking sentence]\n\nBe specific with every number provided. Professional, grant-ready tone.`
      userContent = isNational
        ? `Period: ${period}. Network data: ${data.totalChapters} active chapters, ${data.totalOrgs} organizations contacted network-wide, status breakdown: ${data.statusBreakdown}, ${data.totalBooksDistributed} total books distributed across ${data.totalDistributions} distributions, ${data.totalPartnerships} partnerships established, top performing chapter: ${data.topChapter} (${data.topChapterBooks} books distributed), geographic spread: ${data.states}.`
        : `Period: ${period}. Chapter: ${data.chapterName}. Data: ${data.totalOrgs} organizations contacted, status breakdown: ${data.statusBreakdown}, ${data.booksReceived} books received, ${data.booksDistributed} books distributed across ${data.totalDistributions} distributions to organizations including: ${data.distributionOrgs}, ${data.partnerships} partnerships established, top volunteer: ${data.topVolunteer}.`
      maxTokens = 600
    } else if (type === 'certificate') {
      if (!data) {
        return new Response(JSON.stringify({ error: 'data is required for certificate' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      systemContent = `You are generating a formal leadership certificate body for Pages for Change. Return ONLY the body text — the heading "CHAPTER LEADERSHIP CERTIFICATE" is added separately. Start with "This certifies that [NAME] served as Chapter Lead..." then a brief sentence, then a bullet list of 4 accomplishments using the exact numbers provided. Finish with a blank line before the signature area. Use this structure:\n\nThis certifies that [FULL NAME] served as Chapter Lead of the [CHAPTER] Chapter of Pages for Change during [YEAR].\n\nUnder their leadership, the chapter:\n• Contacted [N] organizations\n• Established [N] partnerships\n• Distributed [N] books to [N] partner organizations\n• Contributed to a network of [N] chapters across [N] states`
      userContent = `Lead: ${data.leadName}. Chapter: ${data.chapterName}. Year: ${data.year}. Stats: orgsContacted=${data.orgsContacted}, partnerships=${data.partnerships}, booksDistributed=${data.booksDistributed}, partnerOrgs=${data.partnerOrgs}, networkChapters=${data.networkChapters}, networkStates=${data.networkStates}.`
      maxTokens = 400
    } else {
      return new Response(JSON.stringify({ error: 'Invalid type' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${groqKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: systemContent },
          { role: 'user', content: userContent },
        ],
        max_tokens: maxTokens,
      }),
    })

    if (!groqRes.ok) {
      console.error(`[groq-summary] Groq API error - Status: ${groqRes.status}`)
      return new Response(JSON.stringify({ error: 'Groq API error' }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const groqData = await groqRes.json()
    console.log(`[groq-summary] Successfully generated response for user ${user.id}`)

    let summary = groqData.choices?.[0]?.message?.content ?? ''
    summary = stripThink(summary)

    return new Response(JSON.stringify({ summary }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('[groq-summary] Internal server error:', err instanceof Error ? err.message : 'Unknown error')
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
