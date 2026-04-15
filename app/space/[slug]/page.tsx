'use client';
import { useEffect, useState, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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

const SPACE_LABELS: Record<string, string> = {
  'media-cube': 'Media Cube',
  'underscore-talent': 'Underscore Talent',
  'creator-services': 'Creator Services',
  'creator-services-project': 'Creator Services Project',
  'content-licensing': 'Content Licensing',
};

type FlatNode = { file: string; title: string; parent: string | null };
type OrderMap = Record<string, Record<string, string[]>>;

function cleanTitle(title: string): string {
  return title.replace(/^[^:]+:\s*/, '').replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"
      style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s ease', flexShrink: 0 }}>
      <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function DropBetween({ id, isOver }: { id: string; isOver: boolean }) {
  const { setNodeRef } = useDroppable({ id });
  return (
    <div ref={setNodeRef} style={{ height: isOver ? '2px' : '6px', margin: '0 10px', position: 'relative', transition: 'height 0.1s' }}>
      {isOver && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: '#378ADD', borderRadius: '2px' }}>
          <div style={{ width: '6px', height: '6px', background: '#378ADD', borderRadius: '50%', position: 'absolute', top: '-2px', left: 0 }} />
        </div>
      )}
    </div>
  );
}

function RootDropZone({ isOver, isDragging }: { isOver: boolean; isDragging: boolean }) {
  const { setNodeRef } = useDroppable({ id: '__ROOT__' });
  if (!isDragging) return null;
  return (
    <div ref={setNodeRef} style={{
      margin: '0 0 8px', padding: '8px 14px',
      border: isOver ? '1.5px solid var(--accent)' : '1.5px dashed rgba(59, 130, 246, 0.3)',
      borderRadius: '6px', background: isOver ? 'rgba(59, 130, 246, 0.08)' : 'transparent',
      color: isOver ? 'var(--accent)' : 'var(--text-muted)',
      fontSize: '12px', fontWeight: '500', textAlign: 'center' as const, transition: 'all 0.15s',
    }}>
      Drop here &rarr; root level
    </div>
  );
}

function DraggableItem({
  node, depth, isAdmin, hasChildren, isExpanded, isDropTarget, isDragging, childCount, onToggle, onClick,
}: {
  node: FlatNode; depth: number; isAdmin: boolean; hasChildren: boolean; isExpanded: boolean;
  isDropTarget: boolean; isDragging: boolean; childCount: number; onToggle: () => void; onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging: itemDragging } = useSortable({ id: node.file, disabled: !isAdmin });
  const style: React.CSSProperties = { transform: CSS.Translate.toString(transform), transition, opacity: itemDragging ? 0.35 : 1 };
  const title = cleanTitle(node.title);

  return (
    <div ref={setNodeRef} style={style}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '6px', margin: '1px 0',
        paddingLeft: `${depth * 24}px`,
        background: isDropTarget ? 'rgba(59, 130, 246, 0.08)' : 'transparent',
        borderRadius: '6px', transition: 'background 0.15s',
      }}>
        {hasChildren ? (
          <button onClick={(e) => { e.stopPropagation(); onToggle(); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px',
              borderRadius: '4px', flexShrink: 0, padding: 0 }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-2, #f0f0f0)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
            <ChevronIcon expanded={isExpanded} />
          </button>
        ) : <span style={{ width: '28px', flexShrink: 0 }} />}
        <button
          onClick={onClick}
          {...(isAdmin ? { ...attributes, ...listeners } : {})}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px',
            background: 'none', border: 'none', borderRadius: '6px',
            cursor: isAdmin ? 'grab' : 'pointer', textAlign: 'left' as const, flex: 1,
            transition: 'background 0.1s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-2, #f5f5f5)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'none')}
        >
          <span style={{ fontSize: '14px' }}>{hasChildren ? (isExpanded ? '\uD83D\uDCC2' : '\uD83D\uDCC1') : '\uD83D\uDCC4'}</span>
          <span style={{ fontSize: '13px', color: 'var(--text)', fontWeight: hasChildren ? '500' : '400' }}>{title}</span>
          {hasChildren && (
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: 'auto', background: 'var(--bg-3)', padding: '1px 6px', borderRadius: '10px' }}>
              {childCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}

export default function SpacePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const [flatTree, setFlatTree] = useState<Record<string, FlatNode>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [total, setTotal] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [isAdmin, setIsAdmin] = useState(false);
  const [dragActiveId, setDragActiveId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [reorderMsg, setReorderMsg] = useState('');
  const [orderMap, setOrderMap] = useState<OrderMap>({});

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  useEffect(() => {
    const match = document.cookie.match(/(^| )kb_level=([^;]+)/);
    setIsAdmin(match ? match[2] === 'admin' : false);
  }, []);

  useEffect(() => {
    fetch('/api/tree?space=' + slug)
      .then(r => r.json())
      .then((data: Record<string, FlatNode>) => {
        setFlatTree(data);
        setTotal(Object.keys(data).length);
        setLoading(false);
      });
    fetch('/api/order').then(r => r.json()).then(setOrderMap).catch(() => {});
  }, [slug]);

  const getChildrenOf = useCallback((parentFile: string | null): FlatNode[] => {
    if (parentFile === null) {
      return Object.values(flatTree).filter(p => !p.parent || !(p.parent in flatTree));
    }
    return Object.values(flatTree).filter(n => n.parent === parentFile);
  }, [flatTree]);

  const getSortedChildren = useCallback((parentKey: string | null, children: FlatNode[]): FlatNode[] => {
    const key = parentKey || '__root__';
    const order = orderMap[slug]?.[key];
    if (!order || order.length === 0) {
      return [...children].sort((a, b) => cleanTitle(a.title).localeCompare(cleanTitle(b.title)));
    }
    const indexed = new Map(order.map((f, i) => [f, i]));
    return [...children].sort((a, b) => {
      const ai = indexed.get(a.file) ?? 9999;
      const bi = indexed.get(b.file) ?? 9999;
      if (ai !== bi) return ai - bi;
      return cleanTitle(a.title).localeCompare(cleanTitle(b.title));
    });
  }, [orderMap, slug]);

  const countChildren = useCallback((file: string): number => {
    return Object.values(flatTree).filter(n => n.parent === file).length;
  }, [flatTree]);

  const matchesSearch = useCallback((node: FlatNode): boolean => {
    if (!search) return true;
    const q = search.toLowerCase();
    if (cleanTitle(node.title).toLowerCase().includes(q)) return true;
    const children = Object.values(flatTree).filter(n => n.parent === node.file);
    return children.some(c => matchesSearch(c));
  }, [search, flatTree]);

  const toggleNode = (file: string) => {
    setExpandedNodes(prev => { const next = new Set(prev); if (next.has(file)) next.delete(file); else next.add(file); return next; });
  };

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    setCreating(true);
    const res = await fetch('/api/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ space: slug, title: newTitle.trim() }),
    });
    const data = await res.json();
    if (data.success) {
      setShowCreate(false);
      setNewTitle('');
      router.push('/doc/' + slug + '/' + encodeURIComponent(data.fileName));
    }
    setCreating(false);
  };

  const handleDragStart = (event: DragStartEvent) => { setDragActiveId(event.active.id as string); };
  const handleDragOver = (event: any) => { setDropTargetId(event.over?.id as string || null); };
  const handleDragCancel = () => { setDragActiveId(null); setDropTargetId(null); };

  const saveOrder = async (parentKey: string | null, orderedFiles: string[]) => {
    await fetch('/api/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ space: slug, parentKey: parentKey || '__root__', orderedFiles }),
    });
    setOrderMap(prev => {
      const next = { ...prev };
      if (!next[slug]) next[slug] = {};
      next[slug][parentKey || '__root__'] = orderedFiles;
      return next;
    });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setDragActiveId(null);
    setDropTargetId(null);
    if (!over || active.id === over.id) return;

    const draggedFile = active.id as string;
    const overId = over.id as string;

    // Root drop
    if (overId === '__ROOT__') {
      const currentParent = flatTree[draggedFile]?.parent;
      if (!currentParent || !(currentParent in flatTree)) return;
      setFlatTree(prev => ({ ...prev, [draggedFile]: { ...prev[draggedFile], parent: null } }));
      setReorderMsg('Moving...');
      const res = await fetch('/api/tree/reorder', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ space: slug, file: draggedFile, newParent: null }) });
      if (res.ok) { setReorderMsg('Moved.'); setTimeout(() => setReorderMsg(''), 2000); }
      else {
        setFlatTree(prev => ({ ...prev, [draggedFile]: { ...prev[draggedFile], parent: currentParent } }));
        setReorderMsg('Move failed.'); setTimeout(() => setReorderMsg(''), 3000);
      }
      return;
    }

    // Between drop (reorder)
    if (overId.startsWith('between::')) {
      const parts = overId.split('::');
      const targetParentKey = parts[1] === '__root__' ? null : parts[1];
      const insertIndex = parseInt(parts[2], 10);
      const draggedParent = flatTree[draggedFile]?.parent;
      const isSameParent = (draggedParent === targetParentKey) ||
        (!draggedParent && targetParentKey === null) ||
        (draggedParent && !(draggedParent in flatTree) && targetParentKey === null);

      if (isSameParent) {
        const siblings = getSortedChildren(targetParentKey, getChildrenOf(targetParentKey));
        const fileList = siblings.map(n => n.file).filter(f => f !== draggedFile);
        const adj = Math.min(insertIndex, fileList.length);
        fileList.splice(adj, 0, draggedFile);
        setReorderMsg('Reordering...');
        await saveOrder(targetParentKey, fileList);
        setReorderMsg('Reordered.'); setTimeout(() => setReorderMsg(''), 2000);
      } else {
        const currentParent = flatTree[draggedFile]?.parent;
        setFlatTree(prev => ({ ...prev, [draggedFile]: { ...prev[draggedFile], parent: targetParentKey } }));
        if (targetParentKey) setExpandedNodes(prev => new Set([...prev, targetParentKey]));
        setReorderMsg('Moving...');
        const res = await fetch('/api/tree/reorder', { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ space: slug, file: draggedFile, newParent: targetParentKey }) });
        if (res.ok) {
          const siblings = getSortedChildren(targetParentKey, getChildrenOf(targetParentKey)).map(n => n.file).filter(f => f !== draggedFile);
          const adj = Math.min(insertIndex, siblings.length);
          siblings.splice(adj, 0, draggedFile);
          await saveOrder(targetParentKey, siblings);
          setReorderMsg('Moved.'); setTimeout(() => setReorderMsg(''), 2000);
        } else {
          setFlatTree(prev => ({ ...prev, [draggedFile]: { ...prev[draggedFile], parent: currentParent ?? null } }));
          setReorderMsg('Move failed.'); setTimeout(() => setReorderMsg(''), 3000);
        }
      }
      return;
    }

    // Drop on item (reparent)
    const currentParent = flatTree[draggedFile]?.parent;
    const newParent = overId;
    if (currentParent === newParent) return;
    let check: string | null = newParent;
    while (check && flatTree[check]) {
      if (check === draggedFile) { setReorderMsg('Cannot move into its own child.'); setTimeout(() => setReorderMsg(''), 3000); return; }
      check = flatTree[check].parent;
    }
    setFlatTree(prev => ({ ...prev, [draggedFile]: { ...prev[draggedFile], parent: newParent } }));
    setExpandedNodes(prev => new Set([...prev, newParent]));
    setReorderMsg('Moving...');
    const res = await fetch('/api/tree/reorder', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ space: slug, file: draggedFile, newParent }) });
    if (res.ok) { setReorderMsg('Moved.'); setTimeout(() => setReorderMsg(''), 2000); }
    else {
      setFlatTree(prev => ({ ...prev, [draggedFile]: { ...prev[draggedFile], parent: currentParent ?? null } }));
      setReorderMsg('Move failed.'); setTimeout(() => setReorderMsg(''), 3000);
    }
  };

  const renderTree = (parentKey: string | null, depth: number): React.ReactNode => {
    const children = getChildrenOf(parentKey);
    const sorted = getSortedChildren(parentKey, children);
    const pKey = parentKey || '__root__';
    const isDragging = !!dragActiveId;

    return sorted.map((node, idx) => {
      if (!matchesSearch(node)) return null;
      const nodeChildren = getChildrenOf(node.file);
      const hasChildren = nodeChildren.length > 0;
      const isExpanded = expandedNodes.has(node.file);
      const isTarget = dropTargetId === node.file && dragActiveId !== node.file;
      const betweenId = `between::${pKey}::${idx}`;
      const isBeforeOver = dropTargetId === betweenId;

      return (
        <div key={node.file}>
          {isDragging && isAdmin && dragActiveId !== node.file && (
            <DropBetween id={betweenId} isOver={isBeforeOver} />
          )}
          <DraggableItem
            node={node} depth={depth} isAdmin={isAdmin}
            hasChildren={hasChildren} isExpanded={isExpanded} isDropTarget={isTarget} isDragging={isDragging} childCount={nodeChildren.length}
            onToggle={() => toggleNode(node.file)}
            onClick={() => hasChildren ? toggleNode(node.file) : router.push('/doc/' + slug + '/' + encodeURIComponent(node.file))}
          />
          {hasChildren && isExpanded && (
            <div style={{ borderLeft: '2px solid var(--border)', marginLeft: `${depth * 24 + 13}px`, paddingLeft: '6px' }}>
              {renderTree(node.file, depth + 1)}
            </div>
          )}
          {isDragging && isAdmin && idx === sorted.length - 1 && dragActiveId !== node.file && (
            <DropBetween id={`between::${pKey}::${idx + 1}`} isOver={dropTargetId === `between::${pKey}::${idx + 1}`} />
          )}
        </div>
      );
    });
  };

  const draggedNode = dragActiveId ? flatTree[dragActiveId] : null;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <header style={{ borderBottom: '1px solid var(--border)', padding: '0 40px', height: '56px', display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--bg)' }}>
        <button onClick={() => router.push('/')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '13px' }}>&larr; Home</button>
        <span style={{ color: 'var(--border)' }}>&rsaquo;</span>
        <span style={{ fontWeight: '600', fontSize: '14px' }}>{SPACE_LABELS[slug]}</span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {reorderMsg && <span style={{ color: 'var(--accent)', fontSize: '13px' }}>{reorderMsg}</span>}
          <button onClick={() => setShowCreate(true)} style={{ padding: '6px 14px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>+ New page</button>
        </div>
      </header>

      <main style={{ maxWidth: '1128px', margin: '0 auto', padding: '48px 40px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: '700', marginBottom: '4px' }}>{SPACE_LABELS[slug]}</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '28px' }}>{loading ? 'Loading...' : total + ' documents'}</p>
        <input type="text" placeholder="Search documents..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', padding: '8px 14px', marginBottom: '20px', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text)', fontSize: '13px', outline: 'none' }}
        />
        {loading ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Loading documents...</p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter}
            onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd} onDragCancel={handleDragCancel}>
            <RootDropZone isOver={dropTargetId === '__ROOT__' && !!dragActiveId} isDragging={!!dragActiveId} />
            <div>
              {renderTree(null, 0)}
            </div>
            <DragOverlay dropAnimation={null}>
              {draggedNode ? (
                <div style={{ padding: '6px 14px', background: 'var(--bg)', border: '1px solid var(--accent)', borderRadius: '8px',
                  fontSize: '13px', color: 'var(--accent)', fontWeight: '500', boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                  maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {cleanTitle(draggedNode.title)}
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </main>

      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '32px', width: '420px', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
            <h3 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: '600' }}>New page</h3>
            <input type="text" placeholder="Page title" value={newTitle} onChange={e => setNewTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreate()} autoFocus
              style={{ width: '100%', padding: '10px 14px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', fontSize: '14px', outline: 'none', marginBottom: '16px' }}
            />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button onClick={() => { setShowCreate(false); setNewTitle(''); }} style={{ padding: '8px 16px', background: 'none', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
              <button onClick={handleCreate} disabled={!newTitle.trim() || creating} style={{ padding: '8px 16px', background: 'var(--accent)', border: 'none', borderRadius: '6px', color: '#fff', fontWeight: '500', cursor: newTitle.trim() ? 'pointer' : 'not-allowed', fontSize: '13px' }}>{creating ? 'Creating...' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
