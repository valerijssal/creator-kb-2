'use client';
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function LoginForm() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get('from') || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      router.push(from);
    } else {
      setError('Wrong password.');
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-2)' }}>
      <div style={{ width: '100%', maxWidth: '380px', padding: '40px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '12px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
        <div style={{ width: '36px', height: '36px', background: 'var(--accent)', borderRadius: '8px', marginBottom: '24px' }} />
        <h1 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '6px' }}>Creator Services KB</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '28px' }}>Internal use only.</p>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password"
            autoFocus
            style={{ width: '100%', padding: '10px 14px', background: 'var(--bg)', border: `1px solid ${error ? 'var(--danger)' : 'var(--border)'}`, borderRadius: '8px', color: 'var(--text)', fontSize: '14px', outline: 'none', marginBottom: '10px' }}
          />
          {error && <p style={{ color: 'var(--danger)', fontSize: '13px', marginBottom: '10px' }}>{error}</p>}
          <button type="submit" disabled={loading || !password} style={{ width: '100%', padding: '10px', background: password ? 'var(--accent)' : 'var(--bg-3)', color: password ? '#fff' : 'var(--text-muted)', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: password ? 'pointer' : 'not-allowed' }}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>;
}
