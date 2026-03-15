// sanitize-html uses `export =` (CommonJS) — use TypeScript require-style import
import sanitizeHtml = require('sanitize-html');

/**
 * Allowed HTML tags and attributes for Tiptap rich text content.
 * Strips script/iframe/event-handler attributes to prevent XSS.
 */
const ALLOWED_TAGS = [
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'p',
  'br',
  'hr',
  'strong',
  'b',
  'em',
  'i',
  'u',
  's',
  'del',
  'ul',
  'ol',
  'li',
  'a',
  'blockquote',
  'code',
  'pre',
  'span',
  'div',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
  'img',
];

const ALLOWED_ATTRIBUTES: sanitizeHtml.IOptions['allowedAttributes'] = {
  a: ['href', 'target', 'rel'],
  img: ['src', 'alt', 'width', 'height'],
  span: ['style', 'class'],
  div: ['style', 'class'],
  p: ['style'],
  h1: ['style'],
  h2: ['style'],
  h3: ['style'],
  h4: ['style'],
  h5: ['style'],
  h6: ['style'],
  td: ['colspan', 'rowspan', 'style'],
  th: ['colspan', 'rowspan', 'style'],
};

/**
 * Sanitizes Tiptap-generated HTML before saving to the database.
 * Returns null if the input is empty/null.
 */
export function sanitizeRichText(html: string | null | undefined): string | null {
  if (!html) return null;
  const cleaned = sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRIBUTES,
    allowedSchemes: ['https', 'http', 'mailto'],
    allowedSchemesByTag: {
      a: ['https', 'http', 'mailto'],
      img: ['https', 'http', 'data'],
    },
  });
  return cleaned || null;
}
