'use client';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

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
      setError('Wrong password. Try again.');
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '400px',
        padding: '48px',
        background: 'var(--bg-2)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
      }}>
        <div style={{ marginBottom: '32px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            background: 'var(--accent)',
            borderRadius: '8px',
            marginBottom: '24px',
          }} />
          <h1 style={{ fontSize: '22px', fontWeight: '600', color: 'var(--text)', marginBottom: '8px' }}>
            Creator Services KB
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
            Internal use only. Enter password to continue.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoFocus
            style={{
              width: '100%',
              padding: '12px 16px',
              background: 'var(--bg-3)',
              border: `1px solid ${error ? 'var(--danger)' : 'var(--border)'}`,
              borderRadius: '8px',
              color: 'var(--text)',
              fontSize: '14px',
              outline: 'none',
              marginBottom: '12px',
            }}
          />
          {error && (
            <p style={{ color: 'var(--danger)', fontSize: '13px', marginBottom: '12px' }}>{error}</p>
          )}
          <button
            type="submit"
            disabled={loading || !password}
            style={{
              width: '100%',
              padding: '12px',
              background: password ? 'var(--accent)' : 'var(--bg-3)',
              color: password ? '#0f0f0f' : 'var(--text-muted)',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: password ? 'pointer' : 'not-allowed',
              transition: 'all 0.15s',
            }}
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
