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

function buildTree(pages: Record<string, PageNode>): PageNode[] {
  const nodes: Record<string, PageNode> = {};
  for (const key of Object.keys(pages)) {
    nodes[key] = { ...pages[key], children: [] };
  }
  const roots: PageNode[] = [];
  for (const node of Object.values(nodes)) {
    const parentExists = node.parent !== null && node.parent in nodes;
    if (parentExists) {
      nodes[node.parent!].children!.push(node);
    } else {
      roots.push(node);
    }
  }
  const sortNodes = (arr: PageNode[]) => {
    arr.sort((a, b) => a.title.localeCompare(b.title));
    arr.forEach(n => n.children && sortNodes(n.children));
  };
  sortNodes(roots);
  return roots;
}

function TreeNode({ node, slug, depth = 0, search }: { node: PageNode; slug: string; depth?: number; search: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(depth < 1);
  const hasChildren = node.children && node.children.length > 0;

  const matchesSearch = (n: PageNode): boolean => {
    if (n.title.toLowerCase().includes(search.toLowerCase())) return true;
    return n.children?.some(matchesSearch) || false;
  };

  if (search && !matchesSearch(node)) return null;

  return (
    <div style={{ marginLeft: depth > 0 ? '20px' : '0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        {hasChildren ? (
          <button onClick={() => setOpen(!open)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', color: 'var(--text-muted)', fontSize: '11px', width: '16px', flexShrink: 0 }}>
            {open ? '▾' : '▸'}
          </button>
        ) : (
          <span style={{ width: '16px', flexShrink: 0 }} />
        )}
        <button
          onClick={() => router.push(`/doc/${slug}/${encodeURIComponent(node.file)}`)}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 8px', background: 'none', border: 'none', borderRadius: '6px', cursor: 'pointer', textAlign: 'left', flex: 1, transition: 'background 0.1s' }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-2)'}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}
        >
          <span style={{ fontSize: '13px' }}>{hasChildren ? '📂' : '📄'}</span>
          <span style={{ fontSize: '13px', color: 'var(--text)', fontWeight: hasChildren ? '500' : '400' }}>{node.title}</span>
          {hasChildren && <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: 'auto' }}>{node.children!.length}</span>}
        </button>
      </div>
      {hasChildren && open && (
        <div style={{ borderLeft: '1px solid var(--border)', marginLeft: '7px', paddingLeft: '4px' }}>
          {node.children!.map(child => (
            <TreeNode key={child.file} node={child} slug={slug} depth={depth + 1} search={search} />
          ))}
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
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    fetch(`/api/tree?space=${slug}`)
      .then(r => r.json())
      .then(data => {
        const nodes = buildTree(data);
        setTree(nodes);
        setTotalCount(Object.keys(data).length);
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
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '28px' }}>
          {loading ? 'Loading...' : `${totalCount} documents`}
        </p>

        <input
          type="text"
          placeholder="Search documents..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', padding: '8px 14px', marginBottom: '20px', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text)', fontSize: '13px', outline: 'none' }}
        />

        {loading ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Loading documents...</p>
        ) : (
          <div>
            {tree.map(node => (
              <TreeNode key={node.file} node={node} slug={slug} depth={0} search={search} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
