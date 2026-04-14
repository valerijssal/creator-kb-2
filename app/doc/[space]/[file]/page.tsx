'use client';
import React, { useEffect, useState, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  useDroppable,
} from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const RichEditor = dynamic(() => import('@/components/RichEditor'), { ssr: false });

const SPACE_LABELS: Record<string, string> = {
  'media-cube': 'Media Cube',
  'underscore-talent': 'Underscore Talent',
  'creator-services': 'Creator Services',
  'creator-services-project': 'Creator Services Project',
  'content-licensing': 'Content Licensing',
};

const ALL_SPACES = Object.keys(SPACE_LABELS);

type TreeNode = { file: string; title: string; parent: string | null };

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

function decodeTitle(title: string): string {
  return title
    .replace(/^[^:]+:\s*/, '')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      style={{
        transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
        transition: 'transform 0.15s ease',
        flexShrink: 0,
      }}
    >
      <path
        d="M6 4L10 8L6 12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* --- Root drop zone (space header) --- */
function RootDropZone({ label, isOver }: { label: string; isOver: boolean }) {
  const { setNodeRef } = useDroppable({ id: '__ROOT__' });
  return (
    <div
      ref={setNodeRef}
      style={{
        padding: '0 20px 14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: isOver ? 'rgba(59, 130, 246, 0.08)' : 'transparent',
        borderRadius: '6px',
        transition: 'background 0.15s',
      }}
    >
      <span style={{ fontSize: '11px', fontWeight: '600', letterSpacing: '0.06em', textTransform: 'uppercase', color: isOver ? 'var(--accent)' : 'var(--text-muted)' }}>
        {isOver ? 'Drop here to move to root' : label}
      </span>
    </div>
  );
}

function DraggableTreeItem({
  node,
  depth,
  isAdmin,
  isCurrent,
  isParent,
  isExpanded,
  hasChildren,
  isDropTarget,
  onToggle,
  onNavigate,
}: {
  node: TreeNode;
  depth: number;
  isAdmin: boolean;
  isCurrent: boolean;
  isParent: boolean;
  isExpanded: boolean;
  hasChildren: boolean;
  isDropTarget: boolean;
  onToggle: () => void;
  onNavigate: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: node.file,
    disabled: !isAdmin,
  });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  };

  const cleanTitle = decodeTitle(node.title);

  return (
    <div ref={setNodeRef} style={style}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          paddingLeft: `${depth * 20 + 8}px`,
          paddingRight: '8px',
          marginBottom: '1px',
          background: isDropTarget ? 'rgba(59, 130, 246, 0.08)' : 'transparent',
          borderRadius: '6px',
          transition: 'background 0.15s',
        }}
      >
        {hasChildren ? (
          <button
            onClick={(e) => { e.stopPropagation(); onToggle(); }}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', width: '22px', height: '22px',
              borderRadius: '4px', flexShrink: 0, padding: 0,
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-2, #f0f0f0)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            <ChevronIcon expanded={isExpanded} />
          </button>
        ) : (
          <span style={{ width: '22px', flexShrink: 0 }} />
        )}
        <button
          onClick={onNavigate}
          {...(isAdmin ? { ...attributes, ...listeners } : {})}
          style={{
            background: isCurrent ? 'rgba(59, 130, 246, 0.1)' : isParent ? 'rgba(59, 130, 246, 0.04)' : 'none',
            border: 'none',
            borderLeft: isCurrent ? '2px solid var(--accent)' : isParent ? '2px solid rgba(59, 130, 246, 0.25)' : '2px solid transparent',
            borderRadius: '4px',
            cursor: isAdmin ? 'grab' : 'pointer',
            textAlign: 'left' as const,
            padding: '6px 10px',
            fontSize: '13px',
            color: isCurrent ? 'var(--accent)' : 'var(--text)',
            fontWeight: isCurrent ? '600' : isParent ? '500' : '400',
            flex: 1,
            lineHeight: '1.5',
            transition: 'background 0.1s',
          }}
          onMouseEnter={e => { if (!isCurrent && !isParent) e.currentTarget.style.background = 'var(--bg-2, #f5f5f5)'; }}
          onMouseLeave={e => { if (!isCurrent && !isParent) e.currentTarget.style.background = 'none'; }}
        >
          {cleanTitle}
        </button>
      </div>
    </div>
  );
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
  const [isStandalonePage, setIsStandalonePage] = useState(false);
  const [showCreateSub, setShowCreateSub] = useState(false);
  const [subTitle, setSubTitle] = useState('');
  const [creatingSub, setCreatingSub] = useState(false);
  const [sidebarTree, setSidebarTree] = useState<Record<string, TreeNode>>({});
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [isAdmin, setIsAdmin] = useState(false);
  const [dragActiveId, setDragActiveId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [reorderMsg, setReorderMsg] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderTitle, setNewFolderTitle] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  useEffect(() => {
    const match = document.cookie.match(/(^| )kb_level=([^;]+)/);
    setIsAdmin(match ? match[2] === 'admin' : false);
  }, []);

  useEffect(() => {
    fetch(`/api/files?path=${encodeURIComponent(getFilePath(space, fileName))}`)
      .then(r => r.json())
      .then(data => {
        let raw = data.content || '';
        const escapedMatch = raw.match(/<pre><code>(&lt;!DOCTYPE[\s\S]*?)<\/code><\/pre>/i);
        if (escapedMatch) {
          raw = escapedMatch[1]
            .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
        }
        setContent(raw);
        setIsStandalonePage(raw.includes('<!DOCTYPE') && raw.includes('<style>'));
        setSha(data.sha || '');
        setEditContent(extractBodyContent(data.content || ''));
        setLoading(false);
      });

    fetch(`/api/tree?space=${space}`)
      .then(r => r.json())
      .then((tree: Record<string, TreeNode>) => {
        if (tree[fileName]) setTitle(tree[fileName].title);
        setSidebarTree(tree);
        const expanded = new Set<string>();
        let current = tree[fileName]?.parent;
        while (current && tree[current]) {
          expanded.add(current);
          current = tree[current].parent;
        }
        if (tree[fileName]?.parent) expanded.add(tree[fileName].parent!);
        setExpandedNodes(expanded);
      });
  }, [space, fileName]);

  const getRoots = useCallback((): TreeNode[] => {
    return Object.values(sidebarTree)
      .filter(p => !p.parent || !(p.parent in sidebarTree))
      .sort((a, b) => decodeTitle(a.title).localeCompare(decodeTitle(b.title)));
  }, [sidebarTree]);

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
    if (res.ok) {
      setShowDeleteConfirm(false);
      setActionMsg('Document deleted successfully.');
      setTimeout(() => router.push(`/space/${space}`), 1500);
    } else {
      setShowDeleteConfirm(false);
      setActionMsg('Failed to delete document.');
      setTimeout(() => setActionMsg(''), 3000);
    }
  };

  const handleMove = async () => {
    if (!moveTarget) return;
    const res = await fetch('/api/files', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ oldPath: getFilePath(space, fileName), newSpaceSlug: moveTarget, sha, fileName }) });
    if (res.ok) router.push(`/space/${moveTarget}`);
  };

  const handleCreateSub = async () => {
    if (!subTitle.trim()) return;
    setCreatingSub(true);
    const res = await fetch('/api/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: subTitle, space, parentFile: fileName }),
    });
    if (res.ok) {
      const data = await res.json();
      setShowCreateSub(false);
      setSubTitle('');
      router.push(`/doc/${space}/${encodeURIComponent(data.fileName)}`);
    }
    setCreatingSub(false);
  };

  const handleCreateFolder = async () => {
    if (!newFolderTitle.trim()) return;
    setCreatingFolder(true);
    const res = await fetch('/api/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newFolderTitle, space, parentFile: null }),
    });
    if (res.ok) {
      const data = await res.json();
      setShowNewFolder(false);
      setNewFolderTitle('');
      router.push(`/doc/${space}/${encodeURIComponent(data.fileName)}`);
    }
    setCreatingFolder(false);
  };

  const toggleNode = (nodeFile: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeFile)) next.delete(nodeFile);
      else next.add(nodeFile);
      return next;
    });
  };

  const handleDragStart = (event: DragStartEvent) => {
    setDragActiveId(event.active.id as string);
  };

  const handleDragOver = (event: any) => {
    setDropTargetId(event.over?.id as string || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setDragActiveId(null);
    setDropTargetId(null);

    if (!over || active.id === over.id) return;

    const draggedFile = active.id as string;
    const isRootDrop = over.id === '__ROOT__';
    const targetFile = isRootDrop ? null : over.id as string;

    const currentParent = sidebarTree[draggedFile]?.parent;
    const newParent = isRootDrop ? null : targetFile;

    // Skip if already at target
    if (currentParent === newParent) return;

    // Circular ref check
    if (newParent) {
      let check: string | null = newParent;
      while (check && sidebarTree[check]) {
        if (check === draggedFile) {
          setReorderMsg('Cannot move a folder into its own child.');
          setTimeout(() => setReorderMsg(''), 3000);
          return;
        }
        check = sidebarTree[check].parent;
      }
    }

    // Optimistic update
    setSidebarTree(prev => ({
      ...prev,
      [draggedFile]: { ...prev[draggedFile], parent: newParent },
    }));

    if (newParent) {
      setExpandedNodes(prev => new Set([...prev, newParent]));
    }

    setReorderMsg('Moving...');

    const res = await fetch('/api/tree/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ space, file: draggedFile, newParent }),
    });

    if (res.ok) {
      setReorderMsg('Moved.');
      setTimeout(() => setReorderMsg(''), 2000);
    } else {
      setSidebarTree(prev => ({
        ...prev,
        [draggedFile]: { ...prev[draggedFile], parent: currentParent ?? null },
      }));
      const err = await res.json().catch(() => ({ error: 'Move failed' }));
      setReorderMsg(err.error || 'Move failed.');
      setTimeout(() => setReorderMsg(''), 3000);
    }
  };

  const handleDragCancel = () => {
    setDragActiveId(null);
    setDropTargetId(null);
  };

  const renderTree = (nodes: TreeNode[], depth: number): React.ReactNode => {
    return nodes
      .sort((a, b) => decodeTitle(a.title).localeCompare(decodeTitle(b.title)))
      .map(node => {
        const children = Object.values(sidebarTree).filter(n => n.parent === node.file);
        const isExpanded = expandedNodes.has(node.file);
        const isCurrent = node.file === fileName;
        const isParentNode = node.file === sidebarTree[fileName]?.parent;
        const isTarget = dropTargetId === node.file && dragActiveId !== node.file;

        return (
          <div key={node.file}>
            <DraggableTreeItem
              node={node}
              depth={depth}
              isAdmin={isAdmin}
              isCurrent={isCurrent}
              isParent={isParentNode}
              isExpanded={isExpanded}
              hasChildren={children.length > 0}
              isDropTarget={isTarget}
              onToggle={() => toggleNode(node.file)}
              onNavigate={() => router.push(`/doc/${space}/${encodeURIComponent(node.file)}`)}
            />
            {isExpanded && children.length > 0 && (
              <div style={{ marginLeft: `${depth * 20 + 19}px`, borderLeft: '1px solid rgba(0,0,0,0.06)', paddingLeft: '0' }}>
                {renderTree(children, depth + 1)}
              </div>
            )}
          </div>
        );
      });
  };

  const draggedNode = dragActiveId ? sidebarTree[dragActiveId] : null;
  const bodyContent = extractBodyContent(content);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <header style={{ borderBottom: '1px solid var(--border)', padding: '0 40px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg)', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-muted)', overflow: 'hidden' }}>
          <button onClick={() => router.push('/')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' }}>Home</button>
          <span>{'\u203A'}</span>
          <button onClick={() => router.push(`/space/${space}`)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' }}>{SPACE_LABELS[space]}</button>
          <span>{'\u203A'}</span>
          <span style={{ color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{decodeTitle(title)}</span>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexShrink: 0, alignItems: 'center' }}>
          {actionMsg && <span style={{ color: 'var(--accent)', fontSize: '13px' }}>{actionMsg}</span>}
          {reorderMsg && <span style={{ color: 'var(--accent)', fontSize: '13px' }}>{reorderMsg}</span>}
          {!editing ? (
            <>
              <button onClick={() => setShowCreateSub(true)} style={{ padding: '5px 12px', background: 'none', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>+ Sub-page</button>
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

      <div style={{ display: 'flex', flex: 1 }}>
        <aside style={{ width: '280px', flexShrink: 0, borderRight: '1px solid var(--border)', padding: '20px 0', overflowY: 'auto', height: 'calc(100vh - 56px)', position: 'sticky', top: '56px', background: 'var(--bg)' }}>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px 14px' }}>
              <RootDropZone label={SPACE_LABELS[space]} isOver={dropTargetId === '__ROOT__' && !!dragActiveId} />
              {isAdmin && (
                <button
                  onClick={() => setShowNewFolder(true)}
                  title="New folder"
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-muted)', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', width: '24px', height: '24px',
                    borderRadius: '4px', padding: 0, flexShrink: 0,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-2, #f0f0f0)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M2 4.5C2 3.67 2.67 3 3.5 3H6.29a1 1 0 0 1 .7.29L8 4.3h4.5c.83 0 1.5.67 1.5 1.5V11.5c0 .83-.67 1.5-1.5 1.5h-9A1.5 1.5 0 0 1 2 11.5V4.5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" fill="none"/>
                    <path d="M8 7v4M6 9h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                  </svg>
                </button>
              )}
            </div>
            <div style={{ padding: '0 8px' }}>
              {Object.keys(sidebarTree).length === 0 ? (
                <div style={{ padding: '8px 20px', fontSize: '13px', color: 'var(--text-muted)' }}>Loading...</div>
              ) : (
                <>
                  {renderTree(getRoots(), 0)}
                  <DragOverlay dropAnimation={null}>
                    {draggedNode ? (
                      <div style={{
                        padding: '6px 14px',
                        background: 'var(--bg)',
                        border: '1px solid var(--accent)',
                        borderRadius: '8px',
                        fontSize: '13px',
                        color: 'var(--accent)',
                        fontWeight: '500',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                        maxWidth: '240px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {decodeTitle(draggedNode.title)}
                      </div>
                    ) : null}
                  </DragOverlay>
                </>
              )}
            </div>
          </DndContext>
        </aside>

        <main style={{ flex: 1, padding: '48px 56px', minWidth: 0 }}>
          <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '28px', color: 'var(--text)' }}>{decodeTitle(title)}</h1>
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

      {showNewFolder && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '12px', padding: '28px', width: '400px', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
            <h3 style={{ marginBottom: '8px', fontSize: '15px', fontWeight: '600' }}>New folder</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '16px' }}>Creates a page at the root of {SPACE_LABELS[space]}. Drag other pages into it to organize.</p>
            <input
              type="text"
              placeholder="Folder name..."
              value={newFolderTitle}
              onChange={e => setNewFolderTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreateFolder()}
              autoFocus
              style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', fontSize: '13px', marginBottom: '16px', outline: 'none' }}
            />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button onClick={() => { setShowNewFolder(false); setNewFolderTitle(''); }} style={{ padding: '7px 14px', background: 'none', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
              <button onClick={handleCreateFolder} disabled={!newFolderTitle.trim() || creatingFolder} style={{ padding: '7px 14px', background: 'var(--accent)', border: 'none', borderRadius: '6px', color: '#fff', fontWeight: '500', cursor: newFolderTitle.trim() ? 'pointer' : 'not-allowed', fontSize: '13px' }}>{creatingFolder ? 'Creating...' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}

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

      {showCreateSub && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '12px', padding: '28px', width: '400px', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
            <h3 style={{ marginBottom: '8px', fontSize: '15px', fontWeight: '600' }}>Create sub-page</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '16px' }}>Under: {decodeTitle(title)}</p>
            <input
              type="text"
              placeholder="Page title..."
              value={subTitle}
              onChange={e => setSubTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreateSub()}
              autoFocus
              style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', fontSize: '13px', marginBottom: '16px', outline: 'none' }}
            />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button onClick={() => { setShowCreateSub(false); setSubTitle(''); }} style={{ padding: '7px 14px', background: 'none', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
              <button onClick={handleCreateSub} disabled={!subTitle.trim() || creatingSub} style={{ padding: '7px 14px', background: 'var(--accent)', border: 'none', borderRadius: '6px', color: '#fff', fontWeight: '500', cursor: subTitle.trim() ? 'pointer' : 'not-allowed', fontSize: '13px' }}>{creatingSub ? 'Creating...' : 'Create'}</button>
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
        .doc-content img { max-width: 100%; height: auto; border-radius: 6px; margin: 12px 0; }
        .doc-content .panel { border-radius: 6px; margin: 14px 0; overflow: hidden; border: 1px solid var(--border); }
        .doc-content .panelHeader { padding: 8px 12px; font-weight: 600; font-size: 13px; background: var(--bg-3); }
        .doc-content .panelContent { padding: 12px 16px; background: var(--bg-2); }
        .doc-content .confluence-information-macro { display: flex; gap: 12px; border-radius: 6px; padding: 12px 16px; margin: 14px 0; border-left: 4px solid #0052cc; background: #e9f0ff; }
        .doc-content .confluence-information-macro-note { border-left-color: #ff991f; background: #fff7e6; }
        .doc-content .confluence-information-macro-warning { border-left-color: #de350b; background: #ffebe6; }
        .doc-content .confluence-information-macro-tip { border-left-color: #00875a; background: #e3fcef; }
        .doc-content .confluence-information-macro-body { font-size: 14px; color: var(--text); }
        .doc-content .confluence-information-macro-icon { display: none; }
        .doc-content .status-macro { display: inline-block; padding: 2px 8px; border-radius: 3px; font-size: 11px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; }
        .doc-content .status-macro[data-status-color="green"], .doc-content .status-macro[colour="Green"] { background: #e3fcef; color: #006644; }
        .doc-content .status-macro[data-status-color="yellow"], .doc-content .status-macro[colour="Yellow"] { background: #fff7e6; color: #974f0c; }
        .doc-content .status-macro[data-status-color="red"], .doc-content .status-macro[colour="Red"] { background: #ffebe6; color: #bf2600; }
        .doc-content .status-macro[data-status-color="blue"], .doc-content .status-macro[colour="Blue"] { background: #e9f0ff; color: #0052cc; }
        .doc-content .status-macro[data-status-color="grey"], .doc-content .status-macro[colour="Grey"] { background: #f4f5f7; color: #5e6c84; }
        .doc-content .status-macro[data-status-color="purple"], .doc-content .status-macro[colour="Purple"] { background: #eae6ff; color: #403294; }
        .doc-content .expand-container { border: 1px solid var(--border); border-radius: 6px; margin: 12px 0; overflow: hidden; }
        .doc-content .expand-control { padding: 8px 14px; background: var(--bg-2); cursor: pointer; font-size: 13px; font-weight: 500; color: var(--accent); }
        .doc-content .expand-content { padding: 12px 16px; }
        .doc-content .task-list { list-style: none; margin-left: 0; padding-left: 0; }
        .doc-content .task-list li { display: flex; align-items: flex-start; gap: 8px; margin-bottom: 6px; }
        .doc-content #breadcrumb-section, .doc-content #title-heading, .doc-content .page-metadata, .doc-content .pageSection { display: none; }
        .doc-content .aui-nav, .doc-content #footer, .doc-content .page-metadata-modification-info { display: none; }
      `}</style>
    </div>
  );
}
