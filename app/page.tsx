'use client';
import { useRouter } from 'next/navigation';

const SPACES = [
  { slug: 'creator-services', label: 'Creator Services', description: 'Internal processes and team guidelines', icon: '⚙️' },
  { slug: 'underscore-talent', label: 'Underscore Talent', description: 'Talent management and creator guides', icon: '🎯' },
  { slug: 'media-cube', label: 'Media Cube', description: 'Partnership docs, workflows, and processes', icon: '📁' },
  { slug: 'content-licensing', label: 'Content Licensing', description: 'Licensing agreements and workflows', icon: '📄' },
  { slug: 'creator-services-project', label: 'Creator Services Project', description: 'Project documentation and planning', icon: '🗂️' },
];

export default function Home() {
  const router = useRouter();
  const handleLogout = async () => {
    await fetch('/api/auth', { method: 'DELETE' });
    router.push('/login');
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Header */}
      <header style={{ borderBottom: '1px solid var(--border)', padding: '0 48px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg)', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '26px', height: '26px', background: 'var(--accent)', borderRadius: '6px' }} />
          <span style={{ fontWeight: '600', fontSize: '15px', color: 'var(--text)' }}>Creator Services KB</span>
        </div>
        <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '13px', cursor: 'pointer' }}>Sign out</button>
      </header>

      {/* Hero with texture */}
      <div style={{ position: 'relative', overflow: 'hidden', borderBottom: '1px solid var(--border)', padding: '64px 48px 56px', background: 'linear-gradient(135deg, #e8f4ff 0%, #f8f8f8 50%, #f0ebff 100%)' }}>
        {/* Decorative circles */}
        <div style={{ position: 'absolute', top: '-60px', right: '-60px', width: '280px', height: '280px', borderRadius: '50%', background: 'rgba(35,131,226,0.08)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-80px', left: '30%', width: '200px', height: '200px', borderRadius: '50%', background: 'rgba(120,80,220,0.06)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '20px', left: '60%', width: '120px', height: '120px', borderRadius: '50%', background: 'rgba(35,131,226,0.05)', pointerEvents: 'none' }} />
        {/* Grid dots */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, rgba(35,131,226,0.12) 1px, transparent 1px)', backgroundSize: '28px 28px', pointerEvents: 'none', opacity: 0.6 }} />

        <div style={{ position: 'relative', maxWidth: '720px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ width: '4px', height: '36px', background: 'var(--accent)', borderRadius: '2px' }} />
            <h1 style={{ fontSize: '38px', fontWeight: '700', color: 'var(--text)', letterSpacing: '-0.5px', lineHeight: 1.1 }}>Knowledge Base</h1>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '15px', marginLeft: '16px' }}>5 spaces · Creator Services internal docs</p>
        </div>
      </div>

      {/* Spaces */}
      <main style={{ maxWidth: '720px', margin: '0 auto', padding: '40px 48px' }}>
        <div style={{ display: 'grid', gap: '10px' }}>
          {SPACES.map((space) => (
            <button
              key={space.slug}
              onClick={() => router.push('/space/' + space.slug)}
              style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '20px 24px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px', cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'all 0.15s', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(35,131,226,0.12)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'var(--bg-2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>
                {space.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '600', fontSize: '16px', marginBottom: '3px', color: 'var(--text)' }}>{space.label}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{space.description}</div>
              </div>
              <span style={{ color: 'var(--text-muted)', fontSize: '18px', flexShrink: 0 }}>→</span>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
