'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const SPACES = [
  { slug: 'creator-services', label: 'Creator Services' },
  { slug: 'underscore-talent', label: 'Underscore Talent' },
  { slug: 'media-cube', label: 'Media Cube' },
  { slug: 'content-licensing', label: 'Content Licensing' },
  { slug: 'creator-services-project', label: 'Creator Services Project' },
];

const LEVELS = ['open', 'team', 'limited', 'restricted', 'executive'];

interface PageNode { file: string; title: string; parent: string | null; }

function cleanTitle(t: string) { return t.replace(/^[^:]+:\s*/, '').trim(); }

export default function AdminPage() {
  const router = useRouter();
  const [access, setAccess] = useState<{spaces: Record<string, string>; docs: Record<string, string>}>({ spaces: {}, docs: {} });
  const [tree, setTree] = useState<Record<string, Record<string, PageNode>>>({});
  const [sessionLevel, setSessionLevel] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeSpace, setActiveSpace] = useState('creator-services');

  useEffect(() => {
    fetch('/api/access').then(r => r.json()).then(data => {
      if (data.sessionLevel !== 'admin') { router.push('/'); return; }
      setSessionLevel(data.sessionLevel);
      setAccess(data.access);
    });
    fetch('/api/tree?space=all').then(r => r.json()).then(setTree);
  }, []);

  const setSpaceLevel = (slug: string, level: string) => {
    setAccess(a => ({ ...a, spaces: { ...a.spaces, [slug]: level } }));
  };

  const setDocLevel = (file: string, level: string) => {
    setAccess(a => ({ ...a, docs: { ...a.docs, [file]: level } }));
  };

  const handleSave = async () => {
    setSaving(true);
    await fetch('/api/access', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(access),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const levelColor: Record<string, string> = {
    open: '#22c55e', team: '#3b82f6', limited: '#f59e0b', restricted: '#ef4444', executive: '#8b5cf6'
  };

  if (!sessionLevel) return <div style={{ padding: '40px', color: 'var(--text-muted)' }}>Checking access...</div>;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <header style={{ borderBottom: '1px solid var(--border)', padding: '0 40px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => router.push('/')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '13px' }}>← Home</button>
          <span style={{ color: 'var(--border)' }}>›</span>
          <span style={{ fontWeight: '600', fontSize: '14px' }}>Admin Panel</span>
        </div>
        <button onClick={handleSave} disabled={saving} style={{ padding: '7px 18px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
          {saving ? 'Saving...' : saved ? 'Saved ✓' : 'Save changes'}
        </button>
      </header>

      <main style={{ maxWidth: '900px', margin: '0 auto', padding: '40px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '8px' }}>Access Control</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '32px' }}>Set access levels per space and per document. Changes apply immediately after saving.</p>

        {/* Space access levels */}
        <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Spaces</h2>
        <div style={{ display: 'grid', gap: '8px', marginBottom: '40px' }}>
          {SPACES.map(space => (
            <div key={space.slug} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
              <span style={{ fontWeight: '500', fontSize: '14px' }}>{space.label}</span>
              <div style={{ display: 'flex', gap: '6px' }}>
                {LEVELS.map(level => (
                  <button key={level} onClick={() => setSpaceLevel(space.slug, level)}
                    style={{ padding: '4px 10px', borderRadius: '20px', border: '1px solid', fontSize: '11px', fontWeight: '600', cursor: 'pointer', textTransform: 'capitalize',
                      background: (access.spaces[space.slug] ?? 'open') === level ? levelColor[level] : 'transparent',
                      color: (access.spaces[space.slug] ?? 'open') === level ? '#fff' : 'var(--text-muted)',
                      borderColor: (access.spaces[space.slug] ?? 'open') === level ? levelColor[level] : 'var(--border)',
                    }}
                  >{level}</button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Document access levels */}
        <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>Documents</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '16px' }}>Override access for individual documents. Leave unset to inherit from space.</p>

        {/* Space tabs */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
          {SPACES.map(space => (
            <button key={space.slug} onClick={() => setActiveSpace(space.slug)}
              style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '12px', cursor: 'pointer', fontWeight: '500',
                background: activeSpace === space.slug ? 'var(--accent)' : 'var(--bg-2)',
                color: activeSpace === space.slug ? '#fff' : 'var(--text-muted)',
              }}
            >{space.label}</button>
          ))}
        </div>

        <div style={{ display: 'grid', gap: '6px' }}>
          {Object.values(tree[activeSpace] ?? {}).sort((a: PageNode, b: PageNode) => a.title.localeCompare(b.title)).map((page: PageNode) => (
            <div key={page.file} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: '6px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text)' }}>{cleanTitle(page.title)}</span>
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <button onClick={() => { const d = {...access.docs}; delete d[page.file]; setAccess(a => ({...a, docs: d})); }}
                  style={{ padding: '3px 8px', borderRadius: '20px', border: '1px solid var(--border)', fontSize: '10px', cursor: 'pointer', background: !access.docs[page.file] ? 'var(--bg-3)' : 'transparent', color: 'var(--text-muted)', marginRight: '4px' }}>
                  inherit
                </button>
                {LEVELS.map(level => (
                  <button key={level} onClick={() => setDocLevel(page.file, level)}
                    style={{ padding: '3px 8px', borderRadius: '20px', border: '1px solid', fontSize: '10px', fontWeight: '600', cursor: 'pointer', textTransform: 'capitalize',
                      background: access.docs[page.file] === level ? levelColor[level] : 'transparent',
                      color: access.docs[page.file] === level ? '#fff' : 'var(--text-muted)',
                      borderColor: access.docs[page.file] === level ? levelColor[level] : 'var(--border)',
                    }}
                  >{level}</button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
