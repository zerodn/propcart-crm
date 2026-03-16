'use client';

import { useRef, useEffect, useState } from 'react';
import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import TextStyle from '@tiptap/extension-text-style';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  Pilcrow,
  Heading2,
  Heading3,
  Link as LinkIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Trash2,
  Code,
  Paintbrush,
  Quote,
  Minus,
  Undo2,
  Redo2,
  Highlighter,
  ImagePlus,
  Table2,
  Rows3,
  Columns3,
  Merge,
  Split,
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon,
} from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
  disabled?: boolean;
}

const TEXT_COLORS = [
  { label: 'Mặc định', value: '' },
  { label: 'Đen', value: '#111827' },
  { label: 'Đỏ', value: '#dc2626' },
  { label: 'Cam', value: '#ea580c' },
  { label: 'Vàng', value: '#ca8a04' },
  { label: 'Xanh lá', value: '#16a34a' },
  { label: 'Xanh dương', value: '#2563eb' },
  { label: 'Tím', value: '#7c3aed' },
];

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Nhập nội dung...',
  minHeight = '120px',
  disabled = false,
}: RichTextEditorProps) {
  const [isSourceMode, setIsSourceMode] = useState(false);
  const [sourceValue, setSourceValue] = useState(value ?? '');

  const editor = useEditor(
    {
      immediatelyRender: false,
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
        TextStyle,
        Underline,
        Color,
        Subscript,
        Superscript,
        Image.configure({
          inline: false,
          allowBase64: true,
        }),
        Table.configure({
          resizable: true,
        }),
        TableRow,
        TableHeader,
        TableCell,
        Placeholder.configure({
          placeholder,
          emptyEditorClass:
            'before:content-[attr(data-placeholder)] before:float-left before:text-gray-400 before:pointer-events-none before:h-0',
        }),
        Highlight.configure({
          multicolor: true,
        }),
      ],
      content: value,
      onUpdate: ({ editor }) => {
        onChange(editor.getHTML());
      },
      editable: !disabled,
    },
    [disabled, placeholder],
  );

  const colorInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSourceValue(value ?? '');
  }, [value]);

  // Update editor editable state based on source mode
  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!isSourceMode && !disabled);
  }, [isSourceMode, disabled, editor]);

  // Sync external value changes into the editor (e.g. when loading an existing project)
  // onUpdate keeps editor → state in sync; this keeps state → editor in sync.
  useEffect(() => {
    if (isSourceMode) return;
    if (!editor) return;
    const currentHTML = editor.getHTML();
    // Treat Tiptap's empty-doc '<p></p>' as equivalent to '' so we don't spuriously override
    const normalizedCurrent = currentHTML === '<p></p>' ? '' : currentHTML;
    const normalizedValue = value ?? '';
    if (normalizedCurrent !== normalizedValue) {
      editor.commands.setContent(normalizedValue, false /* don't emit onUpdate → no loop */);
    }
  }, [value, editor, isSourceMode]);

  if (!editor) {
    return null;
  }

  const baseButtonClass =
    'p-2 rounded border disabled:opacity-50 disabled:cursor-not-allowed transition-colors';

  const getButtonClass = (isActive: boolean) =>
    `${baseButtonClass} ${
      isActive
        ? 'bg-blue-100 border-blue-300 text-blue-700'
        : 'bg-white border-gray-300 hover:bg-gray-100'
    }`;

  const addLink = () => {
    const currentHref = editor.getAttributes('link')?.href as string | undefined;
    const url = prompt('Nhập URL:', currentHref ?? 'https://');

    if (url === null) {
      return;
    }

    const normalizedUrl = url.trim();
    if (!normalizedUrl) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: normalizedUrl }).run();
  };

  const removeLink = () => {
    editor.chain().focus().extendMarkRange('link').unsetLink().run();
  };

  const addImage = () => {
    const currentSrc = editor.getAttributes('image')?.src as string | undefined;
    const src = prompt('Nhập URL hình ảnh:', currentSrc ?? 'https://');

    if (src === null) {
      return;
    }

    const normalizedSrc = src.trim();
    if (!normalizedSrc) {
      return;
    }

    editor.chain().focus().setImage({ src: normalizedSrc }).run();
  };

  const insertTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  const toggleSourceMode = () => {
    if (!editor) return;

    if (isSourceMode) {
      editor.commands.setContent(sourceValue || '', false);
      onChange(sourceValue || '');
      setIsSourceMode(false);
      return;
    }

    const html = editor.getHTML();
    const normalizedHtml = html === '<p></p>' ? '' : html;
    setSourceValue(normalizedHtml);
    setIsSourceMode(true);
  };

  const currentColor = editor.getAttributes('textStyle')?.color as string | undefined;

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-1 bg-gray-50 p-2 border-b border-gray-300">
        {/* History */}
        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={disabled || isSourceMode || !editor.can().chain().focus().undo().run()}
          className={getButtonClass(false)}
          title="Undo"
        >
          <Undo2 className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={disabled || isSourceMode || !editor.can().chain().focus().redo().run()}
          className={getButtonClass(false)}
          title="Redo"
        >
          <Redo2 className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={toggleSourceMode}
          disabled={disabled}
          className={getButtonClass(isSourceMode)}
          title={isSourceMode ? 'Quay lại chế độ soạn thảo' : 'Chỉnh sửa HTML trực tiếp'}
        >
          <span className="text-xs font-semibold">HTML</span>
        </button>

        <div className="w-px bg-gray-300 mx-1"></div>

        {/* Block type */}
        <button
          type="button"
          onClick={() => editor.chain().focus().setParagraph().run()}
          disabled={disabled || isSourceMode}
          className={getButtonClass(editor.isActive('paragraph'))}
          title="Paragraph"
        >
          <Pilcrow className="h-4 w-4" />
        </button>

        {/* Text Formatting */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={disabled || isSourceMode || !editor.can().chain().focus().toggleBold().run()}
          className={getButtonClass(editor.isActive('bold'))}
          title="Bold (Ctrl+B)"
        >
          <Bold className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={disabled || isSourceMode || !editor.can().chain().focus().toggleItalic().run()}
          className={getButtonClass(editor.isActive('italic'))}
          title="Italic (Ctrl+I)"
        >
          <Italic className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          disabled={
            disabled || isSourceMode || !editor.can().chain().focus().toggleUnderline().run()
          }
          className={getButtonClass(editor.isActive('underline'))}
          title="Underline (Ctrl+U)"
        >
          <UnderlineIcon className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          disabled={disabled || isSourceMode || !editor.can().chain().focus().toggleStrike().run()}
          className={getButtonClass(editor.isActive('strike'))}
          title="Strikethrough"
        >
          <Strikethrough className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleCode().run()}
          disabled={disabled || isSourceMode || !editor.can().chain().focus().toggleCode().run()}
          className={getButtonClass(editor.isActive('code'))}
          title="Code"
        >
          <Code className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleSubscript().run()}
          disabled={disabled || isSourceMode}
          className={getButtonClass(editor.isActive('subscript'))}
          title="Subscript"
        >
          <SubscriptIcon className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleSuperscript().run()}
          disabled={disabled || isSourceMode}
          className={getButtonClass(editor.isActive('superscript'))}
          title="Superscript"
        >
          <SuperscriptIcon className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHighlight({ color: '#FEF08A' }).run()}
          disabled={disabled || isSourceMode}
          className={getButtonClass(editor.isActive('highlight'))}
          title="Highlight"
        >
          <Highlighter className="h-4 w-4" />
        </button>

        <div className="w-px bg-gray-300 mx-1"></div>

        {/* Headings */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          disabled={disabled || isSourceMode}
          className={getButtonClass(editor.isActive('heading', { level: 2 }))}
          title="Heading 2"
        >
          <Heading2 className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          disabled={disabled || isSourceMode}
          className={getButtonClass(editor.isActive('heading', { level: 3 }))}
          title="Heading 3"
        >
          <Heading3 className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          disabled={disabled || isSourceMode}
          className={getButtonClass(editor.isActive('blockquote'))}
          title="Blockquote"
        >
          <Quote className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          disabled={disabled || isSourceMode}
          className={getButtonClass(editor.isActive('codeBlock'))}
          title="Code Block"
        >
          <Code className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          disabled={disabled || isSourceMode}
          className={getButtonClass(false)}
          title="Horizontal Rule"
        >
          <Minus className="h-4 w-4" />
        </button>

        <div className="w-px bg-gray-300 mx-1"></div>

        {/* Media and tables */}
        <button
          type="button"
          onClick={addImage}
          disabled={disabled || isSourceMode}
          className={getButtonClass(editor.isActive('image'))}
          title="Insert Image"
        >
          <ImagePlus className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={insertTable}
          disabled={disabled || isSourceMode}
          className={getButtonClass(editor.isActive('table'))}
          title="Insert Table"
        >
          <Table2 className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().addRowAfter().run()}
          disabled={disabled || isSourceMode || !editor.isActive('table')}
          className={getButtonClass(false)}
          title="Add Row"
        >
          <Rows3 className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().addColumnAfter().run()}
          disabled={disabled || isSourceMode || !editor.isActive('table')}
          className={getButtonClass(false)}
          title="Add Column"
        >
          <Columns3 className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeaderRow().run()}
          disabled={disabled || isSourceMode || !editor.isActive('table')}
          className={getButtonClass(false)}
          title="Toggle Header Row"
        >
          <Table2 className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().mergeCells().run()}
          disabled={disabled || isSourceMode || !editor.isActive('table')}
          className={getButtonClass(false)}
          title="Merge Cells"
        >
          <Merge className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().splitCell().run()}
          disabled={disabled || isSourceMode || !editor.isActive('table')}
          className={getButtonClass(false)}
          title="Split Cell"
        >
          <Split className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().deleteTable().run()}
          disabled={disabled || isSourceMode || !editor.isActive('table')}
          className={getButtonClass(false)}
          title="Delete Table"
        >
          <Trash2 className="h-4 w-4" />
        </button>

        <div className="w-px bg-gray-300 mx-1"></div>

        {/* Lists */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          disabled={disabled || isSourceMode}
          className={getButtonClass(editor.isActive('bulletList'))}
          title="Bullet List"
        >
          <List className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          disabled={disabled || isSourceMode}
          className={getButtonClass(editor.isActive('orderedList'))}
          title="Ordered List"
        >
          <ListOrdered className="h-4 w-4" />
        </button>

        <div className="w-px bg-gray-300 mx-1"></div>

        {/* Alignment */}
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          disabled={disabled || isSourceMode}
          className={getButtonClass(editor.isActive({ textAlign: 'left' }))}
          title="Align Left"
        >
          <AlignLeft className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          disabled={disabled || isSourceMode}
          className={getButtonClass(editor.isActive({ textAlign: 'center' }))}
          title="Align Center"
        >
          <AlignCenter className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          disabled={disabled || isSourceMode}
          className={getButtonClass(editor.isActive({ textAlign: 'right' }))}
          title="Align Right"
        >
          <AlignRight className="h-4 w-4" />
        </button>

        <div className="w-px bg-gray-300 mx-1"></div>

        {/* Link */}
        <button
          type="button"
          onClick={addLink}
          disabled={disabled || isSourceMode}
          className={getButtonClass(editor.isActive('link'))}
          title="Insert Link"
        >
          <LinkIcon className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={removeLink}
          disabled={disabled || isSourceMode || !editor.isActive('link')}
          className={getButtonClass(false)}
          title="Remove Link"
        >
          <span className="text-xs font-semibold">Unlink</span>
        </button>

        <div className="w-px bg-gray-300 mx-1"></div>

        {/* Clear */}
        <button
          type="button"
          onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().setParagraph().run()}
          disabled={disabled || isSourceMode}
          className={getButtonClass(false)}
          title="Clear Formatting"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <input
        ref={colorInputRef}
        type="color"
        defaultValue={currentColor ?? '#000000'}
        className="absolute opacity-0 w-0 h-0 pointer-events-none"
        onChange={(e) => {
          editor.chain().focus().setColor(e.target.value).run();
        }}
      />

      {/* Bubble Menu — color picker on text selection */}
      <BubbleMenu
        editor={editor}
        tippyOptions={{ duration: 100, placement: 'top' }}
        shouldShow={({ editor: ed }) => !isSourceMode && !ed.state.selection.empty}
      >
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg shadow-lg p-1.5">
          <span className="text-[10px] text-gray-400 mr-1 select-none">Màu:</span>
          {TEXT_COLORS.map((item) => {
            const isActive = item.value
              ? (currentColor ?? '').toLowerCase() === item.value.toLowerCase()
              : !currentColor;

            return (
              <button
                key={item.label}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  if (item.value) {
                    editor.chain().focus().setColor(item.value).run();
                  } else {
                    editor.chain().focus().unsetColor().run();
                  }
                }}
                disabled={disabled}
                className={`h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all ${
                  isActive
                    ? 'border-blue-400 ring-2 ring-blue-200 scale-110'
                    : 'border-gray-200 hover:scale-110'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
                title={`Màu chữ: ${item.label}`}
                aria-label={`Màu chữ: ${item.label}`}
                style={
                  item.value ? { backgroundColor: item.value } : { backgroundColor: '#ffffff' }
                }
              >
                {!item.value && <span className="text-[9px] font-bold text-gray-500">A</span>}
              </button>
            );
          })}
          {/* Divider */}
          <div className="w-px h-5 bg-gray-200 mx-0.5" />

          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              colorInputRef.current?.click();
            }}
            disabled={disabled}
            className="h-6 w-6 rounded-full border-2 border-gray-200 hover:scale-110 flex items-center justify-center transition-all bg-white disabled:opacity-50 disabled:cursor-not-allowed"
            title="Chọn màu tùy chỉnh"
            aria-label="Chọn màu tùy chỉnh"
          >
            <Paintbrush className="h-3 w-3 text-gray-500" />
          </button>
        </div>
      </BubbleMenu>

      {/* Editor */}
      <div
        className="border-t border-gray-300 bg-white rounded-b-lg overflow-hidden"
        style={{
          minHeight,
        }}
      >
        <textarea
          value={sourceValue}
          onChange={(e) => {
            setSourceValue(e.target.value);
            onChange(e.target.value);
          }}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full min-h-[inherit] h-full resize-y border-0 p-3 font-mono text-sm leading-6 text-gray-800 outline-none"
          style={{ display: isSourceMode ? 'block' : 'none', minHeight }}
        />
        <div style={{ display: isSourceMode ? 'none' : 'block', width: '100%', height: '100%' }}>
          <EditorContent editor={editor} className="w-full h-full" />
        </div>
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
        .ProseMirror pre {
          background: #111827;
          color: #f9fafb;
          padding: 0.875rem 1rem;
          border-radius: 0.5rem;
          overflow-x: auto;
        }
        .ProseMirror pre code {
          background: transparent;
          color: inherit;
          padding: 0;
        }
        .ProseMirror a {
          color: #3b82f6;
          text-decoration: underline;
          cursor: pointer;
        }
        .ProseMirror img {
          max-width: 100%;
          height: auto;
          border-radius: 0.5rem;
          margin: 0.75rem 0;
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
        .ProseMirror hr {
          border: none;
          border-top: 1px solid #d1d5db;
          margin: 1rem 0;
        }
        .ProseMirror table {
          border-collapse: collapse;
          table-layout: fixed;
          width: 100%;
          margin: 1rem 0;
          overflow: hidden;
        }
        .ProseMirror table td,
        .ProseMirror table th {
          border: 1px solid #d1d5db;
          min-width: 120px;
          padding: 0.5rem 0.75rem;
          position: relative;
          vertical-align: top;
        }
        .ProseMirror table th {
          background: #f9fafb;
          font-weight: 600;
        }
        .ProseMirror .selectedCell:after {
          background: rgba(59, 130, 246, 0.12);
          content: '';
          inset: 0;
          pointer-events: none;
          position: absolute;
          z-index: 2;
        }
        .ProseMirror .column-resize-handle {
          background-color: #3b82f6;
          bottom: -2px;
          pointer-events: none;
          position: absolute;
          right: -2px;
          top: 0;
          width: 4px;
        }
        .ProseMirror p {
          margin: 0;
        }
      `}</style>
    </div>
  );
}
