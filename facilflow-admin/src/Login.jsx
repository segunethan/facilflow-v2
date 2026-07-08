import { useState } from 'react'
import { signIn } from './lib/supabase.js'

const C = {
  brand: '#C8102E', brandDk: '#A00D24', brandLt: '#FEF2F4',
  ink: '#0F172A', muted: '#64748B', border: '#E2E8F0',
}

function DashboardIllustration() {
  return (
    <svg width="300" height="220" viewBox="0 0 300 220" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ filter: 'drop-shadow(0 20px 40px rgba(0,0,0,.25))' }}>
      {/* Monitor frame */}
      <rect x="10" y="10" width="280" height="180" rx="10" fill="rgba(255,255,255,.1)" stroke="rgba(255,255,255,.25)" strokeWidth="1.2"/>
      {/* Nav bar */}
      <rect x="10" y="10" width="280" height="28" rx="10" fill="rgba(255,255,255,.15)"/>
      <rect x="10" y="28" width="280" height="10" fill="rgba(255,255,255,.15)"/>
      {/* Nav dots */}
      <circle cx="30" cy="24" r="4" fill="rgba(255,255,255,.4)"/>
      <rect x="44" y="20" width="40" height="8" rx="4" fill="rgba(255,255,255,.25)"/>
      <rect x="92" y="20" width="30" height="8" rx="4" fill="rgba(255,255,255,.2)"/>
      <rect x="230" y="20" width="50" height="8" rx="4" fill="rgba(255,255,255,.2)"/>
      {/* Left sidebar */}
      <rect x="10" y="38" width="54" height="152" fill="rgba(255,255,255,.06)"/>
      <rect x="18" y="52" width="38" height="7" rx="3" fill="rgba(255,255,255,.3)"/>
      <rect x="18" y="65" width="30" height="6" rx="3" fill="rgba(255,255,255,.18)"/>
      <rect x="18" y="77" width="34" height="6" rx="3" fill="rgba(255,255,255,.18)"/>
      <rect x="18" y="89" width="28" height="6" rx="3" fill="rgba(255,255,255,.18)"/>
      <rect x="18" y="101" width="33" height="6" rx="3" fill="rgba(255,255,255,.12)"/>
      <rect x="18" y="113" width="29" height="6" rx="3" fill="rgba(255,255,255,.12)"/>
      {/* Main content area */}
      {/* Stat cards */}
      <rect x="74" y="44" width="60" height="38" rx="5" fill="rgba(255,255,255,.12)" stroke="rgba(255,255,255,.18)" strokeWidth=".8"/>
      <rect x="80" y="52" width="30" height="5" rx="2" fill="rgba(255,255,255,.4)"/>
      <rect x="80" y="62" width="20" height="8" rx="2" fill="rgba(255,255,255,.6)"/>
      <rect x="142" y="44" width="60" height="38" rx="5" fill="rgba(255,255,255,.12)" stroke="rgba(255,255,255,.18)" strokeWidth=".8"/>
      <rect x="148" y="52" width="28" height="5" rx="2" fill="rgba(255,255,255,.4)"/>
      <rect x="148" y="62" width="22" height="8" rx="2" fill="rgba(255,255,255,.6)"/>
      <rect x="210" y="44" width="68" height="38" rx="5" fill="rgba(255,255,255,.12)" stroke="rgba(255,255,255,.18)" strokeWidth=".8"/>
      <rect x="216" y="52" width="34" height="5" rx="2" fill="rgba(255,255,255,.4)"/>
      <rect x="216" y="62" width="18" height="8" rx="2" fill="rgba(255,255,255,.6)"/>
      {/* Chart card */}
      <rect x="74" y="90" width="126" height="88" rx="5" fill="rgba(255,255,255,.08)" stroke="rgba(255,255,255,.15)" strokeWidth=".8"/>
      <rect x="80" y="97" width="40" height="5" rx="2" fill="rgba(255,255,255,.35)"/>
      {/* Bar chart */}
      <rect x="84" y="148" width="10" height="22" rx="2" fill="rgba(255,255,255,.25)"/>
      <rect x="98" y="138" width="10" height="32" rx="2" fill="rgba(255,255,255,.35)"/>
      <rect x="112" y="130" width="10" height="40" rx="2" fill="rgba(255,255,255,.45)"/>
      <rect x="126" y="120" width="10" height="50" rx="2" fill="rgba(255,255,255,.55)"/>
      <rect x="140" y="128" width="10" height="42" rx="2" fill="rgba(255,255,255,.45)"/>
      <rect x="154" y="118" width="10" height="52" rx="2" fill="rgba(255,255,255,.65)"/>
      {/* Trend line */}
      <polyline points="89,148 103,136 117,126 131,116 145,124 159,112"
        stroke="rgba(255,255,255,.8)" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      {/* Table card */}
      <rect x="210" y="90" width="68" height="88" rx="5" fill="rgba(255,255,255,.08)" stroke="rgba(255,255,255,.15)" strokeWidth=".8"/>
      <rect x="216" y="97" width="34" height="5" rx="2" fill="rgba(255,255,255,.35)"/>
      <rect x="216" y="109" width="56" height="4" rx="2" fill="rgba(255,255,255,.2)"/>
      <rect x="216" y="118" width="56" height="4" rx="2" fill="rgba(255,255,255,.15)"/>
      <rect x="216" y="127" width="56" height="4" rx="2" fill="rgba(255,255,255,.2)"/>
      <rect x="216" y="136" width="40" height="4" rx="2" fill="rgba(255,255,255,.15)"/>
      <rect x="216" y="145" width="48" height="4" rx="2" fill="rgba(255,255,255,.2)"/>
      <rect x="216" y="154" width="36" height="4" rx="2" fill="rgba(255,255,255,.15)"/>
      {/* Monitor stand */}
      <rect x="130" y="190" width="40" height="8" rx="2" fill="rgba(255,255,255,.12)"/>
      <rect x="115" y="198" width="70" height="6" rx="3" fill="rgba(255,255,255,.15)"/>
    </svg>
  )
}

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPass, setShowPass] = useState(false)

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

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { margin: 0; }
        @keyframes float-up {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-10px); }
        }
        .adm-wrap { display: flex; min-height: 100dvh; font-family: 'Inter',system-ui,sans-serif; }
        .adm-left {
          flex: 0 0 52%; display: flex; flex-direction: column;
          justify-content: space-between; padding: 52px 60px;
          background: linear-gradient(145deg, #C8102E 0%, #a80e26 40%, #8B0012 100%);
          position: relative; overflow: hidden;
        }
        .adm-right {
          flex: 1; display: flex; flex-direction: column;
          justify-content: center; align-items: center;
          padding: 48px 64px; background: #fff;
        }
        @media (max-width: 860px) {
          .adm-left  { display: none; }
          .adm-right { padding: 40px 28px; }
        }
        .adm-input {
          width: 100%; padding: 11px 14px;
          border: 1.5px solid #E2E8F0; border-radius: 8px;
          font-size: 14px; color: #0F172A; font-family: inherit;
          outline: none; transition: border-color .15s, box-shadow .15s;
          background: #fff;
        }
        .adm-input:focus { border-color: #C8102E; box-shadow: 0 0 0 3px rgba(200,16,46,.1); }
        .adm-btn {
          width: 100%; padding: 12px 20px;
          background: linear-gradient(135deg, #C8102E, #A00D24);
          color: #fff; border: none; border-radius: 8px;
          font-size: 14px; font-weight: 700; cursor: pointer;
          font-family: inherit; transition: opacity .15s, transform .1s;
          box-shadow: 0 4px 18px rgba(200,16,46,.35);
          letter-spacing: -.01em;
        }
        .adm-btn:hover:not(:disabled) { opacity: .9; transform: translateY(-1px); }
        .adm-btn:active:not(:disabled) { transform: translateY(0); }
        .adm-btn:disabled { background: #94A3B8; box-shadow: none; cursor: not-allowed; }
        .adm-eye {
          position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
          background: none; border: none; cursor: pointer; padding: 4px;
          color: #94A3B8; display: flex; align-items: center;
        }
        .adm-eye:hover { color: #64748B; }
      `}</style>

      <div className="adm-wrap">
        {/* ── Left Brand Panel ── */}
        <div className="adm-left">
          {/* Dot grid overlay */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.12) 1px, transparent 1px)',
            backgroundSize: '22px 22px',
          }}/>
          {/* White highlight bleed top-right */}
          <div style={{
            position: 'absolute', top: -120, right: -80, width: 340, height: 340,
            background: 'radial-gradient(circle, rgba(255,255,255,.18) 0%, transparent 65%)',
            borderRadius: '50%', pointerEvents: 'none',
          }}/>

          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative' }}>
            <div style={{
              width: 42, height: 42, borderRadius: 10,
              background: 'rgba(255,255,255,.2)', backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,.35)',
              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 15, fontWeight: 900, letterSpacing: '-.04em', flexShrink: 0,
            }}>AP</div>
            <div>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: '#fff', letterSpacing: '-.02em' }}>
                Africa Prudential
              </div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,.55)', letterSpacing: '.1em', textTransform: 'uppercase', marginTop: 1 }}>
                FaciliFlow Admin
              </div>
            </div>
          </div>

          {/* Illustration */}
          <div style={{
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            flex: 1, position: 'relative',
            animation: 'float-up 5s ease-in-out infinite',
          }}>
            <DashboardIllustration />
          </div>

          {/* Bottom text */}
          <div style={{ position: 'relative' }}>
            <h2 style={{
              fontSize: 26, fontWeight: 800, color: '#fff',
              letterSpacing: '-.03em', lineHeight: 1.2, marginBottom: 8,
            }}>Admin Console</h2>
            <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,.6)', lineHeight: 1.6 }}>
              Manage workflows, users, and operations across the FaciliFlow platform.
            </p>
          </div>
        </div>

        {/* ── Right Login Panel ── */}
        <div className="adm-right">
          <div style={{ width: '100%', maxWidth: 360 }}>
            {/* Logo for mobile */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, marginBottom: 36,
            }}>
              <div style={{
                width: 38, height: 38, borderRadius: 9,
                background: C.brand, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 900, letterSpacing: '-.04em', flexShrink: 0,
                boxShadow: `0 4px 14px ${C.brand}40`,
              }}>AP</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.ink, letterSpacing: '-.02em' }}>Africa Prudential</div>
                <div style={{ fontSize: 10.5, color: C.muted, marginTop: 1 }}>FaciliFlow Admin Console</div>
              </div>
            </div>

            <h2 style={{ fontSize: 24, fontWeight: 800, color: C.ink, letterSpacing: '-.03em', marginBottom: 6 }}>
              Welcome back!
            </h2>
            <p style={{ fontSize: 13.5, color: C.muted, marginBottom: 28, lineHeight: 1.6 }}>
              Sign in to your admin account to manage the platform.
            </p>

            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: 12.5, fontWeight: 600, color: C.ink, display: 'block', marginBottom: 6 }}>
                  Email address
                </label>
                <input className="adm-input" type="email" value={email}
                  onChange={e => setEmail(e.target.value)} required autoFocus
                  placeholder="admin@africaprudential.com"/>
              </div>

              <div>
                <label style={{ fontSize: 12.5, fontWeight: 600, color: C.ink, display: 'block', marginBottom: 6 }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input className="adm-input" type={showPass ? 'text' : 'password'} value={password}
                    onChange={e => setPassword(e.target.value)} required placeholder="Enter your password"
                    style={{ paddingRight: 40 }}/>
                  <button type="button" className="adm-eye" onClick={() => setShowPass(v => !v)}>
                    {showPass
                      ? <svg width="17" height="17" viewBox="0 0 17 17" fill="none"><path d="M2 8.5s3-5.5 6.5-5.5S15 8.5 15 8.5s-3 5.5-6.5 5.5S2 8.5 2 8.5z" stroke="currentColor" strokeWidth="1.3"/><circle cx="8.5" cy="8.5" r="2" stroke="currentColor" strokeWidth="1.3"/><line x1="2.5" y1="2.5" x2="14.5" y2="14.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
                      : <svg width="17" height="17" viewBox="0 0 17 17" fill="none"><path d="M2 8.5s3-5.5 6.5-5.5S15 8.5 15 8.5s-3 5.5-6.5 5.5S2 8.5 2 8.5z" stroke="currentColor" strokeWidth="1.3"/><circle cx="8.5" cy="8.5" r="2" stroke="currentColor" strokeWidth="1.3"/></svg>
                    }
                  </button>
                </div>
              </div>

              {error && (
                <div style={{
                  padding: '10px 14px', borderRadius: 7,
                  background: '#FEF2F2', border: '1px solid #FCA5A5',
                  fontSize: 13, color: '#DC2626', fontWeight: 500,
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <circle cx="7" cy="7" r="6" stroke="#DC2626" strokeWidth="1.3"/>
                    <path d="M7 4v3.5M7 9v.5" stroke="#DC2626" strokeWidth="1.3" strokeLinecap="round"/>
                  </svg>
                  {error}
                </div>
              )}

              <button type="submit" className="adm-btn" disabled={loading} style={{ marginTop: 4 }}>
                {loading ? 'Signing in…' : 'Sign In →'}
              </button>
            </form>

            <p style={{ textAlign: 'center', fontSize: 12, color: C.muted, marginTop: 20, lineHeight: 1.6 }}>
              Access restricted to authorized administrators only.
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
