'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import { 
  Bold, 
  Italic, 
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  Heading2,
  Link as LinkIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Trash2,
  Code
} from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
  disabled?: boolean;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Nhập nội dung...',
  minHeight = '120px',
  disabled = false,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3],
        },
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Underline,
      Color,
      Highlight.configure({
        multicolor: true,
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editable: !disabled,
  });

  if (!editor) {
    return null;
  }

  const addLink = () => {
    const url = prompt('Nhập URL:');
    if (url) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }
  };

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-1 bg-gray-50 p-2 border-b border-gray-300">
        {/* Text Formatting */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={disabled || !editor.can().chain().focus().toggleBold().run()}
          className={`p-2 rounded border ${
            editor.isActive('bold')
              ? 'bg-blue-100 border-blue-300 text-blue-700'
              : 'bg-white border-gray-300 hover:bg-gray-100'
          } disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
          title="Bold (Ctrl+B)"
        >
          <Bold className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={disabled || !editor.can().chain().focus().toggleItalic().run()}
          className={`p-2 rounded border ${
            editor.isActive('italic')
              ? 'bg-blue-100 border-blue-300 text-blue-700'
              : 'bg-white border-gray-300 hover:bg-gray-100'
          } disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
          title="Italic (Ctrl+I)"
        >
          <Italic className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          disabled={disabled || !editor.can().chain().focus().toggleUnderline().run()}
          className={`p-2 rounded border ${
            editor.isActive('underline')
              ? 'bg-blue-100 border-blue-300 text-blue-700'
              : 'bg-white border-gray-300 hover:bg-gray-100'
          } disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
          title="Underline (Ctrl+U)"
        >
          <UnderlineIcon className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          disabled={disabled || !editor.can().chain().focus().toggleStrike().run()}
          className={`p-2 rounded border ${
            editor.isActive('strike')
              ? 'bg-blue-100 border-blue-300 text-blue-700'
              : 'bg-white border-gray-300 hover:bg-gray-100'
          } disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
          title="Strikethrough"
        >
          <Strikethrough className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleCode().run()}
          disabled={disabled || !editor.can().chain().focus().toggleCode().run()}
          className={`p-2 rounded border ${
            editor.isActive('code')
              ? 'bg-blue-100 border-blue-300 text-blue-700'
              : 'bg-white border-gray-300 hover:bg-gray-100'
          } disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
          title="Code"
        >
          <Code className="h-4 w-4" />
        </button>

        <div className="w-px bg-gray-300 mx-1"></div>

        {/* Headings */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          disabled={disabled}
          className={`p-2 rounded border ${
            editor.isActive('heading', { level: 2 })
              ? 'bg-blue-100 border-blue-300 text-blue-700'
              : 'bg-white border-gray-300 hover:bg-gray-100'
          } disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
          title="Heading 2"
        >
          <Heading2 className="h-4 w-4" />
        </button>

        <div className="w-px bg-gray-300 mx-1"></div>

        {/* Lists */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          disabled={disabled}
          className={`p-2 rounded border ${
            editor.isActive('bulletList')
              ? 'bg-blue-100 border-blue-300 text-blue-700'
              : 'bg-white border-gray-300 hover:bg-gray-100'
          } disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
          title="Bullet List"
        >
          <List className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          disabled={disabled}
          className={`p-2 rounded border ${
            editor.isActive('orderedList')
              ? 'bg-blue-100 border-blue-300 text-blue-700'
              : 'bg-white border-gray-300 hover:bg-gray-100'
          } disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
          title="Ordered List"
        >
          <ListOrdered className="h-4 w-4" />
        </button>

        <div className="w-px bg-gray-300 mx-1"></div>

        {/* Alignment */}
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          disabled={disabled}
          className={`p-2 rounded border ${
            editor.isActive({ textAlign: 'left' })
              ? 'bg-blue-100 border-blue-300 text-blue-700'
              : 'bg-white border-gray-300 hover:bg-gray-100'
          } disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
          title="Align Left"
        >
          <AlignLeft className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          disabled={disabled}
          className={`p-2 rounded border ${
            editor.isActive({ textAlign: 'center' })
              ? 'bg-blue-100 border-blue-300 text-blue-700'
              : 'bg-white border-gray-300 hover:bg-gray-100'
          } disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
          title="Align Center"
        >
          <AlignCenter className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          disabled={disabled}
          className={`p-2 rounded border ${
            editor.isActive({ textAlign: 'right' })
              ? 'bg-blue-100 border-blue-300 text-blue-700'
              : 'bg-white border-gray-300 hover:bg-gray-100'
          } disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
          title="Align Right"
        >
          <AlignRight className="h-4 w-4" />
        </button>

        <div className="w-px bg-gray-300 mx-1"></div>

        {/* Link */}
        <button
          type="button"
          onClick={addLink}
          disabled={disabled}
          className={`p-2 rounded border ${
            editor.isActive('link')
              ? 'bg-blue-100 border-blue-300 text-blue-700'
              : 'bg-white border-gray-300 hover:bg-gray-100'
          } disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
          title="Insert Link"
        >
          <LinkIcon className="h-4 w-4" />
        </button>

        <div className="w-px bg-gray-300 mx-1"></div>

        {/* Clear */}
        <button
          type="button"
          onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
          disabled={disabled}
          className="p-2 rounded border bg-white border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Clear Formatting"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Editor */}
      <div 
        className="border-t border-gray-300 bg-white rounded-b-lg overflow-hidden"
        style={{
          minHeight,
        }}
      >
        <EditorContent
          editor={editor}
          className="w-full h-full"
        />
      </div>
      <style>{`
        .ProseMirror {
          outline: none;
          padding: 0.75rem;
          font-size: 0.875rem;
          cursor: text !important;
          white-space: pre-wrap;
          word-wrap: break-word;
          width: 100%;
          height: 100%;
          min-height: 100%;
          overflow-wrap: break-word;
          line-height: 1.6;
          box-sizing: border-box;
          pointer-events: auto;
        }
        .ProseMirror * {
          cursor: text;
        }
        .ProseMirror:focus {
          outline: none;
        }
        .ProseMirror:hover {
          cursor: text;
        }
        .ProseMirror > * + * {
          margin-top: 0.75rem;
        }
        .ProseMirror ul,
        .ProseMirror ol {
          padding: 0 1rem;
        }
        .ProseMirror code {
          background-color: #f3f4f6;
          color: #1f2937;
          padding: 0.25rem 0.5rem;
          border-radius: 0.25rem;
          font-family: monospace;
          cursor: text;
        }
        .ProseMirror a {
          color: #3b82f6;
          text-decoration: underline;
          cursor: pointer;
        }
        .ProseMirror h2 {
          font-size: 1.5rem;
          font-weight: 600;
          margin-top: 1.5rem;
        }
        .ProseMirror h3 {
          font-size: 1.25rem;
          font-weight: 600;
          margin-top: 1.25rem;
        }
        .ProseMirror blockquote {
          border-left: 4px solid #ddd;
          padding-left: 1rem;
          font-style: italic;
          color: #666;
        }
        .ProseMirror p {
          margin: 0;
        }
      `}</style>
    </div>
  );
}

