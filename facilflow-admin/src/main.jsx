import React, { useState, useEffect, useRef, useCallback } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import Login from './Login.jsx'
import { supabase, getProfile, updatePassword } from './lib/supabase.js'

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

// ── RESET PASSWORD SCREEN ──────────────────────────────────────
function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [done,     setDone]     = useState(false)
  const [show,     setShow]     = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }
    setLoading(true); setError('')
    try {
      const { error } = await updatePassword(password)
      if (error) throw error
      setDone(true)
      window.history.replaceState(null, '', window.location.pathname)
      setTimeout(() => window.location.reload(), 2500)
    } catch (err) {
      setError(err.message || 'Failed to update password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const B = '#C8102E'
  return (
    <div style={{ minHeight:'100dvh', display:'flex', alignItems:'center', justifyContent:'center',
      background:'#F7F8FA', fontFamily:"'Inter',system-ui,sans-serif", padding:16 }}>
      <div style={{ width:'100%', maxWidth:400, background:'#fff', borderRadius:16,
        padding:'40px 36px', boxShadow:'0 8px 40px rgba(0,0,0,.1)', border:'1px solid #E2E8F0' }}>
        {done ? (<>
          <div style={{ width:56, height:56, borderRadius:14, background:'#ECFDF5', border:'1.5px solid rgba(5,150,105,.25)',
            display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px' }}>
            <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
              <circle cx="13" cy="13" r="11" stroke="#059669" strokeWidth="1.6"/>
              <path d="M8 13l3.5 3.5L18 9" stroke="#059669" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h2 style={{ fontSize:22, fontWeight:800, color:'#0F172A', textAlign:'center', marginBottom:10 }}>Password updated!</h2>
          <p style={{ fontSize:13.5, color:'#64748B', textAlign:'center', lineHeight:1.6 }}>
            Your password has been changed. Redirecting you to sign in…
          </p>
        </>) : (<>
          <div style={{ width:50, height:50, borderRadius:13, background:'linear-gradient(135deg,#FEF2F4,#fff)',
            border:`1.5px solid rgba(200,16,46,.2)`, display:'flex', alignItems:'center', justifyContent:'center',
            marginBottom:22, boxShadow:'0 2px 12px rgba(200,16,46,.08)' }}>
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <rect x="3" y="9" width="16" height="11" rx="2" stroke={B} strokeWidth="1.6"/>
              <path d="M7 9V6a4 4 0 018 0v3" stroke={B} strokeWidth="1.6" strokeLinecap="round"/>
              <circle cx="11" cy="14.5" r="1.5" fill={B}/>
            </svg>
          </div>
          <h2 style={{ fontSize:22, fontWeight:800, color:'#0F172A', marginBottom:6 }}>Set new password</h2>
          <p style={{ fontSize:13.5, color:'#64748B', lineHeight:1.6, marginBottom:28 }}>Choose a strong password for your admin account.</p>
          <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div>
              <label style={{ fontSize:12.5, fontWeight:600, color:'#0F172A', display:'block', marginBottom:6 }}>New password</label>
              <div style={{ position:'relative' }}>
                <input type={show?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)}
                  required placeholder="At least 8 characters"
                  style={{ width:'100%', padding:'11px 42px 11px 14px', border:'1.5px solid #E2E8F0', borderRadius:8,
                    fontSize:14, color:'#0F172A', fontFamily:'inherit', outline:'none', boxSizing:'border-box' }}
                  onFocus={e=>e.target.style.borderColor=B} onBlur={e=>e.target.style.borderColor='#E2E8F0'}/>
                <button type="button" onClick={()=>setShow(v=>!v)}
                  style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)',
                    background:'none', border:'none', cursor:'pointer', color:'#94A3B8', padding:4 }}>
                  <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
                    <path d="M2 8.5s3-5.5 6.5-5.5S15 8.5 15 8.5s-3 5.5-6.5 5.5S2 8.5 2 8.5z" stroke="currentColor" strokeWidth="1.3"/>
                    <circle cx="8.5" cy="8.5" r="2" stroke="currentColor" strokeWidth="1.3"/>
                  </svg>
                </button>
              </div>
            </div>
            <div>
              <label style={{ fontSize:12.5, fontWeight:600, color:'#0F172A', display:'block', marginBottom:6 }}>Confirm password</label>
              <input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)}
                required placeholder="Repeat your new password"
                style={{ width:'100%', padding:'11px 14px', border:'1.5px solid #E2E8F0', borderRadius:8,
                  fontSize:14, color:'#0F172A', fontFamily:'inherit', outline:'none', boxSizing:'border-box' }}
                onFocus={e=>e.target.style.borderColor=B} onBlur={e=>e.target.style.borderColor='#E2E8F0'}/>
            </div>
            {error && (
              <div style={{ padding:'10px 14px', borderRadius:8, background:'#FEF2F2', border:'1px solid #FCA5A5',
                fontSize:13, color:'#DC2626', fontWeight:500 }}>{error}</div>
            )}
            <button type="submit" disabled={loading}
              style={{ padding:'12px', background:`linear-gradient(135deg,${B},#A00D24)`, color:'#fff',
                border:'none', borderRadius:8, fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit',
                opacity:loading?0.7:1, boxShadow:'0 4px 18px rgba(200,16,46,.3)' }}>
              {loading ? 'Updating…' : 'Set new password →'}
            </button>
          </form>
        </>)}
      </div>
    </div>
  )
}

// ── URL MODE ───────────────────────────────────────────────────
function getUrlMode() {
  const hash = window.location.hash
  if (!hash || hash.length < 2) return 'normal'
  const params = new URLSearchParams(hash.substring(1))
  const type = params.get('type')
  const error = params.get('error')
  if (error) return 'normal'
  if (type === 'recovery') return 'recovery'
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
    if (screen === 'recovery') { setLoading(false); return }
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

  if (screen === 'recovery') return <ResetPassword />

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
