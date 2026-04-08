'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface SearchResult {
  title: string;
  path: string;
  space: string;
  spaceLabel: string;
  reason: string;
}

export default function SearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(false);
    setError('');
    setResults([]);

    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      setResults(data.results || []);
      setSearched(true);
    } catch {
      setError('Search failed. Try again.');
    }
    setLoading(false);
  };

  const getFileName = (path: string) => path.split('/').pop() || '';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Header */}
      <header style={{
        borderBottom: '1px solid var(--border)', padding: '0 40px',
        height: '60px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', background: 'var(--bg-2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => router.push('/')} style={{
            background: 'none', border: 'none', color: 'var(--text-muted)',
            cursor: 'pointer', fontSize: '13px',
          }}>← Home</button>
          <span style={{ color: 'var(--border)' }}>|</span>
          <div style={{ width: '20px', height: '20px', background: 'var(--accent)', borderRadius: '4px' }} />
          <span style={{ fontWeight: '600', fontSize: '15px' }}>AI Search</span>
        </div>
      </header>

      <main style={{ maxWidth: '800px', margin: '0 auto', padding: '60px 40px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '600', marginBottom: '8px' }}>Find anything</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '36px' }}>
          Describe what you're looking for in plain language. AI will search across all documents.
        </p>

        {/* Search input */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '40px' }}>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder='e.g. "everything OTT related" or "onboarding process for new creators"'
            autoFocus
            style={{
              flex: 1, padding: '12px 16px',
              background: 'var(--bg-2)', border: '1px solid var(--border)',
              borderRadius: '8px', color: 'var(--text)', fontSize: '14px', outline: 'none',
            }}
          />
          <button
            onClick={handleSearch}
            disabled={loading || !query.trim()}
            style={{
              padding: '12px 24px',
              background: query.trim() ? 'var(--accent)' : 'var(--bg-3)',
              color: query.trim() ? '#0f0f0f' : 'var(--text-muted)',
              border: 'none', borderRadius: '8px', fontSize: '14px',
              fontWeight: '600', cursor: query.trim() ? 'pointer' : 'not-allowed',
              whiteSpace: 'nowrap',
            }}
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            <div style={{ marginBottom: '12px', fontSize: '24px' }}>🔍</div>
            Reading through documents...
          </div>
        )}

        {/* Error */}
        {error && <p style={{ color: 'var(--danger)', marginBottom: '20px' }}>{error}</p>}

        {/* Results */}
        {searched && !loading && (
          <>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '16px' }}>
              {results.length === 0 ? 'No matching documents found.' : `${results.length} document${results.length === 1 ? '' : 's'} found`}
            </p>
            <div style={{ display: 'grid', gap: '10px' }}>
              {results.map((result, i) => (
                <button
                  key={i}
                  onClick={() => router.push(`/doc/${result.space}/${encodeURIComponent(getFileName(result.path))}`)}
                  style={{
                    display: 'block', textAlign: 'left', width: '100%',
                    padding: '20px 24px', background: 'var(--bg-2)',
                    border: '1px solid var(--border)', borderRadius: '10px',
                    cursor: 'pointer', transition: 'border-color 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <span style={{ fontWeight: '600', fontSize: '15px' }}>{result.title}</span>
                    <span style={{
                      fontSize: '11px', padding: '3px 8px',
                      background: 'var(--bg-3)', border: '1px solid var(--border)',
                      borderRadius: '4px', color: 'var(--text-muted)', whiteSpace: 'nowrap', marginLeft: '12px',
                    }}>{result.spaceLabel}</span>
                  </div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>{result.reason}</p>
                </button>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
