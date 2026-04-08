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
      <header style={{ borderBottom: '1px solid var(--border)', padding: '0 40px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '24px', height: '24px', background: 'var(--accent)', borderRadius: '5px' }} />
          <span style={{ fontWeight: '600', fontSize: '15px' }}>Creator Services KB</span>
        </div>
        <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '13px', cursor: 'pointer' }}>Sign out</button>
      </header>
      <main style={{ maxWidth: '720px', margin: '0 auto', padding: '56px 40px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '4px' }}>Knowledge Base</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '40px', fontSize: '14px' }}>5 spaces</p>
        <div style={{ display: 'grid', gap: '2px' }}>
          {SPACES.map((space, i) => (
            <button key={space.slug} onClick={() => router.push('/space/' + space.slug)}
              style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 14px', background: 'var(--bg)', border: 'none', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'background 0.1s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--bg)'}
            >
              <span style={{ fontSize: '18px', width: '28px', textAlign: 'center' }}>{['📁','🎯','⚙️','🗂️','📄'][i]}</span>
              <div>
                <div style={{ fontWeight: '500', fontSize: '14px', marginBottom: '2px' }}>{space.label}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{space.description}</div>
              </div>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
