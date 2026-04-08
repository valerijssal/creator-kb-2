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

const ALL_SPACES = Object.keys(SPACE_LABELS);

function extractBodyContent(html: string): string {
  const bodyMatch = html.match(/<div id="main-content"[^>]*>([\s\S]*?)<\/div>\s*(?=<div class="pageSection|<\/div>\s*<\/div>\s*<div id="footer")/);
  if (bodyMatch) return bodyMatch[1];
  const body = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  return body ? body[1] : html;
}

function fileNameToTitle(fileName: string): string {
  return fileName
    .replace(/\.html$/, '')
    .replace(/_\d+$/, '')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .trim();
}

export default function DocPage({ params }: { params: Promise<{ space: string; file: string }> }) {
  const { space, file } = use(params);
  const router = useRouter();
  const fileName = decodeURIComponent(file);
  const title = fileNameToTitle(fileName);

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

  const filePath = `Confluence Export - ${SPACE_LABELS[space]}/${fileName}`;
  // Handle spaces with (main) or special chars
  const getFilePath = () => {
    const spaceMap: Record<string, string> = {
      'media-cube': 'Confluence Export - MediaCube',
      'underscore-talent': 'Confluence Export - Underscore Talent',
      'creator-services': 'Confluence Export - Creator Services (main)',
      'creator-services-project': 'Confluence Export - Creator Services Project',
      'content-licensing': 'Confluence Export - Content Licensing',
    };
    return `${spaceMap[space]}/${fileName}`;
  };

  useEffect(() => {
    fetch(`/api/files?path=${encodeURIComponent(getFilePath())}`)
      .then(r => r.json())
      .then(data => {
        setContent(data.content || '');
        setSha(data.sha || '');
        setEditContent(data.content || '');
        setLoading(false);
      });
  }, [space, fileName]);

  const handleSave = async () => {
    setSaving(true);
    const res = await fetch('/api/files', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: getFilePath(), content: editContent, sha }),
    });
    if (res.ok) {
      const updated = await fetch(`/api/files?path=${encodeURIComponent(getFilePath())}`).then(r => r.json());
      setSha(updated.sha);
      setContent(editContent);
      setEditing(false);
      setActionMsg('Saved successfully.');
      setTimeout(() => setActionMsg(''), 3000);
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    const res = await fetch('/api/files', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: getFilePath(), sha }),
    });
    if (res.ok) router.push(`/space/${space}`);
  };

  const handleMove = async () => {
    if (!moveTarget) return;
    const res = await fetch('/api/files', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldPath: getFilePath(), newSpaceSlug: moveTarget, sha, fileName }),
    });
    if (res.ok) {
      router.push(`/space/${moveTarget}`);
    }
  };

  const bodyContent = extractBodyContent(content);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Header */}
      <header style={{
        borderBottom: '1px solid var(--border)', padding: '0 40px',
        height: '60px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', background: 'var(--bg-2)',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => router.push('/')} style={{
            background: 'none', border: 'none', color: 'var(--text-muted)',
            cursor: 'pointer', fontSize: '13px',
          }}>Home</button>
          <span style={{ color: 'var(--border)' }}>›</span>
          <button onClick={() => router.push(`/space/${space}`)} style={{
            background: 'none', border: 'none', color: 'var(--text-muted)',
            cursor: 'pointer', fontSize: '13px',
          }}>{SPACE_LABELS[space]}</button>
          <span style={{ color: 'var(--border)' }}>›</span>
          <span style={{ fontSize: '13px', color: 'var(--text)' }}>{title}</span>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {actionMsg && (
            <span style={{ color: 'var(--accent)', fontSize: '13px', alignSelf: 'center', marginRight: '8px' }}>
              {actionMsg}
            </span>
          )}
          {!editing ? (
            <>
              <button onClick={() => setEditing(true)} style={{
                padding: '6px 14px', background: 'var(--accent)', color: '#0f0f0f',
                border: 'none', borderRadius: '6px', fontSize: '13px',
                fontWeight: '600', cursor: 'pointer',
              }}>Edit</button>
              <button onClick={() => setShowMoveModal(true)} style={{
                padding: '6px 14px', background: 'none', color: 'var(--text-muted)',
                border: '1px solid var(--border)', borderRadius: '6px', fontSize: '13px', cursor: 'pointer',
              }}>Move</button>
              <button onClick={() => setShowDeleteConfirm(true)} style={{
                padding: '6px 14px', background: 'none', color: 'var(--danger)',
                border: '1px solid var(--danger)', borderRadius: '6px', fontSize: '13px', cursor: 'pointer',
              }}>Delete</button>
            </>
          ) : (
            <>
              <button onClick={handleSave} disabled={saving} style={{
                padding: '6px 14px', background: 'var(--accent)', color: '#0f0f0f',
                border: 'none', borderRadius: '6px', fontSize: '13px',
                fontWeight: '600', cursor: 'pointer',
              }}>{saving ? 'Saving...' : 'Save'}</button>
              <button onClick={() => { setEditing(false); setEditContent(content); }} style={{
                padding: '6px 14px', background: 'none', color: 'var(--text-muted)',
                border: '1px solid var(--border)', borderRadius: '6px', fontSize: '13px', cursor: 'pointer',
              }}>Cancel</button>
            </>
          )}
        </div>
      </header>

      {/* Content */}
      <main style={{ maxWidth: '860px', margin: '0 auto', padding: '48px 40px' }}>
        {loading ? (
          <p style={{ color: 'var(--text-muted)' }}>Loading...</p>
        ) : editing ? (
          <textarea
            value={editContent}
            onChange={e => setEditContent(e.target.value)}
            style={{
              width: '100%', minHeight: '70vh', padding: '20px',
              background: 'var(--bg-2)', border: '1px solid var(--border)',
              borderRadius: '8px', color: 'var(--text)', fontSize: '13px',
              fontFamily: 'DM Mono, monospace', lineHeight: '1.6', outline: 'none', resize: 'vertical',
            }}
          />
        ) : (
          <div
            className="doc-content"
            dangerouslySetInnerHTML={{ __html: bodyContent }}
            style={{ lineHeight: '1.7', fontSize: '15px' }}
          />
        )}
      </main>

      {/* Move Modal */}
      {showMoveModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
        }}>
          <div style={{
            background: 'var(--bg-2)', border: '1px solid var(--border)',
            borderRadius: '12px', padding: '32px', width: '420px',
          }}>
            <h3 style={{ marginBottom: '16px', fontSize: '16px' }}>Move to another space</h3>
            <select
              value={moveTarget}
              onChange={e => setMoveTarget(e.target.value)}
              style={{
                width: '100%', padding: '10px', background: 'var(--bg-3)',
                border: '1px solid var(--border)', borderRadius: '6px',
                color: 'var(--text)', fontSize: '14px', marginBottom: '16px',
              }}
            >
              <option value="">Select space...</option>
              {ALL_SPACES.filter(s => s !== space).map(s => (
                <option key={s} value={s}>{SPACE_LABELS[s]}</option>
              ))}
            </select>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowMoveModal(false)} style={{
                padding: '8px 16px', background: 'none', border: '1px solid var(--border)',
                borderRadius: '6px', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '13px',
              }}>Cancel</button>
              <button onClick={handleMove} disabled={!moveTarget} style={{
                padding: '8px 16px', background: 'var(--accent)', border: 'none',
                borderRadius: '6px', color: '#0f0f0f', fontWeight: '600',
                cursor: moveTarget ? 'pointer' : 'not-allowed', fontSize: '13px',
              }}>Move</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {showDeleteConfirm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
        }}>
          <div style={{
            background: 'var(--bg-2)', border: '1px solid var(--border)',
            borderRadius: '12px', padding: '32px', width: '380px',
          }}>
            <h3 style={{ marginBottom: '8px', fontSize: '16px' }}>Delete this document?</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '24px' }}>
              This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowDeleteConfirm(false)} style={{
                padding: '8px 16px', background: 'none', border: '1px solid var(--border)',
                borderRadius: '6px', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '13px',
              }}>Cancel</button>
              <button onClick={handleDelete} style={{
                padding: '8px 16px', background: 'var(--danger)', border: 'none',
                borderRadius: '6px', color: '#fff', fontWeight: '600',
                cursor: 'pointer', fontSize: '13px',
              }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .doc-content h1, .doc-content h2, .doc-content h3 {
          color: var(--text);
          margin: 28px 0 12px;
          font-weight: 600;
          line-height: 1.3;
        }
        .doc-content h1 { font-size: 24px; }
        .doc-content h2 { font-size: 20px; border-bottom: 1px solid var(--border); padding-bottom: 8px; }
        .doc-content h3 { font-size: 16px; }
        .doc-content p { margin-bottom: 14px; color: var(--text); }
        .doc-content ul, .doc-content ol { margin: 12px 0 16px 24px; }
        .doc-content li { margin-bottom: 6px; color: var(--text); }
        .doc-content a { color: var(--accent); text-decoration: none; }
        .doc-content a:hover { text-decoration: underline; }
        .doc-content strong { font-weight: 600; }
        .doc-content code { background: var(--bg-3); padding: 2px 6px; border-radius: 4px; font-family: DM Mono, monospace; font-size: 13px; }
        .doc-content pre { background: var(--bg-3); padding: 16px; border-radius: 8px; overflow-x: auto; margin: 16px 0; }
        .doc-content table { width: 100%; border-collapse: collapse; margin: 16px 0; }
        .doc-content th, .doc-content td { border: 1px solid var(--border); padding: 10px 14px; text-align: left; font-size: 14px; }
        .doc-content th { background: var(--bg-3); font-weight: 600; }
        .doc-content img { display: none; }
        .doc-content .panel, .doc-content .confluence-information-macro { 
          background: var(--bg-3); border: 1px solid var(--border); 
          border-radius: 8px; padding: 14px 18px; margin: 16px 0; 
        }
        .doc-content #breadcrumb-section, .doc-content #title-heading,
        .doc-content .page-metadata, .doc-content .pageSection { display: none; }
      `}</style>
    </div>
  );
}
