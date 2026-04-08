'use client';
import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';

const SPACE_LABELS: Record<string, string> = {
  'media-cube': 'Media Cube',
  'underscore-talent': 'Underscore Talent',
  'creator-services': 'Creator Services',
  'creator-services-project': 'Creator Services Project',
  'content-licensing': 'Content Licensing',
};

interface PageNode {
  file: string;
  title: string;
  parent: string | null;
  children?: PageNode[];
}

function cleanTitle(title: string): string {
  return title.replace(/^[^:]+:\s*/, '').trim();
}

function buildTree(pages: Record<string, PageNode>): PageNode[] {
  const nodes: Record<string, PageNode> = {};
  for (const key of Object.keys(pages)) {
    nodes[key] = { ...pages[key], children: [] };
  }
  const roots: PageNode[] = [];
  for (const node of Object.values(nodes)) {
    if (node.parent && node.parent in nodes) {
      nodes[node.parent].children!.push(node);
    } else {
      roots.push(node);
    }
  }
  const sort = (arr: PageNode[]) => {
    arr.sort((a, b) => a.title.localeCompare(b.title));
    arr.forEach(n => n.children && sort(n.children));
  };
  sort(roots);
  return roots;
}

function TreeNode({ node, slug, depth = 0, search }: { node: PageNode; slug: string; depth?: number; search: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(depth < 1);
  const has = node.children && node.children.length > 0;
  const title = cleanTitle(node.title);
  const matches = (n: PageNode): boolean =>
    cleanTitle(n.title).toLowerCase().includes(search.toLowerCase()) ||
    (n.children?.some(matches) ?? false);
  if (search && !matches(node)) return null;
  return (
    <div style={{ marginLeft: depth > 0 ? '24px' : '0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '1px 0' }}>
        {has ? (
          <button onClick={() => setOpen(!open)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', color: 'var(--text-muted)', fontSize: '13px', borderRadius: '4px', flexShrink: 0 }}>
            {open ? '▼' : '▶'}
          </button>
        ) : <span style={{ width: '28px', flexShrink: 0 }} />}
        <button
          onClick={() => has ? setOpen(!open) : router.push('/doc/' + slug + '/' + encodeURIComponent(node.file))}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', background: 'none', border: 'none', borderRadius: '6px', cursor: 'pointer', textAlign: 'left', flex: 1 }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-2)'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'none'}
        >
          <span style={{ fontSize: '14px' }}>{has ? (open ? '📂' : '📁') : '📄'}</span>
          <span style={{ fontSize: '13px', color: 'var(--text)', fontWeight: has ? '500' : '400' }}>{title}</span>
          {has && <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: 'auto', background: 'var(--bg-3)', padding: '1px 6px', borderRadius: '10px' }}>{node.children!.length}</span>}
        </button>
      </div>
      {has && open && (
        <div style={{ borderLeft: '2px solid var(--border)', marginLeft: '13px', paddingLeft: '6px' }}>
          {node.children!.map(child => <TreeNode key={child.file} node={child} slug={slug} depth={depth + 1} search={search} />)}
        </div>
      )}
    </div>
  );
}

export default function SpacePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const [tree, setTree] = useState<PageNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetch('/api/tree?space=' + slug)
      .then(r => r.json())
      .then(data => {
        setTree(buildTree(data));
        setTotal(Object.keys(data).length);
        setLoading(false);
      });
  }, [slug]);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <header style={{ borderBottom: '1px solid var(--border)', padding: '0 40px', height: '56px', display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--bg)' }}>
        <button onClick={() => router.push('/')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '13px' }}>← Home</button>
        <span style={{ color: 'var(--border)' }}>›</span>
        <span style={{ fontWeight: '600', fontSize: '14px' }}>{SPACE_LABELS[slug]}</span>
      </header>
      <main style={{ maxWidth: '720px', margin: '0 auto', padding: '48px 40px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: '700', marginBottom: '4px' }}>{SPACE_LABELS[slug]}</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '28px' }}>{loading ? 'Loading...' : total + ' documents'}</p>
        <input type="text" placeholder="Search documents..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', padding: '8px 14px', marginBottom: '20px', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text)', fontSize: '13px', outline: 'none' }}
        />
        {loading ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Loading documents...</p>
        ) : (
          <div>{tree.map(n => <TreeNode key={n.file} node={n} slug={slug} depth={0} search={search} />)}</div>
        )}
      </main>
    </div>
  );
}
