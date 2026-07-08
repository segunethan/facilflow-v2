import React, { useState, useEffect, useRef, useCallback } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import Login from './Login.jsx'
import AcceptInvite from './AcceptInvite.jsx'
import { supabase, getProfile } from './lib/supabase.js'

// ── SESSION TIMEOUT ────────────────────────────────────────────
const IDLE_MS = 5 * 60 * 1000   // 5 minutes of inactivity
const WARN_S  = 20               // 20-second countdown before logout

function SessionTimeout({ onSignOut }) {
  const [warn,  setWarn]  = useState(false)
  const [count, setCount] = useState(WARN_S)
  const idleRef  = useRef(null)
  const tickRef  = useRef(null)
  const warnRef  = useRef(false)

  const resetIdle = useCallback(() => {
    if (warnRef.current) return
    clearTimeout(idleRef.current)
    idleRef.current = setTimeout(() => {
      warnRef.current = true
      setWarn(true)
      setCount(WARN_S)
    }, IDLE_MS)
  }, [])

  useEffect(() => {
    const evts = ['mousemove','mousedown','keydown','scroll','touchstart','click']
    evts.forEach(e => window.addEventListener(e, resetIdle, { passive: true }))
    resetIdle()
    return () => {
      evts.forEach(e => window.removeEventListener(e, resetIdle))
      clearTimeout(idleRef.current)
      clearInterval(tickRef.current)
    }
  }, [resetIdle])

  useEffect(() => {
    if (!warn) { clearInterval(tickRef.current); return }
    tickRef.current = setInterval(() => {
      setCount(c => {
        if (c <= 1) { clearInterval(tickRef.current); onSignOut(); return 0 }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(tickRef.current)
  }, [warn, onSignOut])

  const stay = useCallback(() => {
    warnRef.current = false
    clearInterval(tickRef.current)
    setWarn(false)
    setCount(WARN_S)
    resetIdle()
  }, [resetIdle])

  if (!warn) return null

  const urgent = count <= 5
  return (
    <div style={{
      position:'fixed', inset:0, background:'rgba(15,23,42,.65)',
      zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center',
      fontFamily:"'Inter',system-ui,sans-serif", backdropFilter:'blur(4px)',
    }}>
      <div style={{
        background:'#fff', borderRadius:16, padding:'40px 36px',
        width:'100%', maxWidth:400, textAlign:'center',
        boxShadow:'0 24px 60px rgba(0,0,0,.25)',
        animation:'timeout-pop .2s ease',
      }}>
        <style>{`
          @keyframes timeout-pop {
            from { transform:scale(.92); opacity:0; }
            to   { transform:scale(1);  opacity:1; }
          }
        `}</style>

        {/* Countdown ring */}
        <div style={{
          width:88, height:88, borderRadius:'50%',
          background: urgent ? '#FEF2F2' : '#FFF7ED',
          border: `4px solid ${urgent ? '#DC2626' : '#D97706'}`,
          margin:'0 auto 22px', display:'flex', alignItems:'center',
          justifyContent:'center', fontSize:30, fontWeight:800,
          color: urgent ? '#DC2626' : '#D97706',
          transition:'border-color .4s, background .4s, color .4s',
        }}>{count}</div>

        <div style={{fontSize:22, marginBottom:10}}>🔒</div>

        <div style={{fontSize:19, fontWeight:800, color:'#0F172A', marginBottom:8}}>
          Session Timing Out
        </div>
        <div style={{fontSize:13, color:'#64748B', lineHeight:1.65, marginBottom:28}}>
          You've been inactive for <strong>5 minutes</strong>. For your security,
          you'll be logged out in{' '}
          <strong style={{color: urgent ? '#DC2626' : '#D97706'}}>
            {count} second{count !== 1 ? 's' : ''}
          </strong>.
        </div>

        <div style={{display:'flex', gap:10}}>
          <button onClick={onSignOut} style={{
            flex:1, padding:'11px', border:'1.5px solid #E2E8F0',
            borderRadius:8, background:'#fff', color:'#64748B',
            fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit',
          }}>
            Sign Out
          </button>
          <button onClick={stay} style={{
            flex:2, padding:'11px', border:'none',
            borderRadius:8, background:'#C8102E', color:'#fff',
            fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit',
            boxShadow:'0 2px 8px rgba(200,16,46,.35)',
          }}>
            Stay Logged In →
          </button>
        </div>
      </div>
    </div>
  )
}

// ── URL MODE ───────────────────────────────────────────────────
function getUrlMode() {
  const hash = window.location.hash
  if (!hash || hash.length < 2) return 'normal'
  const params = new URLSearchParams(hash.substring(1))
  const type   = params.get('type')
  const error  = params.get('error')
  if (error) return 'normal'
  if (type === 'invite' || type === 'recovery') return 'invite'
  if (params.get('access_token')) return 'invite'
  return 'normal'
}

// ── ROOT ───────────────────────────────────────────────────────
function Root() {
  const [screen,  setScreen]  = useState(() => getUrlMode())
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const handleSignOut = useCallback(() => supabase.auth.signOut(), [])

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

  return (
    <>
      <App currentUser={profile} />
      <SessionTimeout onSignOut={handleSignOut} />
    </>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><Root /></React.StrictMode>
)
