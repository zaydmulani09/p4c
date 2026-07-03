import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../context/AuthContext.jsx'

export const BOOKS_PAGE_SIZE = 50

export function useBooks(filters = {}, page = 0) {
  const { chapterId, user } = useAuth()
  const [books,      setBooks]      = useState([])
  const [count,      setCount]      = useState(0)
  const [memberMap,  setMemberMap]  = useState({})
  const [totals,     setTotals]     = useState({ total: 0, byGenre: {} })
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)

  const filtersKey = JSON.stringify(filters)

  const fetchBooks = useCallback(async () => {
    if (!chapterId) { setLoading(false); return }
    setLoading(true)

    const {
      search    = '',
      genre     = '',
      ageRange  = '',
      condition = '',
      sortCol   = 'row_number',
      sortDir   = 'asc',
    } = filters

    let q = supabase
      .from('books')
      .select('*', { count: 'exact' })
      .eq('chapter_id', chapterId)
      .order(sortCol, { ascending: sortDir === 'asc' })
      .range(page * BOOKS_PAGE_SIZE, (page + 1) * BOOKS_PAGE_SIZE - 1)

    if (search)    q = q.or(`title.ilike.%${search}%,author.ilike.%${search}%`)
    if (genre)     q = q.eq('genre', genre)
    if (ageRange)  q = q.eq('age_range', ageRange)
    if (condition) q = q.eq('condition', condition)

    const { data, count: total, error: fetchErr } = await q

    if (fetchErr) {
      setError(fetchErr.message)
      setLoading(false)
      return
    }

    setBooks(data ?? [])
    setCount(total ?? 0)

    // Resolve logged_by UUIDs → names
    const ids = [...new Set((data ?? []).map(b => b.logged_by).filter(Boolean))]
    if (ids.length > 0) {
      const { data: members } = await supabase
        .from('users')
        .select('id, full_name')
        .in('id', ids)
      const map = {}
      members?.forEach(m => { map[m.id] = m.full_name })
      setMemberMap(map)
    }

    // Fetch totals (unfiltered, all books for chapter)
    const { data: allBooks } = await supabase
      .from('books')
      .select('genre, quantity')
      .eq('chapter_id', chapterId)

    if (allBooks) {
      const grandTotal = allBooks.reduce((s, b) => s + (b.quantity ?? 0), 0)
      const byGenre = {}
      allBooks.forEach(b => {
        if (b.genre) byGenre[b.genre] = (byGenre[b.genre] ?? 0) + (b.quantity ?? 0)
      })
      setTotals({ total: grandTotal, byGenre })
    }

    setLoading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterId, page, filtersKey])

  useEffect(() => { fetchBooks() }, [fetchBooks])

  async function addBook(fields) {
    const { data, error: insertErr } = await supabase
      .from('books')
      .insert({ ...fields, chapter_id: chapterId, logged_by: user?.id })
      .select()
      .single()
    if (!insertErr && data) {
      setBooks(prev => [data, ...prev])
      setCount(prev => prev + 1)
    }
    return { data, error: insertErr }
  }

  async function updateBook(id, fields) {
    const { data, error: updateErr } = await supabase
      .from('books')
      .update(fields)
      .eq('id', id)
      .select()
      .single()
    if (!updateErr && data) {
      setBooks(prev => prev.map(b => (b.id === id ? data : b)))
    }
    return { data, error: updateErr }
  }

  async function logDistribution(orgId, bookItems, date, notes) {
    // bookItems: [{ bookId, quantity }]
    const errors = []

    for (const item of bookItems) {
      // Check stock
      const { data: book } = await supabase
        .from('books')
        .select('quantity')
        .eq('id', item.bookId)
        .single()

      if (!book || book.quantity < item.quantity) {
        errors.push(`Not enough stock for book ${item.bookId}`)
        continue
      }

      // Insert distribution row
      const { error: distErr } = await supabase
        .from('distributions')
        .insert({
          chapter_id: chapterId,
          org_id: orgId,
          quantity: item.quantity,
          distribution_date: date,
          logged_by: user?.id,
          notes,
        })
      if (distErr) { errors.push(distErr.message); continue }

      // Decrement quantity
      const { error: updErr } = await supabase
        .from('books')
        .update({ quantity: book.quantity - item.quantity })
        .eq('id', item.bookId)
      if (updErr) errors.push(updErr.message)
    }

    if (errors.length === 0) await fetchBooks()
    return { errors }
  }

  const totalPages = Math.max(1, Math.ceil(count / BOOKS_PAGE_SIZE))

  return { books, count, totalPages, loading, error, memberMap, totals, addBook, updateBook, logDistribution, refetch: fetchBooks }
}
