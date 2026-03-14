import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import Login from './Login.jsx'
import AcceptInvite from './AcceptInvite.jsx'
import { supabase, getProfile } from './lib/supabase.js'

function getUrlMode() {
  const hash = window.location.hash
  if (!hash || hash.length < 2) return 'normal'

  // Remove the leading # then parse
  const params = new URLSearchParams(hash.substring(1))
  const type   = params.get('type')
  const error  = params.get('error')

  if (error) return 'normal'
  // Supabase invite and password recovery both use access_token in hash
  if (type === 'invite' || type === 'recovery') return 'invite'
  // Fallback: any hash with access_token is an auth callback
  if (params.get('access_token')) return 'invite'
  return 'normal'
}

function Root() {
  const [screen,  setScreen]  = useState(() => getUrlMode())
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (screen === 'invite') { setLoading(false); return }

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s)
      if (s) loadProfile(s.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      if (screen === 'invite') return
      setSession(s)
      if (s) loadProfile(s.user.id)
      else { setProfile(null); setLoading(false) }
    })
    return () => subscription.unsubscribe()
  }, [screen])

  const loadProfile = async (userId) => {
    try {
      const p = await getProfile(userId)
      if (p?.role === 'admin') {
        await supabase.auth.signOut()
        alert('Admin users must use the Admin Console.')
        setLoading(false)
        return
      }
      setProfile(p)
    } catch (err) {
      console.error('Profile load error:', err)
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }

  const handleInviteComplete = async (user) => {
    try {
      const p = await getProfile(user.id)
      setProfile(p)
      const { data: { session: s } } = await supabase.auth.getSession()
      setSession(s)
      setScreen('normal')
      window.history.replaceState(null, '', window.location.pathname)
    } catch (err) { console.error(err) }
  }

  if (screen === 'invite') return <AcceptInvite onComplete={handleInviteComplete} />

  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
      fontFamily:'system-ui', color:'#64748B', fontSize:14, background:'#F7F8FA' }}>
      Loading FaciliFlow…
    </div>
  )

  if (!session || !profile) return <Login appName="Staff Portal" onLogin={() => {}} />

  return <App currentUser={profile} />
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><Root /></React.StrictMode>
)