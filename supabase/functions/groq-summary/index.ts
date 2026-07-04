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

    const { type, stats } = await req.json()
    if (!type || !stats) {
      return new Response(JSON.stringify({ error: 'type and stats are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const isNational   = type === 'national'
    const isEarlyStage = isNational
      ? !stats.totalBooksDistributed && !stats.totalOrgsContacted
      : !stats.orgs && !stats.books && !stats.distributions

    const systemContent = isNational
      ? 'You are the communications director for Pages for Change, a student-led national literacy nonprofit. Write a concise, professional weekly network summary for the national leadership team. Tone: warm, mission-driven, and encouraging. Format: 3-4 sentences of flowing prose, no bullet points, no headers. Be specific with the numbers provided. Sound like a real nonprofit update, not a generic AI summary.'
      : 'You are the communications director for Pages for Change, a student-led national literacy nonprofit. Write a concise, professional weekly summary for a chapter lead. Tone: warm, mission-driven, and encouraging. Format: 3-4 sentences of flowing prose, no bullet points, no headers. Be specific with the numbers provided. Sound like a real nonprofit update, not a generic AI summary.'

    const userContent = isEarlyStage
      ? (isNational
          ? 'Pages for Change is a new student-led literacy nonprofit just getting started. Write an encouraging message about the exciting opportunity ahead to build a book distribution network and make a lasting impact in communities.'
          : 'This chapter is just getting started with Pages for Change. Write an encouraging message about the exciting opportunity ahead to connect with organizations, collect books, and make a difference in the community.')
      : (isNational
          ? `Network stats: ${stats.totalChapters} active chapters, ${stats.totalBooksDistributed} books in inventory, ${stats.totalOrgsContacted} organizations contacted network-wide, ${stats.totalPartnerships} established partnerships.`
          : `This week: ${stats.orgs} new organizations logged, ${stats.books} books received, ${stats.distributions} distributions made, ${stats.activeConversations} active conversations ongoing.`)

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
        max_tokens: 1024,
      }),
    })

    if (!groqRes.ok) {
      const errData = await groqRes.json().catch(() => ({}))
      console.error('[groq-summary] groq error:', groqRes.status, errData)
      return new Response(JSON.stringify({ error: 'Groq API error' }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const groqData = await groqRes.json()
    let summary = groqData.choices?.[0]?.message?.content ?? ''
    summary = stripThink(summary)

    return new Response(JSON.stringify({ summary }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('[groq-summary] error:', err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
