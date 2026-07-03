/**
 * invite-user — Supabase Edge Function
 *
 * Sends a Supabase Auth invite email and inserts the user row into public.users.
 *
 * SETUP (run once in your terminal with the Supabase CLI):
 *   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<your service role key>
 *
 * The service role key is never exposed to the frontend — it lives only as a
 * Supabase secret injected at runtime into this function's environment.
 *
 * Deploy:
 *   supabase functions deploy invite-user
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify the caller is an authenticated national_admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    // Client scoped to the calling user — used to verify their role
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: profileRows, error: profileErr } = await callerClient.rpc('get_my_profile')
    if (profileErr || !profileRows?.length) {
      return new Response(JSON.stringify({ error: 'Could not verify caller identity' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const profile = Array.isArray(profileRows) ? profileRows[0] : profileRows
    if (profile.role !== 'national_admin') {
      return new Response(JSON.stringify({ error: 'Only national admins can invite users' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Parse request body
    const { email, full_name, role, chapter_id } = await req.json()

    if (!email || !full_name || !role) {
      return new Response(JSON.stringify({ error: 'email, full_name, and role are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const validRoles = ['volunteer', 'chapter_lead', 'national_admin']
    if (!validRoles.includes(role)) {
      return new Response(JSON.stringify({ error: `Invalid role: ${role}` }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (role !== 'national_admin' && !chapter_id) {
      return new Response(JSON.stringify({ error: 'chapter_id is required for non-admin roles' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Admin client — uses service role key, bypasses RLS
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Send invite email via Supabase Auth
    const { data: inviteData, error: inviteErr } = await adminClient.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${req.headers.get('origin') ?? 'https://pagesforchange.org'}/portal/invite`,
    })

    if (inviteErr) {
      return new Response(JSON.stringify({ error: inviteErr.message }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const authUserId = inviteData.user.id

    // Insert into public.users so get_my_profile() returns the row on first login
    const { error: insertErr } = await adminClient
      .from('users')
      .insert({
        id:         authUserId,
        email:      email.toLowerCase().trim(),
        full_name:  full_name.trim(),
        role:       role,
        chapter_id: role === 'national_admin' ? null : chapter_id,
      })

    if (insertErr) {
      // Auth invite was sent — warn but don't hard-fail
      console.error('users insert error:', insertErr.message)
      return new Response(JSON.stringify({
        success: true,
        warning: `Invite sent but failed to insert users row: ${insertErr.message}. Insert manually.`,
        user_id: authUserId,
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ success: true, user_id: authUserId }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('invite-user error:', err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
