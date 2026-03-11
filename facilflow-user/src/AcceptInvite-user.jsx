import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase.js'

const C = {
  brand:'#C8102E', ink:'#0F172A', muted:'#64748B',
  border:'#E2E8F0', green:'#059669', redBg:'#FEF2F2', red:'#DC2626',
}
const inp = (err=false) => ({
  width:'100%', padding:'9px 12px',
  border:`1px solid ${err ? C.red : C.border}`,
  borderRadius:7, fontSize:13, color:C.ink,
  fontFamily:'inherit', outline:'none', boxSizing:'border-box',
})
const LBL = { fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:'.07em', display:'block', marginBottom:5 }

export default function AcceptInvite({ onComplete, appName='Staff Portal' }) {
  const [step,     setStep]    = useState('loading')
  const [name,     setName]    = useState('')
  const [password, setPass]    = useState('')
  const [confirm,  setConfirm] = useState('')
  const [error,    setError]   = useState('')
  const [saving,   setSaving]  = useState(false)
  const [session,  setSession] = useState(null)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, sess) => {
      if ((event === 'SIGNED_IN' || event === 'USER_UPDATED') && sess) {
        setSession(sess)
        const meta = sess.user?.user_metadata
        if (meta?.full_name) setName(meta.full_name)
        setStep('form')
      }
    })
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (s) { setSession(s); const m=s.user?.user_metadata; if(m?.full_name) setName(m.full_name); setStep('form') }
      else setTimeout(() => setStep(p => p==='loading' ? 'error' : p), 6000)
    })
    return () => subscription.unsubscribe()
  }, [])

  const submit = async () => {
    setError('')
    if (!name.trim()) return setError('Please enter your full name.')
    if (password.length < 8) return setError('Password must be at least 8 characters.')
    if (password !== confirm) return setError('Passwords do not match.')
    setSaving(true)
    try {
      const { error: e1 } = await supabase.auth.updateUser({ password, data: { full_name: name.trim() } })
      if (e1) throw e1
      const initials = name.trim().split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()
      await supabase.from('users').update({ name: name.trim(), initials, status:'active', id: session.user.id }).eq('email', session.user.email)
      setStep('success')
      setTimeout(() => onComplete(session.user), 1800)
    } catch(e) { setError(e.message) }
    finally { setSaving(false) }
  }

  return (
    <div style={{ minHeight:'100vh', background:'#F7F8FA', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', fontFamily:"'Plus Jakarta Sans','Segoe UI',system-ui,sans-serif", padding:16 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      {/* Logo */}
      <div style={{ textAlign:'center', marginBottom:28 }}>
        <div style={{ width:54,height:54,borderRadius:14,background:C.brand,color:'#fff',display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:20,fontWeight:900,marginBottom:12,boxShadow:`0 4px 20px ${C.brand}50` }}>AP</div>
        <div style={{ fontSize:20,fontWeight:800,color:C.ink }}>Africa Prudential</div>
        <div style={{ fontSize:12,color:C.muted,marginTop:3 }}>FaciliFlow · {appName}</div>
      </div>

      {/* Card */}
      <div style={{ width:'100%',maxWidth:430,background:'#fff',border:`1px solid ${C.border}`,borderRadius:12,padding:'28px',boxShadow:'0 4px 24px rgba(0,0,0,.07)' }}>

        {step==='loading' && (
          <div style={{ textAlign:'center', padding:'32px 0' }}>
            <div style={{ width:36,height:36,borderRadius:'50%',border:`3px solid ${C.border}`,borderTopColor:C.brand,animation:'spin .8s linear infinite',margin:'0 auto 16px' }}/>
            <div style={{ fontSize:14,color:C.muted }}>Verifying your invitation…</div>
          </div>
        )}

        {step==='error' && (
          <div style={{ textAlign:'center', padding:'20px 0' }}>
            <div style={{ fontSize:40,marginBottom:14 }}>🔗</div>
            <div style={{ fontSize:17,fontWeight:800,color:C.ink,marginBottom:10 }}>Invitation link expired</div>
            <div style={{ fontSize:13,color:C.muted,lineHeight:1.7,marginBottom:20 }}>This invite link is invalid or has already been used.<br/>Ask your administrator to send a new invitation.</div>
            <button onClick={()=>window.location.href=window.location.origin} style={{ padding:'9px 20px',background:C.brand,color:'#fff',border:'none',borderRadius:7,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit' }}>Go to Login →</button>
          </div>
        )}

        {step==='success' && (
          <div style={{ textAlign:'center', padding:'20px 0' }}>
            <div style={{ fontSize:40,marginBottom:14 }}>✅</div>
            <div style={{ fontSize:17,fontWeight:800,color:C.green,marginBottom:8 }}>Account ready!</div>
            <div style={{ fontSize:13,color:C.muted }}>Taking you to FaciliFlow…</div>
          </div>
        )}

        {step==='form' && (
          <>
            <div style={{ marginBottom:22 }}>
              <div style={{ fontSize:18,fontWeight:800,color:C.ink }}>Set up your account</div>
              <div style={{ fontSize:13,color:C.muted,marginTop:5,lineHeight:1.6 }}>You've been invited to FaciliFlow. Enter your name and choose a password.</div>
            </div>
            <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
              <div><label style={LBL}>Your Full Name</label><input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Adaeze Okonkwo" autoFocus style={inp(!name&&!!error)}/></div>
              <div><label style={LBL}>Email Address</label><input value={session?.user?.email||''} disabled style={{...inp(),background:'#F8FAFC',color:C.muted,cursor:'not-allowed'}}/></div>
              <div><label style={LBL}>Choose a Password</label><input type="password" value={password} onChange={e=>setPass(e.target.value)} placeholder="Minimum 8 characters" style={inp(!!error&&password.length<8)} onKeyDown={e=>e.key==='Enter'&&submit()}/></div>
              <div><label style={LBL}>Confirm Password</label><input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="Re-enter your password" style={inp(!!error&&password!==confirm)} onKeyDown={e=>e.key==='Enter'&&submit()}/></div>
              {error && <div style={{ padding:'10px 13px',borderRadius:7,background:C.redBg,border:`1px solid ${C.red}30`,fontSize:13,color:C.red,fontWeight:500 }}>{error}</div>}
              <button onClick={submit} disabled={saving} style={{ width:'100%',padding:'11px 16px',background:saving?C.muted:C.brand,color:'#fff',border:'none',borderRadius:7,fontSize:14,fontWeight:700,cursor:saving?'not-allowed':'pointer',fontFamily:'inherit' }}>
                {saving ? 'Setting up account…' : 'Confirm & Get Started →'}
              </button>
            </div>
          </>
        )}
      </div>
      <p style={{ textAlign:'center',fontSize:11,color:C.muted,marginTop:20 }}>Africa Prudential Plc · FaciliFlow v2</p>
    </div>
  )
}
