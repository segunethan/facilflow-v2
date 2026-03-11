import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import Login from './Login.jsx'
import { supabase, getProfile } from './lib/supabase.js'

function Root() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) loadProfile(session.user.id)
      else setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) loadProfile(session.user.id)
      else { setProfile(null); setLoading(false) }
    })
    return () => subscription.unsubscribe()
  }, [])

  const loadProfile = async (userId) => {
    try {
      const p = await getProfile(userId)
      if (p.role !== 'admin') {
        await supabase.auth.signOut()
        alert('Only admin users can access the Admin Console.')
        setLoading(false)
        return
      }
      setProfile(p)
    } catch (err) {
      console.error('Profile load error:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
      fontFamily:'system-ui', color:'#64748B', fontSize:14 }}>Loading…</div>
  )

  if (!session || !profile) return <Login appName="Admin Console" onLogin={() => {}} />

  return <App currentUser={profile} />
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><Root /></React.StrictMode>
)
