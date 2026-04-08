'use client';
import { useEffect, useState, use } from 'react';
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

  useEffect(() => {
    fetch(`/api/files?path=${encodeURIComponent(getFilePath(space, fileName))}`)
      .then(r => r.json())
      .then(data => {
        setContent(data.content || '');
        setSha(data.sha || '');
        setEditContent(extractBodyContent(data.content || ''));
        setLoading(false);
        fetch(`/api/tree?space=${space}`)
          .then(r => r.json())
          .then((tree: Record<string, {title: string}>) => {
            if (tree[fileName]) setTitle(tree[fileName].title);
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

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
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

      <main style={{ maxWidth: '760px', margin: '0 auto', padding: '48px 40px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '28px', color: 'var(--text)' }}>{title}</h1>
        {loading ? (
          <p style={{ color: 'var(--text-muted)' }}>Loading...</p>
        ) : editing ? (
          <RichEditor content={editContent} onChange={setEditContent} />
        ) : (
          <div className="doc-content" dangerouslySetInnerHTML={{ __html: bodyContent }} />
        )}
      </main>

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
        .doc-content img { display: none; }
        .doc-content .panel, .doc-content .confluence-information-macro { background: var(--bg-2); border: 1px solid var(--border); border-radius: 6px; padding: 12px 16px; margin: 14px 0; }
        .doc-content #breadcrumb-section, .doc-content #title-heading, .doc-content .page-metadata, .doc-content .pageSection { display: none; }
      `}</style>
    </div>
  );
}
