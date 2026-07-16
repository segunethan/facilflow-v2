import { useState, useEffect } from 'react'
import { signIn, sendPasswordReset } from './lib/supabase.js'

const C = {
  brand: '#C8102E',
  brandDk: '#A00D24',
  ink: '#0F172A',
  muted: '#64748B',
  border: '#E2E8F0',
  panelBg: '#0C1220',
}

const features = [
  {
    title: 'Requisition Management',
    desc: 'Submit and track purchase requests with real-time approval status.',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="2" y="2" width="14" height="14" rx="3" stroke="rgba(200,16,46,0.8)" strokeWidth="1.4"/>
        <path d="M5.5 9h7M5.5 6h7M5.5 12h4" stroke="rgba(200,16,46,0.8)" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    title: 'Multi-tier Approvals',
    desc: 'Structured approval chains with configurable workflows and escalation.',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <circle cx="9" cy="4" r="2" stroke="rgba(200,16,46,0.8)" strokeWidth="1.4"/>
        <circle cx="4" cy="13" r="2" stroke="rgba(200,16,46,0.8)" strokeWidth="1.4"/>
        <circle cx="14" cy="13" r="2" stroke="rgba(200,16,46,0.8)" strokeWidth="1.4"/>
        <path d="M9 6v3.5M9 9.5L4 11M9 9.5L14 11" stroke="rgba(200,16,46,0.8)" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    title: 'Change Management',
    desc: 'Full audit trail and structured documentation for every change request.',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M9 2a7 7 0 107 7" stroke="rgba(200,16,46,0.8)" strokeWidth="1.4" strokeLinecap="round"/>
        <path d="M13 2v4h-4" stroke="rgba(200,16,46,0.8)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M7 9l1.5 1.5L12 7" stroke="rgba(200,16,46,0.8)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    title: 'IT & Operations Helpdesk',
    desc: 'Raise and track support tickets with smart priority routing.',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M3 6a6 6 0 0112 0v1a2 2 0 01-2 2h-1a1 1 0 01-1-1V6" stroke="rgba(200,16,46,0.8)" strokeWidth="1.4"/>
        <path d="M3 7H4a2 2 0 012 2v1a1 1 0 01-1 1H4a2 2 0 01-2-2v-.5" stroke="rgba(200,16,46,0.8)" strokeWidth="1.4"/>
        <path d="M9 15a3 3 0 003-3h-3" stroke="rgba(200,16,46,0.8)" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
  },
]

const stats = ['500+ Staff Members', '99.9% Uptime', 'Enterprise Secure']

export default function Login({ onLogin, appName = 'Staff Portal' }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [step, setStep] = useState('login') // 'login' | 'forgot' | 'sent'
  const [resetEmail, setResetEmail] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [resetError, setResetError] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60)
    return () => clearTimeout(t)
  }, [])

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { data, error } = await signIn(email, password)
      if (error) throw error
      onLogin(data.user)
    } catch (err) {
      setError(err.message || 'Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  const handleForgot = async (e) => {
    e.preventDefault()
    setResetLoading(true)
    setResetError('')
    try {
      const { error } = await sendPasswordReset(resetEmail)
      if (error) throw error
      setStep('sent')
    } catch (err) {
      setResetError(err.message || 'Failed to send reset email. Try again.')
    } finally {
      setResetLoading(false)
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { margin: 0; }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes blob1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50%       { transform: translate(20px, -20px) scale(1.08); }
        }
        @keyframes blob2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50%       { transform: translate(-15px, 15px) scale(1.05); }
        }
        .ff-wrap { display: flex; min-height: 100dvh; font-family: 'Inter','Plus Jakarta Sans',system-ui,sans-serif; overflow: hidden; }
        .ff-left  { flex: 0 0 56%; display: flex; flex-direction: column; justify-content: center; padding: 64px 72px; }
        .ff-right { flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 48px 64px; background: #fff; }
        @media (max-width: 900px) {
          .ff-left  { flex: none; padding: 40px 28px 36px; }
          .ff-right { padding: 36px 28px; }
          .ff-wrap  { flex-direction: column; }
          .ff-headline { font-size: 34px !important; }
          .ff-features { display: none !important; }
          .ff-stats    { display: none !important; }
        }
        .ff-input {
          width: 100%; padding: 11px 14px;
          border: 1.5px solid #E2E8F0; border-radius: 8px;
          font-size: 14px; color: #0F172A; font-family: inherit;
          outline: none; transition: border-color .15s, box-shadow .15s;
          background: #fff;
        }
        .ff-input:focus { border-color: #C8102E; box-shadow: 0 0 0 3px rgba(200,16,46,.1); }
        .ff-btn {
          width: 100%; padding: 12px 20px;
          background: linear-gradient(135deg, #C8102E, #A00D24);
          color: #fff; border: none; border-radius: 8px;
          font-size: 14px; font-weight: 700; cursor: pointer;
          font-family: inherit; transition: opacity .15s, transform .1s;
          box-shadow: 0 4px 18px rgba(200,16,46,.35);
          letter-spacing: -.01em;
        }
        .ff-btn:hover:not(:disabled) { opacity: .92; transform: translateY(-1px); }
        .ff-btn:active:not(:disabled) { transform: translateY(0); }
        .ff-btn:disabled { background: #94A3B8; box-shadow: none; cursor: not-allowed; }
        .ff-eye-btn {
          position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
          background: none; border: none; cursor: pointer; padding: 4px;
          color: #94A3B8; display: flex; align-items: center;
          transition: color .15s;
        }
        .ff-eye-btn:hover { color: #64748B; }
        .ff-feat-item {
          display: flex; align-items: flex-start; gap: 12px;
          opacity: 0; animation: fadeUp .5s ease forwards;
        }
        .ff-feat-icon {
          width: 34px; height: 34px; border-radius: 8px; flex-shrink: 0;
          background: rgba(200,16,46,.12);
          display: flex; align-items: center; justify-content: center;
          margin-top: 1px;
        }
      `}</style>

      <div className="ff-wrap">
        {/* ── Left Brand Panel ── */}
        <div className="ff-left" style={{
          background: C.panelBg,
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.055) 1px, transparent 1px)',
          backgroundSize: '26px 26px',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: -140, right: -100, width: 480, height: 480,
            background: 'radial-gradient(circle, rgba(200,16,46,.22) 0%, transparent 65%)',
            borderRadius: '50%', pointerEvents: 'none',
            animation: 'blob1 8s ease-in-out infinite',
          }}/>
          <div style={{
            position: 'absolute', bottom: -100, left: -80, width: 360, height: 360,
            background: 'radial-gradient(circle, rgba(200,16,46,.12) 0%, transparent 65%)',
            borderRadius: '50%', pointerEvents: 'none',
            animation: 'blob2 10s ease-in-out infinite',
          }}/>

          {/* Logo */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12, marginBottom: 56,
            opacity: mounted ? 1 : 0, transition: 'opacity .5s ease',
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: 11,
              background: C.brand, color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, fontWeight: 900, letterSpacing: '-.04em',
              boxShadow: `0 4px 20px ${C.brand}55`, flexShrink: 0,
            }}>AP</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', letterSpacing: '-.02em' }}>
                Africa Prudential
              </div>
              <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,.38)', letterSpacing: '.08em', marginTop: 1, textTransform: 'uppercase' }}>
                FaciliFlow Platform
              </div>
            </div>
          </div>

          {/* Headline */}
          <div style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(20px)',
            transition: 'opacity .6s ease .1s, transform .6s ease .1s',
            marginBottom: 40,
          }}>
            <h1 className="ff-headline" style={{
              fontSize: 46, fontWeight: 900, color: '#fff',
              letterSpacing: '-.035em', lineHeight: 1.08, marginBottom: 16,
            }}>
              Your work,<br/>
              <span style={{ color: C.brand }}>simplified.</span>
            </h1>
            <p style={{
              fontSize: 15.5, color: 'rgba(255,255,255,.5)',
              lineHeight: 1.65, maxWidth: 400,
            }}>
              The all-in-one workflow platform for Africa Prudential staff — manage requisitions, approvals, and support in one place.
            </p>
          </div>

          {/* Features */}
          <div className="ff-features" style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 48 }}>
            {features.map((f, i) => (
              <div key={i} className="ff-feat-item"
                style={{ animationDelay: `${0.25 + i * 0.1}s`, animationPlayState: mounted ? 'running' : 'paused' }}>
                <div className="ff-feat-icon">{f.icon}</div>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 650, color: 'rgba(255,255,255,.88)', marginBottom: 3 }}>{f.title}</div>
                  <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,.4)', lineHeight: 1.55 }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Stats */}
          <div className="ff-stats" style={{
            display: 'flex', gap: 24,
            borderTop: '1px solid rgba(255,255,255,.08)', paddingTop: 28,
            opacity: mounted ? 1 : 0, transition: 'opacity .8s ease .6s',
          }}>
            {stats.map(s => (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: C.brand, flexShrink: 0 }}/>
                <span style={{ fontSize: 11.5, color: 'rgba(255,255,255,.38)', fontWeight: 500 }}>{s}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right Panel ── */}
        <div className="ff-right" style={{ position: 'relative' }}>
          <div style={{ width: '100%', maxWidth: 368 }}>

            {/* ── LOGIN STEP ── */}
            {step === 'login' && (<>
              <div style={{
                width: 50, height: 50, borderRadius: 13,
                background: 'linear-gradient(135deg, #FEF2F4, #fff)',
                border: `1.5px solid rgba(200,16,46,.2)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 24, boxShadow: '0 2px 12px rgba(200,16,46,.08)',
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M12 3L4 7.5v6c0 4.5 3.2 8.5 8 9.5 4.8-1 8-5 8-9.5v-6L12 3z"
                    fill="rgba(200,16,46,.12)" stroke={C.brand} strokeWidth="1.6" strokeLinejoin="round"/>
                  <path d="M9 12.5l2 2L15 10" stroke={C.brand} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h2 style={{ fontSize: 26, fontWeight: 800, color: C.ink, letterSpacing: '-.03em', marginBottom: 8 }}>Welcome back</h2>
              <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.6, marginBottom: 32 }}>
                Sign in to your {appName} account to continue.
              </p>
              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div>
                  <label style={{ fontSize: 12.5, fontWeight: 600, color: C.ink, display: 'block', marginBottom: 6 }}>Email address</label>
                  <input className="ff-input" type="email" value={email} onChange={e => setEmail(e.target.value)}
                    required autoFocus placeholder="you@africaprudential.com"/>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <label style={{ fontSize: 12.5, fontWeight: 600, color: C.ink }}>Password</label>
                    <button type="button" onClick={() => { setResetEmail(email); setStep('forgot'); setResetError(''); }}
                      style={{ fontSize: 12, color: C.brand, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
                      Forgot password?
                    </button>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input className="ff-input" type={showPass ? 'text' : 'password'} value={password}
                      onChange={e => setPassword(e.target.value)} required placeholder="Enter your password"
                      style={{ paddingRight: 42 }}/>
                    <button type="button" className="ff-eye-btn" onClick={() => setShowPass(v => !v)}>
                      {showPass
                        ? <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M2 9s3-6 7-6 7 6 7 6-3 6-7 6-7-6-7-6z" stroke="currentColor" strokeWidth="1.4"/><circle cx="9" cy="9" r="2.2" stroke="currentColor" strokeWidth="1.4"/><line x1="3" y1="3" x2="15" y2="15" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
                        : <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M2 9s3-6 7-6 7 6 7 6-3 6-7 6-7-6-7-6z" stroke="currentColor" strokeWidth="1.4"/><circle cx="9" cy="9" r="2.2" stroke="currentColor" strokeWidth="1.4"/></svg>
                      }
                    </button>
                  </div>
                </div>
                {error && (
                  <div style={{ padding: '10px 14px', borderRadius: 8, background: '#FEF2F2', border: '1px solid #FCA5A5',
                    fontSize: 13, color: '#DC2626', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="#DC2626" strokeWidth="1.3"/><path d="M7 4v4M7 9.5v.5" stroke="#DC2626" strokeWidth="1.3" strokeLinecap="round"/></svg>
                    {error}
                  </div>
                )}
                <button type="submit" className="ff-btn" disabled={loading} style={{ marginTop: 4 }}>
                  {loading ? 'Signing in…' : `Sign in to ${appName} →`}
                </button>
              </form>
              <div style={{ marginTop: 36, padding: '12px 16px', background: '#F8FAFC', borderRadius: 8,
                border: '1px solid #E2E8F0', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
                  <circle cx="7.5" cy="7.5" r="6.5" stroke="#94A3B8" strokeWidth="1.2"/>
                  <path d="M7.5 6.5v3.5M7.5 4.5v1" stroke="#94A3B8" strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
                <p style={{ fontSize: 11.5, color: '#94A3B8', lineHeight: 1.55 }}>
                  This portal is for authorized Africa Prudential staff only. All sessions are encrypted and monitored.
                </p>
              </div>
            </>)}

            {/* ── FORGOT PASSWORD STEP ── */}
            {step === 'forgot' && (<>
              <div style={{
                width: 50, height: 50, borderRadius: 13,
                background: 'linear-gradient(135deg, #FEF2F4, #fff)',
                border: `1.5px solid rgba(200,16,46,.2)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 24, boxShadow: '0 2px 12px rgba(200,16,46,.08)',
              }}>
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                  <rect x="3" y="9" width="16" height="11" rx="2" stroke={C.brand} strokeWidth="1.6"/>
                  <path d="M7 9V6a4 4 0 018 0v3" stroke={C.brand} strokeWidth="1.6" strokeLinecap="round"/>
                  <circle cx="11" cy="14.5" r="1.5" fill={C.brand}/>
                </svg>
              </div>
              <h2 style={{ fontSize: 26, fontWeight: 800, color: C.ink, letterSpacing: '-.03em', marginBottom: 8 }}>Reset password</h2>
              <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.6, marginBottom: 32 }}>
                Enter your email address and we'll send you a link to set a new password.
              </p>
              <form onSubmit={handleForgot} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div>
                  <label style={{ fontSize: 12.5, fontWeight: 600, color: C.ink, display: 'block', marginBottom: 6 }}>Email address</label>
                  <input className="ff-input" type="email" value={resetEmail} onChange={e => setResetEmail(e.target.value)}
                    required autoFocus placeholder="you@africaprudential.com"/>
                </div>
                {resetError && (
                  <div style={{ padding: '10px 14px', borderRadius: 8, background: '#FEF2F2', border: '1px solid #FCA5A5',
                    fontSize: 13, color: '#DC2626', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="#DC2626" strokeWidth="1.3"/><path d="M7 4v4M7 9.5v.5" stroke="#DC2626" strokeWidth="1.3" strokeLinecap="round"/></svg>
                    {resetError}
                  </div>
                )}
                <button type="submit" className="ff-btn" disabled={resetLoading} style={{ marginTop: 4 }}>
                  {resetLoading ? 'Sending…' : 'Send reset link →'}
                </button>
              </form>
              <p style={{ textAlign: 'center', fontSize: 12, color: C.muted, marginTop: 24 }}>
                <button onClick={() => setStep('login')} style={{ color: C.brand, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12 }}>
                  ← Back to sign in
                </button>
              </p>
            </>)}

            {/* ── EMAIL SENT STEP ── */}
            {step === 'sent' && (<>
              <div style={{
                width: 60, height: 60, borderRadius: 15,
                background: 'linear-gradient(135deg, #ECFDF5, #fff)',
                border: `1.5px solid rgba(5,150,105,.25)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 24, boxShadow: '0 2px 12px rgba(5,150,105,.1)',
              }}>
                <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
                  <circle cx="13" cy="13" r="11" stroke="#059669" strokeWidth="1.6"/>
                  <path d="M8 13l3.5 3.5L18 9" stroke="#059669" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h2 style={{ fontSize: 26, fontWeight: 800, color: C.ink, letterSpacing: '-.03em', marginBottom: 8 }}>Check your inbox</h2>
              <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.7, marginBottom: 28 }}>
                We sent a password reset link to <strong style={{ color: C.ink }}>{resetEmail}</strong>.
                Click the link in the email to set your new password.
              </p>
              <div style={{ padding: '14px 16px', background: '#F0FDF4', borderRadius: 10, border: '1px solid #BBF7D0',
                fontSize: 12.5, color: '#15803D', lineHeight: 1.6, marginBottom: 24 }}>
                The link expires in <strong>1 hour</strong>. Check your spam folder if you don't see it.
              </div>
              <button onClick={() => setStep('login')} className="ff-btn">
                Back to sign in
              </button>
            </>)}

          </div>

          <div style={{ position: 'absolute', bottom: 20, fontSize: 11, color: '#CBD5E1', textAlign: 'center', width: '100%' }}>
            © {new Date().getFullYear()} Africa Prudential · FaciliFlow v2.0
          </div>
        </div>
      </div>
    </>
  )
}
