'use client';
import { useRouter } from 'next/navigation';

const SPACES = [
  { slug: 'media-cube', label: 'Media Cube', description: 'Partnership docs, workflows, and processes' },
  { slug: 'underscore-talent', label: 'Underscore Talent', description: 'Talent management and creator guides' },
  { slug: 'creator-services', label: 'Creator Services', description: 'Internal processes and team guidelines' },
  { slug: 'creator-services-project', label: 'Creator Services Project', description: 'Project documentation and planning' },
  { slug: 'content-licensing', label: 'Content Licensing', description: 'Licensing agreements and workflows' },
];

export default function Home() {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/auth', { method: 'DELETE' });
    router.push('/login');
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <header style={{
        borderBottom: '1px solid var(--border)',
        padding: '0 40px',
        height: '60px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--bg-2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '28px', height: '28px', background: 'var(--accent)', borderRadius: '6px' }} />
          <span style={{ fontWeight: '600', fontSize: '15px' }}>Creator Services KB</span>
        </div>
        <button onClick={handleLogout} style={{
          background: 'none', border: '1px solid var(--border)',
          color: 'var(--text-muted)', padding: '6px 14px',
          borderRadius: '6px', fontSize: '13px', cursor: 'pointer',
        }}>Sign out</button>
      </header>

      <main style={{ maxWidth: '900px', margin: '0 auto', padding: '60px 40px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '600', marginBottom: '8px' }}>Knowledge Base</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '48px', fontSize: '15px' }}>5 spaces · Select one to browse</p>
        <div style={{ display: 'grid', gap: '12px' }}>
          {SPACES.map((space, i) => (
            <button key={space.slug} onClick={() => router.push('/space/' + space.slug)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '24px 28px', background: 'var(--bg-2)', border: '1px solid var(--border)',
                borderRadius: '10px', cursor: 'pointer', textAlign: 'left',
                transition: 'border-color 0.15s, background 0.15s', width: '100%',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'var(--bg-3)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-2)'; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div style={{
                  width: '36px', height: '36px', background: 'var(--bg-3)',
                  border: '1px solid var(--border)', borderRadius: '8px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px',
                }}>{['📁','🎯','⚙️','🗂️','📄'][i]}</div>
                <div>
                  <div style={{ fontWeight: '600', fontSize: '15px', marginBottom: '4px' }}>{space.label}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{space.description}</div>
                </div>
              </div>
              <span style={{ color: 'var(--text-muted)', fontSize: '18px' }}>→</span>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
