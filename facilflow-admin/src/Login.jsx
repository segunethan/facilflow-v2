import { useState } from 'react'
import { signIn } from './lib/supabase.js'

const C = {
  brand: '#C8102E', brandDk: '#A00D24', brandLt: '#FEF2F4',
  ink: '#0F172A', muted: '#64748B', border: '#E2E8F0',
}

export default function Login({ onLogin, appName = 'Staff Portal' }) {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

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
    <div style={{
      minHeight: '100vh', background: '#F7F8FA',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Plus Jakarta Sans','Segoe UI',system-ui,sans-serif",
      padding: 16,
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: C.brand, color: '#fff',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, fontWeight: 900, letterSpacing: '-.05em',
            marginBottom: 14, boxShadow: `0 4px 16px ${C.brand}40`,
          }}>AP</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.ink, letterSpacing: '-.025em' }}>
            Africa Prudential
          </div>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 3 }}>
            FaciliFlow · {appName}
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: '#fff', border: `1px solid ${C.border}`,
          borderRadius: 12, padding: '28px 28px',
          boxShadow: '0 4px 24px rgba(0,0,0,.06)',
        }}>
          <h2 style={{ margin: '0 0 22px', fontSize: 16, fontWeight: 700, color: C.ink }}>
            Sign in to your account
          </h2>

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 14 }}>
              <label style={{
                fontSize: 11, fontWeight: 700, color: C.muted,
                textTransform: 'uppercase', letterSpacing: '.07em',
                display: 'block', marginBottom: 5,
              }}>Email Address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
                placeholder="you@africaprudential.com"
                style={{
                  width: '100%', padding: '9px 12px',
                  border: `1px solid ${C.border}`, borderRadius: 7,
                  fontSize: 13, color: C.ink, fontFamily: 'inherit',
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{
                fontSize: 11, fontWeight: 700, color: C.muted,
                textTransform: 'uppercase', letterSpacing: '.07em',
                display: 'block', marginBottom: 5,
              }}>Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                style={{
                  width: '100%', padding: '9px 12px',
                  border: `1px solid ${C.border}`, borderRadius: 7,
                  fontSize: 13, color: C.ink, fontFamily: 'inherit',
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>

            {error && (
              <div style={{
                padding: '9px 13px', borderRadius: 7, marginBottom: 14,
                background: '#FEF2F2', border: '1px solid #FCA5A5',
                fontSize: 13, color: '#DC2626', fontWeight: 500,
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '10px 16px',
                background: loading ? C.muted : C.brand,
                color: '#fff', border: 'none', borderRadius: 7,
                fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit', transition: 'background .15s',
              }}
            >
              {loading ? 'Signing in…' : 'Sign In →'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: C.muted, marginTop: 20 }}>
          Forgot your password? Contact your system administrator.
        </p>
      </div>
    </div>
  )
}
