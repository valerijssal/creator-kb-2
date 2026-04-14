'use client';
import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

const RichEditor = dynamic(() => import('@/components/RichEditor'), { ssr: false });

const SPACE_LABELS: Record<string, string> = {
  'media-cube': 'Media Cube',
  'underscore-talent': 'Underscore Talent',
  'creator-services': 'Creator Services',
  'creator-services-project': 'Creator Services Project',
  'content-licensing': 'Content Licensing',
};

const ALL_SPACES = Object.keys(SPACE_LABELS);

function extractBodyContent(html: string): string {
  const bodyMatch = html.match(/<div id="main-content"[^>]*>([\s\S]*?)<\/div>\s*(?=<div class="pageSection|<\/div>\s*<\/div>\s*<div id="footer")/);
  if (bodyMatch) return bodyMatch[1];
  const body = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  return body ? body[1] : html;
}

function fileNameToTitle(fileName: string): string {
  return fileName.replace(/\.html$/, '').replace(/_\d+$/, '').replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).trim();
}

function getFilePath(space: string, fileName: string): string {
  const spaceMap: Record<string, string> = {
    'media-cube': 'Confluence Export - MediaCube',
    'underscore-talent': 'Confluence Export - Underscore Talent',
    'creator-services': 'Confluence Export - Creator Services (main)',
    'creator-services-project': 'Confluence Export - Creator Services Project',
    'content-licensing': 'Confluence Export - Content Licensing',
  };
  return `${spaceMap[space]}/${fileName}`;
}

export default function DocPage({ params }: { params: Promise<{ space: string; file: string }> }) {
  const { space, file } = use(params);
  const router = useRouter();
  const fileName = decodeURIComponent(file);
  const [title, setTitle] = useState(fileNameToTitle(fileName));
  const [content, setContent] = useState('');
  const [sha, setSha] = useState('');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [moveTarget, setMoveTarget] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [actionMsg, setActionMsg] = useState('');
  const [sidebarTree, setSidebarTree] = useState<Record<string, {file: string; title: string; parent: string | null}>>({});
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [isStandalonePage, setIsStandalonePage] = useState(false);

  useEffect(() => {
    fetch(`/api/files?path=${encodeURIComponent(getFilePath(space, fileName))}`)
      .then(r => r.json())
      .then(data => {
        let raw = data.content || '';
        // Detect escaped HTML stored inside <pre><code> blocks
        const escapedMatch = raw.match(/<pre><code>(&lt;!DOCTYPE[\s\S]*?)<\/code><\/pre>/i);
        if (escapedMatch) {
          const unescaped = escapedMatch[1]
            .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
          raw = unescaped;
        }
        setContent(raw);
        setIsStandalonePage(raw.includes('<!DOCTYPE') && raw.includes('<style>'));
        setSha(data.sha || '');
        setEditContent(extractBodyContent(data.content || ''));
        setLoading(false);
        fetch(`/api/tree?space=${space}`)
          .then(r => r.json())
          .then((tree: Record<string, {title: string; parent: string | null}>) => {
            if (tree[fileName]) setTitle(tree[fileName].title);
            setSidebarTree(tree);
            // Auto-expand ancestors of current file
            const expanded = new Set<string>();
            let current = tree[fileName]?.parent;
            while (current && tree[current]) {
              expanded.add(current);
              current = tree[current].parent;
            }
            setExpandedNodes(expanded);
          });
      });
  }, [space, fileName]);

  const handleSave = async () => {
    setSaving(true);
    const fullHtml = `<!DOCTYPE html><html><head><title>${title}</title></head><body>${editContent}</body></html>`;
    const res = await fetch('/api/files', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: getFilePath(space, fileName), content: fullHtml, sha }),
    });
    if (res.ok) {
      const updated = await fetch(`/api/files?path=${encodeURIComponent(getFilePath(space, fileName))}`).then(r => r.json());
      setSha(updated.sha);
      setContent(fullHtml);
      setEditing(false);
      setActionMsg('Saved.');
      setTimeout(() => setActionMsg(''), 3000);
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    const res = await fetch('/api/files', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: getFilePath(space, fileName), sha }) });
    if (res.ok) router.push(`/space/${space}`);
  };

  const handleMove = async () => {
    if (!moveTarget) return;
    const res = await fetch('/api/files', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ oldPath: getFilePath(space, fileName), newSpaceSlug: moveTarget, sha, fileName }) });
    if (res.ok) router.push(`/space/${moveTarget}`);
  };


  const bodyContent = extractBodyContent(content);

  // Build tree structure for sidebar
  const rootNodes = Object.values(sidebarTree).filter(p => !p.parent || !sidebarTree[p.parent]);
  const getChildren = (file: string) => Object.values(sidebarTree).filter(p => p.parent === file);

  const toggleNode = (file: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(file)) next.delete(file);
      else next.add(file);
      return next;
    });
  };

  const renderTree = (nodes: {file: string; title: string; parent: string | null}[], depth: number): React.ReactNode => {
    return nodes.map(node => {
      const children = getChildren(node.file);
      const isExpanded = expandedNodes.has(node.file);
      const isCurrent = node.file === fileName;
      return (
        <div key={node.file}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', paddingLeft: `${depth * 14}px` }}>
            {children.length > 0 && (
              <button onClick={() => toggleNode(node.file)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '10px', padding: '0 2px', flexShrink: 0 }}>
                {isExpanded ? '▾' : '▸'}
              </button>
            )}
            {children.length === 0 && <span style={{ width: '14px', flexShrink: 0 }} />}
            <button
              onClick={() => router.push(`/doc/${space}/${encodeURIComponent(node.file)}`)}
              style={{ background: isCurrent ? 'var(--accent-light)' : 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: '4px 8px', borderRadius: '4px', fontSize: '13px', color: isCurrent ? 'var(--accent)' : 'var(--text)', fontWeight: isCurrent ? '600' : '400', width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            >
              {node.title}
            </button>
          </div>
          {isExpanded && children.length > 0 && renderTree(children, depth + 1)}
        </div>
      );
    });
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <header style={{ borderBottom: '1px solid var(--border)', padding: '0 40px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg)', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-muted)', overflow: 'hidden' }}>
          <button onClick={() => router.push('/')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' }}>Home</button>
          <span>›</span>
          <button onClick={() => router.push(`/space/${space}`)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' }}>{SPACE_LABELS[space]}</button>
          <span>›</span>
          <span style={{ color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</span>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexShrink: 0, alignItems: 'center' }}>
          {actionMsg && <span style={{ color: 'var(--accent)', fontSize: '13px' }}>{actionMsg}</span>}
          {!editing ? (
            <>
              <button onClick={() => setEditing(true)} style={{ padding: '5px 14px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>Edit</button>
              <button onClick={() => setShowMoveModal(true)} style={{ padding: '5px 12px', background: 'none', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>Move</button>
              <button onClick={() => setShowDeleteConfirm(true)} style={{ padding: '5px 12px', background: 'none', color: 'var(--danger)', border: '1px solid var(--danger)', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>Delete</button>
            </>
          ) : (
            <>
              <button onClick={handleSave} disabled={saving} style={{ padding: '5px 14px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>{saving ? 'Saving...' : 'Save'}</button>
              <button onClick={() => { setEditing(false); setEditContent(extractBodyContent(content)); }} style={{ padding: '5px 12px', background: 'none', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
            </>
          )}
        </div>
      </header>

      <div style={{ display: 'flex', flex: 1, maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
        {/* Sidebar */}
        <aside style={{ width: '260px', flexShrink: 0, borderRight: '1px solid var(--border)', padding: '24px 0', overflowY: 'auto', maxHeight: 'calc(100vh - 56px)', position: 'sticky', top: '56px' }}>
          <div style={{ padding: '0 16px 12px', fontSize: '11px', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            {SPACE_LABELS[space]}
          </div>
          <div style={{ padding: '0 8px' }}>
            {rootNodes.length > 0 ? renderTree(rootNodes, 0) : <div style={{ padding: '8px 16px', fontSize: '13px', color: 'var(--text-muted)' }}>Loading...</div>}
          </div>
        </aside>
        {/* Main content */}
        <main style={{ flex: 1, padding: '48px 48px', minWidth: 0 }}>
        <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '28px', color: 'var(--text)' }}>{title}</h1>
        {loading ? (
          <p style={{ color: 'var(--text-muted)' }}>Loading...</p>
        ) : editing ? (
          <RichEditor content={editContent} onChange={setEditContent} />
        ) : isStandalonePage ? (
          <iframe srcDoc={content} style={{ width: '100%', height: '80vh', border: 'none', borderRadius: '8px' }} />
        ) : (
          <div className="doc-content" dangerouslySetInnerHTML={{ __html: bodyContent }} />
        )}
        </main>
      </div>

      {showMoveModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '12px', padding: '28px', width: '400px', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
            <h3 style={{ marginBottom: '16px', fontSize: '15px', fontWeight: '600' }}>Move to another space</h3>
            <select value={moveTarget} onChange={e => setMoveTarget(e.target.value)} style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', fontSize: '13px', marginBottom: '16px' }}>
              <option value="">Select space...</option>
              {ALL_SPACES.filter(s => s !== space).map(s => <option key={s} value={s}>{SPACE_LABELS[s]}</option>)}
            </select>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowMoveModal(false)} style={{ padding: '7px 14px', background: 'none', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
              <button onClick={handleMove} disabled={!moveTarget} style={{ padding: '7px 14px', background: 'var(--accent)', border: 'none', borderRadius: '6px', color: '#fff', fontWeight: '500', cursor: moveTarget ? 'pointer' : 'not-allowed', fontSize: '13px' }}>Move</button>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '12px', padding: '28px', width: '360px', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
            <h3 style={{ marginBottom: '8px', fontSize: '15px', fontWeight: '600' }}>Delete this document?</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '20px' }}>This cannot be undone.</p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowDeleteConfirm(false)} style={{ padding: '7px 14px', background: 'none', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
              <button onClick={handleDelete} style={{ padding: '7px 14px', background: 'var(--danger)', border: 'none', borderRadius: '6px', color: '#fff', fontWeight: '500', cursor: 'pointer', fontSize: '13px' }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      <style>{`

        /* === REPLACED BELOW === */
        .doc-content { line-height: 1.7; font-size: 15px; color: var(--text); }
        .doc-content h1 { font-size: 22px; font-weight: 700; margin: 28px 0 12px; }
        .doc-content h2 { font-size: 18px; font-weight: 600; margin: 24px 0 10px; border-bottom: 1px solid var(--border); padding-bottom: 6px; }
        .doc-content h3 { font-size: 15px; font-weight: 600; margin: 18px 0 8px; }
        .doc-content p { margin-bottom: 12px; }
        .doc-content ul, .doc-content ol { margin: 10px 0 14px 22px; }
        .doc-content li { margin-bottom: 4px; }
        .doc-content a { color: var(--accent); text-decoration: none; }
        .doc-content a:hover { text-decoration: underline; }
        .doc-content strong { font-weight: 600; }
        .doc-content code { background: var(--bg-3); padding: 2px 6px; border-radius: 4px; font-size: 13px; font-family: monospace; }
        .doc-content table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px; }
        .doc-content th, .doc-content td { border: 1px solid var(--border); padding: 8px 12px; text-align: left; }
        .doc-content th { background: var(--bg-2); font-weight: 600; }
        .doc-content img { max-width: 100%; height: auto; border-radius: 6px; margin: 12px 0; }

        /* Confluence panels */
        .doc-content .panel { border-radius: 6px; margin: 14px 0; overflow: hidden; border: 1px solid var(--border); }
        .doc-content .panelHeader { padding: 8px 12px; font-weight: 600; font-size: 13px; background: var(--bg-3); }
        .doc-content .panelContent { padding: 12px 16px; background: var(--bg-2); }

        /* Confluence info/note/warning/tip macros */
        .doc-content .confluence-information-macro { display: flex; gap: 12px; border-radius: 6px; padding: 12px 16px; margin: 14px 0; border-left: 4px solid #0052cc; background: #e9f0ff; }
        .doc-content .confluence-information-macro-note { border-left-color: #ff991f; background: #fff7e6; }
        .doc-content .confluence-information-macro-warning { border-left-color: #de350b; background: #ffebe6; }
        .doc-content .confluence-information-macro-tip { border-left-color: #00875a; background: #e3fcef; }
        .doc-content .confluence-information-macro-body { font-size: 14px; color: var(--text); }
        .doc-content .confluence-information-macro-icon { display: none; }

        /* Confluence status macro */
        .doc-content .status-macro { display: inline-block; padding: 2px 8px; border-radius: 3px; font-size: 11px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; }
        .doc-content .status-macro[data-status-color="green"], .doc-content .status-macro[colour="Green"] { background: #e3fcef; color: #006644; }
        .doc-content .status-macro[data-status-color="yellow"], .doc-content .status-macro[colour="Yellow"] { background: #fff7e6; color: #974f0c; }
        .doc-content .status-macro[data-status-color="red"], .doc-content .status-macro[colour="Red"] { background: #ffebe6; color: #bf2600; }
        .doc-content .status-macro[data-status-color="blue"], .doc-content .status-macro[colour="Blue"] { background: #e9f0ff; color: #0052cc; }
        .doc-content .status-macro[data-status-color="grey"], .doc-content .status-macro[colour="Grey"] { background: #f4f5f7; color: #5e6c84; }
        .doc-content .status-macro[data-status-color="purple"], .doc-content .status-macro[colour="Purple"] { background: #eae6ff; color: #403294; }

        /* Confluence expand macro */
        .doc-content .expand-container { border: 1px solid var(--border); border-radius: 6px; margin: 12px 0; overflow: hidden; }
        .doc-content .expand-control { padding: 8px 14px; background: var(--bg-2); cursor: pointer; font-size: 13px; font-weight: 500; color: var(--accent); }
        .doc-content .expand-content { padding: 12px 16px; }

        /* Confluence task list */
        .doc-content .task-list { list-style: none; margin-left: 0; padding-left: 0; }
        .doc-content .task-list li { display: flex; align-items: flex-start; gap: 8px; margin-bottom: 6px; }

        /* Hide Confluence chrome */
        .doc-content #breadcrumb-section, .doc-content #title-heading, .doc-content .page-metadata, .doc-content .pageSection { display: none; }
        .doc-content .aui-nav, .doc-content #footer, .doc-content .page-metadata-modification-info { display: none; }
        .doc-content .aui-nav, .doc-content #footer, .doc-content .page-metadata-modification-info { display: none; }
        .doc-content { line-height: 1.7; font-size: 15px; color: var(--text); }
        .doc-content h1 { font-size: 22px; font-weight: 700; margin: 28px 0 12px; }
        .doc-content h2 { font-size: 18px; font-weight: 600; margin: 24px 0 10px; border-bottom: 1px solid var(--border); padding-bottom: 6px; }
        .doc-content h3 { font-size: 15px; font-weight: 600; margin: 18px 0 8px; }
        .doc-content p { margin-bottom: 12px; }
        .doc-content ul, .doc-content ol { margin: 10px 0 14px 22px; }
        .doc-content li { margin-bottom: 4px; }
        .doc-content a { color: var(--accent); text-decoration: none; }
        .doc-content a:hover { text-decoration: underline; }
        .doc-content strong { font-weight: 600; }
        .doc-content code { background: var(--bg-3); padding: 2px 6px; border-radius: 4px; font-size: 13px; font-family: monospace; }
        .doc-content table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px; }
        .doc-content th, .doc-content td { border: 1px solid var(--border); padding: 8px 12px; text-align: left; }
        .doc-content th { background: var(--bg-2); font-weight: 600; }
        .doc-content img { max-width: 100%; height: auto; border-radius: 6px; margin: 12px 0; }

        /* Confluence panels */
        .doc-content .panel { border-radius: 6px; margin: 14px 0; overflow: hidden; border: 1px solid var(--border); }
        .doc-content .panelHeader { padding: 8px 12px; font-weight: 600; font-size: 13px; background: var(--bg-3); }
        .doc-content .panelContent { padding: 12px 16px; background: var(--bg-2); }

        /* Confluence info/note/warning/tip macros */
        .doc-content .confluence-information-macro { display: flex; gap: 12px; border-radius: 6px; padding: 12px 16px; margin: 14px 0; border-left: 4px solid #0052cc; background: #e9f0ff; }
        .doc-content .confluence-information-macro-note { border-left-color: #ff991f; background: #fff7e6; }
        .doc-content .confluence-information-macro-warning { border-left-color: #de350b; background: #ffebe6; }
        .doc-content .confluence-information-macro-tip { border-left-color: #00875a; background: #e3fcef; }
        .doc-content .confluence-information-macro-body { font-size: 14px; color: var(--text); }
        .doc-content .confluence-information-macro-icon { display: none; }

        /* Confluence status macro */
        .doc-content .status-macro { display: inline-block; padding: 2px 8px; border-radius: 3px; font-size: 11px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; }
        .doc-content .status-macro[data-status-color="green"], .doc-content .status-macro[colour="Green"] { background: #e3fcef; color: #006644; }
        .doc-content .status-macro[data-status-color="yellow"], .doc-content .status-macro[colour="Yellow"] { background: #fff7e6; color: #974f0c; }
        .doc-content .status-macro[data-status-color="red"], .doc-content .status-macro[colour="Red"] { background: #ffebe6; color: #bf2600; }
        .doc-content .status-macro[data-status-color="blue"], .doc-content .status-macro[colour="Blue"] { background: #e9f0ff; color: #0052cc; }
        .doc-content .status-macro[data-status-color="grey"], .doc-content .status-macro[colour="Grey"] { background: #f4f5f7; color: #5e6c84; }
        .doc-content .status-macro[data-status-color="purple"], .doc-content .status-macro[colour="Purple"] { background: #eae6ff; color: #403294; }

        /* Confluence expand macro */
        .doc-content .expand-container { border: 1px solid var(--border); border-radius: 6px; margin: 12px 0; overflow: hidden; }
        .doc-content .expand-control { padding: 8px 14px; background: var(--bg-2); cursor: pointer; font-size: 13px; font-weight: 500; color: var(--accent); }
        .doc-content .expand-content { padding: 12px 16px; }

        /* Confluence task list */
        .doc-content .task-list { list-style: none; margin-left: 0; padding-left: 0; }
        .doc-content .task-list li { display: flex; align-items: flex-start; gap: 8px; margin-bottom: 6px; }

        /* Hide Confluence chrome */
        .doc-content #breadcrumb-section, .doc-content #title-heading, .doc-content .page-metadata, .doc-content .pageSection { display: none; }
        .doc-content .aui-nav, .doc-content #footer, .doc-content .page-metadata-modification-info { display: none; }
      `}</style>
    </div>
  );
}
