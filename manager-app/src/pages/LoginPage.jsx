import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/client';
import { setAuth } from '../auth';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    try {
      const response = await api.post('/auth/login', { email, password });
      if (!['manager', 'admin'].includes(response.data.user.role)) {
        toast.error('የአስተዳዳሪ መዳረሻ ብቻ።');
        return;
      }
      setAuth(response.data.token, response.data.user);
      navigate('/', { replace: true });
    } catch (error) {
      const serverError = error.response?.data?.error;
      toast.error(serverError === 'Invalid email or password.'
        ? 'ኢሜይሉ ወይም የይለፍ ቃሉ ትክክል አይደለም።'
        : serverError || 'መግባት አልተሳካም።');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{
      minHeight: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      background: 'linear-gradient(135deg, #1c1410 0%, #3d2a1a 100%)',
    }}>
      <section style={{
        width: '100%',
        maxWidth: 400,
        padding: '40px 32px',
        borderRadius: 16,
        background: 'white',
        boxShadow: '0 25px 50px rgba(0,0,0,0.4)',
      }}>
        <header style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 44, marginBottom: 10 }}>🇪🇹</div>
          <h1 style={{ fontSize: 22, color: '#1c1410' }}>Habesha Restaurant</h1>
          <p style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>የአስተዳዳሪ መግቢያ</p>
        </header>

        <form onSubmit={handleSubmit}>
          <label style={{ display: 'block', marginBottom: 16, fontSize: 13, fontWeight: 500 }}>
            ኢሜይል
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={event => setEmail(event.target.value)}
              required
              style={{
                display: 'block', width: '100%', marginTop: 6, padding: '10px 14px',
                border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14,
              }}
            />
          </label>

          <label style={{ display: 'block', marginBottom: 24, fontSize: 13, fontWeight: 500 }}>
            የይለፍ ቃል
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={event => setPassword(event.target.value)}
              required
              style={{
                display: 'block', width: '100%', marginTop: 6, padding: '10px 14px',
                border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14,
              }}
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: 12, border: 0, borderRadius: 8,
              background: loading ? '#ccc' : '#C8860A', color: 'white',
              fontSize: 15, fontWeight: 600, cursor: loading ? 'wait' : 'pointer',
            }}
          >
            {loading ? 'በመግባት ላይ...' : 'ግባ'}
          </button>
        </form>
      </section>
    </main>
  );
}
