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

interface DocResult {
  file: string;
  title: string;
  space: string;
}

export default function Home() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [allDocs, setAllDocs] = useState<DocResult[]>([]);
  const [results, setResults] = useState<DocResult[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch('/api/tree?space=all')
      .then(r => r.json())
      .then(data => {
        const docs: DocResult[] = [];
        for (const [space, pages] of Object.entries(data as Record<string, Record<string, {file: string; title: string}>>)) {
          for (const page of Object.values(pages)) {
            docs.push({ file: page.file, title: page.title, space });
          }
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
      <header style={{ borderBottom: '1px solid var(--border)', padding: '0 48px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '26px', height: '26px', background: 'var(--accent)', borderRadius: '4px' }} />
          <span style={{ fontWeight: '700', fontSize: '13px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text)' }}>Creator Services</span>
        </div>
        <button onClick={handleLogout} style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '12px', cursor: 'pointer', padding: '6px 14px', borderRadius: '4px' }}>Sign out</button>
      </header>

      <main style={{ maxWidth: '760px', margin: '0 auto', padding: '72px 48px 80px' }}>
        <div style={{ marginBottom: '48px' }}>
          <div style={{ display: 'inline-block', background: 'var(--accent)', border: 'none', color: '#ffffff', fontSize: '11px', fontWeight: '600', letterSpacing: '0.12em', textTransform: 'uppercase', padding: '4px 12px', borderRadius: '4px', marginBottom: '20px' }}>
            Knowledge Base
          </div>
          <h1 style={{ fontSize: '44px', fontWeight: '700', lineHeight: 1.1, letterSpacing: '-0.5px', marginBottom: '12px' }}>
            Creator Services<br />
            <span style={{ color: 'var(--accent)' }}>Documentation</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: 1.6, marginBottom: '28px' }}>
            Migrated from Confluence · Internal knowledge base for Creator Services
          </p>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder={loaded ? 'Search across all 3,000+ documents...' : 'Loading index...'}
              value={query}
              onChange={e => setQuery(e.target.value)}
              disabled={!loaded}
              style={{ width: '100%', padding: '12px 16px', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text)', fontSize: '14px', outline: 'none' }}
              onFocus={e => e.currentTarget.style.borderColor = 'var(--accent)'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
            />
            {query && results.length > 0 && (
              <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden', zIndex: 50, boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
                {results.map((r, i) => (
                  <button key={i} onClick={() => router.push('/doc/' + r.space + '/' + encodeURIComponent(r.file))}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '10px 16px', background: 'none', border: 'none', borderBottom: i < results.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer', textAlign: 'left' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-3)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    <span style={{ fontSize: '13px', color: 'var(--text)' }}>{cleanTitle(r.title)}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '12px', whiteSpace: 'nowrap' }}>{SPACE_LABELS[r.space]}</span>
                  </button>
                ))}
              </div>
            )}
            {query && results.length === 0 && loaded && (
              <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px 16px', fontSize: '13px', color: 'var(--text-muted)', zIndex: 50 }}>
                No documents found.
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gap: '8px' }}>
          {SPACES.map((space, i) => (
            <button key={space.slug} onClick={() => router.push('/space/' + space.slug)}
              style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '18px 24px', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'var(--bg-3)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-2)'; }}
            >
              <div style={{ width: '36px', height: '36px', borderRadius: '6px', background: 'var(--bg-3)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>{space.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '600', fontSize: '15px', marginBottom: '2px' }}>{space.label}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{space.description}</div>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>0{i+1}</div>
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
