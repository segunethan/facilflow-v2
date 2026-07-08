import React, { useState, useEffect, useRef, useCallback } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import Login from './Login.jsx'
import { supabase, getProfile } from './lib/supabase.js'

// ── SESSION TIMEOUT ────────────────────────────────────────────
const IDLE_MS = 5 * 60 * 1000   // 5 minutes of inactivity
const WARN_S  = 20               // 20-second countdown before logout

function SessionTimeout({ onSignOut }) {
  const [warn,  setWarn]  = useState(false)
  const [count, setCount] = useState(WARN_S)
  const idleRef  = useRef(null)
  const tickRef  = useRef(null)
  const warnRef  = useRef(false)   // ref so activity listener sees current value

  const resetIdle = useCallback(() => {
    if (warnRef.current) return   // don't reset while warning is visible
    clearTimeout(idleRef.current)
    idleRef.current = setTimeout(() => {
      warnRef.current = true
      setWarn(true)
      setCount(WARN_S)
    }, IDLE_MS)
  }, [])

  // Attach activity listeners
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

  // Countdown tick when warning is shown
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

        {/* Icon */}
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

// ── ROOT ───────────────────────────────────────────────────────
function Root() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const handleSignOut = useCallback(() => supabase.auth.signOut(), [])

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

  const ADMIN_ROLES = ['admin', 'super_admin', 'facility_admin', 'it_admin']

  const loadProfile = async (userId) => {
    try {
      const p = await getProfile(userId)
      const primaryRole = p.role === 'admin' ? 'super_admin' : p.role
      const extraRoles  = Array.isArray(p.admin_roles) ? p.admin_roles : []
      const isAdmin = ADMIN_ROLES.includes(p.role) ||
                      extraRoles.some(r => ADMIN_ROLES.includes(r))
      if (!isAdmin) {
        await supabase.auth.signOut()
        alert('Only admin users can access the Admin Console.')
        setLoading(false)
        return
      }
      if (p.status === 'suspended') {
        await supabase.auth.signOut()
        alert('Your account has been suspended. Please contact your administrator.')
        setLoading(false)
        return
      }
      setProfile({ ...p, role: primaryRole })
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
