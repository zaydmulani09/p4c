import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'

export function useNetworkStats() {
  const [stats,       setStats]       = useState(null)
  const [leaderboard, setLeaderboard] = useState([])
  const [healthFeed,  setHealthFeed]  = useState([])
  const [activity,    setActivity]    = useState([])
  const [loading,     setLoading]     = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)

      // 1. Public stats RPC
      const { data: rpcData } = await supabase.rpc('get_public_stats')

      // 2. Total orgs contacted (all chapters)
      const { count: orgsCount } = await supabase
        .from('organizations')
        .select('*', { count: 'exact', head: true })

      // 3. All active chapters with their lead user name
      const { data: chapters } = await supabase
        .from('chapters')
        .select('id, name, school, city, state, status, founded_date, lead_user_id, created_at')
        .order('name')

      // 4. Distributions per chapter (total qty)
      const { data: dists } = await supabase
        .from('distributions')
        .select('chapter_id, quantity')

      // 5. Partnership count per chapter
      const { data: partnerships } = await supabase
        .from('organizations')
        .select('chapter_id')
        .eq('current_status', 'Partnership Established')

      // 6. Lead user names
      const leadIds = [...new Set((chapters ?? []).map(c => c.lead_user_id).filter(Boolean))]
      let leadMap = {}
      if (leadIds.length > 0) {
        const { data: users } = await supabase
          .from('users')
          .select('id, full_name')
          .in('id', leadIds)
        users?.forEach(u => { leadMap[u.id] = u.full_name })
      }

      // 7. Last activity per chapter (max created_at from orgs + books)
      const { data: orgActivity } = await supabase
        .from('organizations')
        .select('chapter_id, created_at')
        .order('created_at', { ascending: false })

      const { data: bookActivity } = await supabase
        .from('books')
        .select('chapter_id, created_at')
        .order('created_at', { ascending: false })

      // 8. Recent activity (last 10 across orgs + books)
      const recentOrgs  = (orgActivity  ?? []).slice(0, 10).map(r => ({ ...r, type: 'org' }))
      const recentBooks = (bookActivity ?? []).slice(0, 10).map(r => ({ ...r, type: 'book' }))
      const combined    = [...recentOrgs, ...recentBooks]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 10)

      // Build leaderboard
      const distByChapter = {}
      ;(dists ?? []).forEach(d => {
        distByChapter[d.chapter_id] = (distByChapter[d.chapter_id] ?? 0) + (d.quantity ?? 0)
      })
      const partnersByChapter = {}
      ;(partnerships ?? []).forEach(p => {
        partnersByChapter[p.chapter_id] = (partnersByChapter[p.chapter_id] ?? 0) + 1
      })

      // Last activity per chapter
      const lastActivityByChapter = {}
      ;[...(orgActivity ?? []), ...(bookActivity ?? [])].forEach(r => {
        const existing = lastActivityByChapter[r.chapter_id]
        if (!existing || new Date(r.created_at) > new Date(existing)) {
          lastActivityByChapter[r.chapter_id] = r.created_at
        }
      })

      const board = (chapters ?? [])
        .filter(c => c.status === 'active')
        .map(c => ({
          ...c,
          leadName:     leadMap[c.lead_user_id] ?? '—',
          booksDistributed: distByChapter[c.id] ?? 0,
          partnerships: partnersByChapter[c.id] ?? 0,
          lastActivity: lastActivityByChapter[c.id] ?? null,
        }))
        .sort((a, b) => b.booksDistributed - a.booksDistributed)

      const health = board.map(c => {
        const daysSince = c.lastActivity
          ? Math.floor((Date.now() - new Date(c.lastActivity).getTime()) / 86400000)
          : null
        let indicator = 'red'
        if (daysSince == null)   indicator = 'red'
        else if (daysSince <= 7) indicator = 'green'
        else if (daysSince <= 14) indicator = 'amber'
        return { ...c, daysSince, indicator }
      })

      setStats({
        totalChapters:       rpcData?.total_chapters ?? 0,
        totalBooksDistributed: rpcData?.total_books ?? 0,
        totalOrgsContacted:  orgsCount ?? 0,
        totalPartnerships:   rpcData?.total_partners ?? 0,
      })
      setLeaderboard(board)
      setHealthFeed(health)
      setActivity(combined)
      setLoading(false)
    }

    load()
  }, [])

  return { stats, leaderboard, healthFeed, activity, loading }
}
