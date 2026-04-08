'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { use } from 'react';

const SPACE_LABELS: Record<string, string> = {
  'media-cube': 'Media Cube',
  'underscore-talent': 'Underscore Talent',
  'creator-services': 'Creator Services',
  'creator-services-project': 'Creator Services Project',
  'content-licensing': 'Content Licensing',
};

interface FileItem {
  name: string;
  path: string;
  title: string;
}

export default function SpacePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch(`/api/files?space=${slug}`)
      .then(r => r.json())
      .then(data => { setFiles(data); setLoading(false); });
  }, [slug]);

  const filtered = files.filter(f =>
    f.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Header */}
      <header style={{
        borderBottom: '1px solid var(--border)', padding: '0 40px',
        height: '60px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', background: 'var(--bg-2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={() => router.push('/')} style={{
            background: 'none', border: 'none', color: 'var(--text-muted)',
            cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px',
          }}>← Back</button>
          <span style={{ color: 'var(--border)' }}>|</span>
          <div style={{ width: '20px', height: '20px', background: 'var(--accent)', borderRadius: '4px' }} />
          <span style={{ fontWeight: '600', fontSize: '15px' }}>Creator Services KB</span>
        </div>
      </header>

      <main style={{ maxWidth: '900px', margin: '0 auto', padding: '48px 40px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '600', marginBottom: '6px' }}>
          {SPACE_LABELS[slug] || slug}
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '32px' }}>
          {loading ? 'Loading...' : `${files.length} documents`}
        </p>

        <input
          type="text"
          placeholder="Search documents..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%', padding: '10px 16px', marginBottom: '24px',
            background: 'var(--bg-2)', border: '1px solid var(--border)',
            borderRadius: '8px', color: 'var(--text)', fontSize: '14px', outline: 'none',
          }}
        />

        {loading ? (
          <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '60px' }}>
            Loading documents...
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '8px' }}>
            {filtered.map(file => (
              <button
                key={file.path}
                onClick={() => router.push(`/doc/${slug}/${encodeURIComponent(file.name)}`)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '16px 20px', background: 'var(--bg-2)',
                  border: '1px solid var(--border)', borderRadius: '8px',
                  cursor: 'pointer', textAlign: 'left', width: '100%',
                  transition: 'border-color 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '14px' }}>📄</span>
                  <span style={{ fontSize: '14px', fontWeight: '500' }}>{file.title}</span>
                </div>
                <span style={{ color: 'var(--text-muted)', fontSize: '18px' }}>→</span>
              </button>
            ))}
            {filtered.length === 0 && !loading && (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px' }}>
                No documents found.
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
