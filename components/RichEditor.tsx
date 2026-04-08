'use client';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import { useEffect } from 'react';

interface RichEditorProps {
  content: string;
  onChange: (html: string) => void;
}

export default function RichEditor({ content, onChange }: RichEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit, Link.configure({ openOnClick: false })],
    content,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) editor.commands.setContent(content);
  }, [content]);

  if (!editor) return null;

  const btn = (action: () => void, label: string, active?: boolean) => (
    <button onClick={action} title={label} style={{ padding: '4px 10px', background: active ? 'var(--accent-light)' : 'none', color: active ? 'var(--accent)' : 'var(--text-muted)', border: 'none', borderRadius: '4px', fontSize: '12px', fontWeight: '500', cursor: 'pointer' }}>
      {label}
    </button>
  );

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
      <div style={{ display: 'flex', gap: '2px', flexWrap: 'wrap', padding: '8px 12px', borderBottom: '1px solid var(--border)', background: 'var(--bg-2)' }}>
        {btn(() => editor.chain().focus().toggleBold().run(), 'Bold', editor.isActive('bold'))}
        {btn(() => editor.chain().focus().toggleItalic().run(), 'Italic', editor.isActive('italic'))}
        {btn(() => editor.chain().focus().toggleHeading({ level: 1 }).run(), 'H1', editor.isActive('heading', { level: 1 }))}
        {btn(() => editor.chain().focus().toggleHeading({ level: 2 }).run(), 'H2', editor.isActive('heading', { level: 2 }))}
        {btn(() => editor.chain().focus().toggleHeading({ level: 3 }).run(), 'H3', editor.isActive('heading', { level: 3 }))}
        {btn(() => editor.chain().focus().toggleBulletList().run(), '• List', editor.isActive('bulletList'))}
        {btn(() => editor.chain().focus().toggleOrderedList().run(), '1. List', editor.isActive('orderedList'))}
        {btn(() => editor.chain().focus().toggleCodeBlock().run(), 'Code', editor.isActive('codeBlock'))}
        {btn(() => editor.chain().focus().toggleBlockquote().run(), 'Quote', editor.isActive('blockquote'))}
        {btn(() => editor.chain().focus().undo().run(), '↩')}
        {btn(() => editor.chain().focus().redo().run(), '↪')}
      </div>
      <EditorContent editor={editor} style={{ minHeight: '60vh', padding: '20px 24px', background: 'var(--bg)' }} />
      <style>{`
        .ProseMirror { outline: none; font-size: 15px; line-height: 1.7; color: var(--text); }
        .ProseMirror h1 { font-size: 22px; font-weight: 700; margin: 24px 0 12px; }
        .ProseMirror h2 { font-size: 18px; font-weight: 600; margin: 20px 0 10px; }
        .ProseMirror h3 { font-size: 15px; font-weight: 600; margin: 16px 0 8px; }
        .ProseMirror p { margin-bottom: 12px; }
        .ProseMirror ul, .ProseMirror ol { margin: 10px 0 14px 24px; }
        .ProseMirror li { margin-bottom: 4px; }
        .ProseMirror a { color: var(--accent); }
        .ProseMirror code { background: var(--bg-3); padding: 2px 6px; border-radius: 4px; font-size: 13px; }
        .ProseMirror pre { background: var(--bg-2); padding: 14px; border-radius: 6px; margin: 12px 0; }
        .ProseMirror blockquote { border-left: 3px solid var(--border); padding-left: 14px; color: var(--text-muted); margin: 12px 0; }
        .ProseMirror p.is-editor-empty:first-child::before { content: 'Start editing...'; color: var(--text-muted); pointer-events: none; float: left; height: 0; }
      `}</style>
    </div>
  );
}
