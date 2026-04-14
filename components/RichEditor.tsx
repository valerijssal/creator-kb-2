'use client';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Highlight } from '@tiptap/extension-highlight';
import { TextAlign } from '@tiptap/extension-text-align';
import { Underline } from '@tiptap/extension-underline';
import Image from '@tiptap/extension-image';
import { useEffect, useRef } from 'react';

const CLOUDINARY_CLOUD = 'djsloyzyb';
const CLOUDINARY_PRESET = 'creator-sercices-knowledge-base';

interface RichEditorProps {
  content: string;
  onChange: (html: string) => void;
}

export default function RichEditor({ content, onChange }: RichEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = (require('react') as typeof import('react')).useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Underline,
      Image.configure({ inline: false }),
    ],
    content,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) editor.commands.setContent(content);
  }, [content]);

  const handleImageUpload = async (file: File) => {
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', CLOUDINARY_PRESET);
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.secure_url && editor) {
        editor.chain().focus().setImage({ src: data.secure_url }).run();
      }
    } catch (err) {
      console.error('Upload failed:', err);
    }
    setUploading(false);
  };

  const handleGoogleEmbed = () => {
    const url = prompt('Paste a Google Sheets or Docs URL:');
    if (!url || !editor) return;
    let embedUrl = '';
    const sheetsMatch = url.match(/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
    const docsMatch = url.match(/docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/);
    const slidesMatch = url.match(/docs\.google\.com\/presentation\/d\/([a-zA-Z0-9_-]+)/);
    if (sheetsMatch) embedUrl = 'https://docs.google.com/spreadsheets/d/' + sheetsMatch[1] + '/preview';
    else if (docsMatch) embedUrl = 'https://docs.google.com/document/d/' + docsMatch[1] + '/preview';
    else if (slidesMatch) embedUrl = 'https://docs.google.com/presentation/d/' + slidesMatch[1] + '/embed';
    else { alert('Please paste a valid Google Sheets, Docs, or Slides URL.'); return; }
    const placeholder = '<p class="google-embed-placeholder" data-embed-url="' + embedUrl + '">[Google Embed: ' + embedUrl + ']</p>';
    editor.chain().focus().insertContent(placeholder).run();
  };

  if (!editor) return null;

  const btn = (action: () => void, label: string, active?: boolean) => (
    <button onClick={action} title={label} style={{
      padding: '4px 8px', background: active ? 'var(--accent-light)' : 'none',
      color: active ? 'var(--accent)' : 'var(--text-muted)',
      border: 'none', borderRadius: '4px', fontSize: '12px', fontWeight: '500',
      cursor: 'pointer', whiteSpace: 'nowrap',
    }}>
      {label}
    </button>
  );

  const divider = () => (
    <span style={{ width: '1px', height: '16px', background: 'var(--border)', margin: '0 4px', flexShrink: 0, display: 'inline-block' }} />
  );

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flexWrap: 'wrap', padding: '8px 12px', borderBottom: '1px solid var(--border)', background: 'var(--bg-2)' }}>
        {btn(() => editor.chain().focus().toggleBold().run(), 'B', editor.isActive('bold'))}
        {btn(() => editor.chain().focus().toggleItalic().run(), 'I', editor.isActive('italic'))}
        {btn(() => editor.chain().focus().toggleUnderline().run(), 'U', editor.isActive('underline'))}
        {divider()}
        {btn(() => editor.chain().focus().toggleHeading({ level: 1 }).run(), 'H1', editor.isActive('heading', { level: 1 }))}
        {btn(() => editor.chain().focus().toggleHeading({ level: 2 }).run(), 'H2', editor.isActive('heading', { level: 2 }))}
        {btn(() => editor.chain().focus().toggleHeading({ level: 3 }).run(), 'H3', editor.isActive('heading', { level: 3 }))}
        {divider()}
        {btn(() => editor.chain().focus().toggleBulletList().run(), '• List', editor.isActive('bulletList'))}
        {btn(() => editor.chain().focus().toggleOrderedList().run(), '1. List', editor.isActive('orderedList'))}
        {divider()}
        {btn(() => editor.chain().focus().setTextAlign('left').run(), 'Left', editor.isActive({ textAlign: 'left' }))}
        {btn(() => editor.chain().focus().setTextAlign('center').run(), 'Center', editor.isActive({ textAlign: 'center' }))}
        {btn(() => editor.chain().focus().setTextAlign('right').run(), 'Right', editor.isActive({ textAlign: 'right' }))}
        {divider()}
        {btn(() => editor.chain().focus().toggleHighlight({ color: '#fef08a' }).run(), 'Highlight', editor.isActive('highlight'))}
        {btn(() => editor.chain().focus().toggleCodeBlock().run(), 'Code', editor.isActive('codeBlock'))}
        {btn(() => editor.chain().focus().toggleBlockquote().run(), 'Quote', editor.isActive('blockquote'))}
        {divider()}
        <label title="Text color" style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', padding: '2px 6px', borderRadius: '4px', fontSize: '12px', color: 'var(--text-muted)' }}>
          A
          <input type="color" defaultValue="#172b4d"
            onChange={e => editor.chain().focus().setColor(e.target.value).run()}
            style={{ width: '16px', height: '16px', border: 'none', padding: 0, cursor: 'pointer', borderRadius: '2px' }}
          />
        </label>
        {divider()}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          style={{ padding: '4px 8px', background: 'none', color: 'var(--text-muted)', border: 'none', borderRadius: '4px', fontSize: '12px', fontWeight: '500', cursor: 'pointer' }}
        >
          {uploading ? 'Uploading...' : '📷 Image'}
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }}
          onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
        />
        <button onClick={handleGoogleEmbed} style={{ padding: '4px 10px', background: 'none', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: '500', cursor: 'pointer' }}>
          <svg width="14" height="14" viewBox="0 0 48 48" style="vertical-align:middle;margin-right:4px"><path fill="#4285F4" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#34A853" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59A14.5 14.5 0 019.5 24c0-1.59.28-3.14.76-4.59l-7.98-6.19A23.99 23.99 0 000 24c0 3.77.87 7.34 2.44 10.51l8.09-5.92z"/><path fill="#EA4335" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg> Embed
        </button>
        {divider()}
        {btn(() => editor.chain().focus().undo().run(), '↩')}
        {btn(() => editor.chain().focus().redo().run(), '↪')}
      </div>

      <EditorContent editor={editor} style={{ minHeight: '60vh', padding: '20px 24px', background: 'var(--bg-2)' }} />

      <style>{`
        .ProseMirror { outline: none; font-size: 15px; line-height: 1.7; color: var(--text); }
        .ProseMirror h1 { font-size: 22px; font-weight: 700; margin: 24px 0 12px; }
        .ProseMirror h2 { font-size: 18px; font-weight: 600; margin: 20px 0 10px; }
        .ProseMirror h3 { font-size: 15px; font-weight: 600; margin: 16px 0 8px; }
        .ProseMirror p { margin-bottom: 12px; }
        .ProseMirror ul { margin: 10px 0 14px 24px; list-style-type: disc; }
        .ProseMirror ol { margin: 10px 0 14px 24px; list-style-type: decimal; }
        .ProseMirror li { margin-bottom: 4px; }
        .ProseMirror a { color: var(--accent); }
        .ProseMirror code { background: var(--bg-3); padding: 2px 6px; border-radius: 4px; font-size: 13px; }
        .ProseMirror pre { background: var(--bg-3); padding: 14px; border-radius: 6px; margin: 12px 0; }
        .ProseMirror blockquote { border-left: 3px solid var(--border); padding-left: 14px; color: var(--text-muted); margin: 12px 0; }
        .ProseMirror mark { border-radius: 2px; padding: 0 2px; }
        .ProseMirror img { max-width: 100%; height: auto; border-radius: 6px; margin: 12px 0; }
        .ProseMirror p.is-editor-empty:first-child::before { content: 'Start editing...'; color: var(--text-muted); pointer-events: none; float: left; height: 0; }
      `}</style>
    </div>
  );
}
