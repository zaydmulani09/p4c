import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user,      setUser]      = useState(null)
  const [role,      setRole]      = useState(null)
  const [chapterId, setChapterId] = useState(null)
  const [loading,   setLoading]   = useState(true)

  async function fetchProfile() {
    try {
      const { data, error } = await supabase.rpc('get_my_profile')
      if (error) throw error
      const profile = Array.isArray(data) ? data[0] : data
      if (profile) {
        setRole(profile.role)
        setChapterId(profile.chapter_id ?? null)
      } else {
        setRole(null)
        setChapterId(null)
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err)
      setRole('error') // Use 'error' to break out of spinner loops
      setChapterId(null)
    }
  }

  useEffect(() => {
    // onAuthStateChange fires INITIAL_SESSION on mount — covers page refresh restore
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user)
          await fetchProfile()
        } else {
          setUser(null)
          setRole(null)
          setChapterId(null)
        }
        setLoading(false)
      }
    )
    return () => subscription.unsubscribe()
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
    // state reset handled by onAuthStateChange above
  }

  return (
    <AuthContext.Provider value={{ user, role, chapterId, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
