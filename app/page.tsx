'use client';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

const SPACES = [
  { slug: 'creator-services', label: 'Creator Services', description: 'Internal processes and team guidelines', icon: '⚙️' },
  { slug: 'underscore-talent', label: 'Underscore Talent', description: 'Talent management and creator guides', icon: '🎯' },
  { slug: 'media-cube', label: 'Media Cube', description: 'Partnership docs, workflows, and processes', icon: '📁' },
  { slug: 'content-licensing', label: 'Content Licensing', description: 'Licensing agreements and workflows', icon: '📄' },
  { slug: 'creator-services-project', label: 'Creator Services Project', description: 'Project documentation and planning', icon: '🗂️' },
];

const SPACE_LABELS: Record<string, string> = Object.fromEntries(SPACES.map(s => [s.slug, s.label]));

interface DocResult { file: string; title: string; space: string; }

export default function Home() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [allDocs, setAllDocs] = useState<DocResult[]>([]);
  const [results, setResults] = useState<DocResult[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch('/api/tree?space=all').then(r => r.json()).then(data => {
      const docs: DocResult[] = [];
      for (const [space, pages] of Object.entries(data as Record<string, Record<string, {file: string; title: string}>>)) {
        for (const page of Object.values(pages)) docs.push({ file: page.file, title: page.title, space });
      }
      setAllDocs(docs);
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const q = query.toLowerCase();
    setResults(allDocs.filter(d => d.title.toLowerCase().includes(q)).slice(0, 20));
  }, [query, allDocs]);

  const handleLogout = async () => {
    await fetch('/api/auth', { method: 'DELETE' });
    router.push('/login');
  };

  const cleanTitle = (t: string) => t.replace(/^[^:]+:\s*/, '').trim();

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Header */}
      <header style={{ padding: '0 48px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '28px', height: '28px', background: 'var(--text)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '14px', height: '14px', background: 'var(--pink)', borderRadius: '3px' }} />
          </div>
          <span style={{ fontWeight: '800', fontSize: '15px', color: 'var(--text)', letterSpacing: '-0.3px' }}>Creator Services</span>
        </div>
        <button onClick={handleLogout} style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '13px', cursor: 'pointer', padding: '6px 16px', borderRadius: '20px' }}>Sign out</button>
      </header>

      {/* Hero */}
      <div style={{ position: 'relative', overflow: 'hidden', padding: '80px 48px 64px', maxWidth: '860px', margin: '0 auto' }}>
        {/* Blob decorations */}
        <div style={{ position: 'absolute', top: '20px', right: '-40px', width: '320px', height: '280px', background: 'linear-gradient(135deg, #a78bfa, #ec4899)', borderRadius: '60% 40% 70% 30% / 50% 60% 40% 50%', opacity: 0.15, pointerEvents: 'none', zIndex: 0 }} />
        <div style={{ position: 'absolute', bottom: '-20px', left: '20%', width: '200px', height: '180px', background: 'linear-gradient(135deg, #34d399, #06b6d4)', borderRadius: '40% 60% 30% 70% / 60% 40% 50% 50%', opacity: 0.15, pointerEvents: 'none', zIndex: 0 }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'var(--pink)', color: '#fff', fontSize: '11px', fontWeight: '700', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '5px 14px', borderRadius: '20px', marginBottom: '24px' }}>
            Knowledge Base
          </div>
          <h1 style={{ fontSize: '56px', fontWeight: '900', lineHeight: 1.0, letterSpacing: '-2px', marginBottom: '0', color: 'var(--text)', textTransform: 'uppercase' }}>
            CREATOR<br />
            <span style={{ color: 'var(--pink)' }}>SERVICES</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '15px', lineHeight: 1.6, marginTop: '16px', marginBottom: '32px', maxWidth: '480px' }}>
            Migrated from Confluence · Internal knowledge base for Creator Services teams
          </p>

          {/* Search */}
          <div style={{ position: 'relative', maxWidth: '520px' }}>
            <input
              type="text"
              placeholder={loaded ? 'Search across all 3,000+ documents...' : 'Loading...'}
              value={query}
              onChange={e => setQuery(e.target.value)}
              disabled={!loaded}
              style={{ width: '100%', padding: '14px 20px', background: '#fff', border: '2px solid var(--text)', borderRadius: '12px', color: 'var(--text)', fontSize: '14px', outline: 'none', fontWeight: '500' }}
              onFocus={e => e.currentTarget.style.borderColor = 'var(--pink)'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--text)'}
            />
            {query && results.length > 0 && (
              <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, background: '#fff', border: '2px solid var(--text)', borderRadius: '12px', overflow: 'hidden', zIndex: 50, boxShadow: '4px 4px 0 var(--text)' }}>
                {results.map((r, i) => (
                  <button key={i} onClick={() => router.push('/doc/' + r.space + '/' + encodeURIComponent(r.file))}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '10px 16px', background: 'none', border: 'none', borderBottom: i < results.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer', textAlign: 'left' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-3)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    <span style={{ fontSize: '13px', color: 'var(--text)', fontWeight: '500' }}>{cleanTitle(r.title)}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '12px', whiteSpace: 'nowrap' }}>{SPACE_LABELS[r.space]}</span>
                  </button>
                ))}
              </div>
            )}
            {query && results.length === 0 && loaded && (
              <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, background: '#fff', border: '2px solid var(--text)', borderRadius: '12px', padding: '12px 16px', fontSize: '13px', color: 'var(--text-muted)', zIndex: 50 }}>
                No documents found.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Spaces */}
      <main style={{ maxWidth: '860px', margin: '0 auto', padding: '0 48px 80px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
          {SPACES.map((space, i) => (
            <button
              key={space.slug}
              onClick={() => router.push('/space/' + space.slug)}
              style={{
                
                display: 'flex', alignItems: 'center', gap: '16px',
                padding: '20px 24px', background: '#fff',
                border: '1px solid var(--border)', borderRadius: '10px',
                cursor: 'pointer', textAlign: 'left', width: '100%',
                transition: 'all 0.15s', boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--text)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'var(--bg-3)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
                {space.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '800', fontSize: '15px', marginBottom: '2px', color: 'var(--text)' }}>{space.label}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{space.description}</div>
              </div>
              <span style={{ fontSize: '18px', color: 'var(--text-muted)' }}>→</span>
            </button>
          ))}
        </div>

        <div style={{ marginTop: '48px', paddingTop: '24px', borderTop: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '12px', display: 'flex', justifyContent: 'space-between' }}>
          <span>Previously on Confluence · Migrated March 2026</span>
          <span>5 spaces · 3,000+ docs</span>
        </div>
      </main>
    </div>
  );
}
