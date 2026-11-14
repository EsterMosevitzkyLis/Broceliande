// Map file text (M4a §1.1): pretty-printed with a stable layout, so Git diffs stay readable. Keys keep
// their order; an array or object stays on one line when it fits in WIDTH characters (counted from
// its indent), otherwise it opens with one entry per line. Strings are ASCII, anything else escaped
// as \uXXXX. This is the layout the 35 baked files were written in, so saving a file with no edits
// writes it back unchanged.

const WIDTH = 110;

const string = (s) => JSON.stringify(s).replace(/[\u007f-￿]/g, (ch) => `\\u${ch.charCodeAt(0).toString(16).padStart(4, '0')}`);

function scalar(v) {
  if (typeof v === 'string') return string(v);
  if (typeof v === 'number' && !Number.isFinite(v)) throw new Error(`a map file can't hold the number ${v}`);
  return JSON.stringify(v ?? null);
}

const isContainer = (v) => v !== null && typeof v === 'object';
const isEmpty = (v) => (Array.isArray(v) ? v.length === 0 : Object.keys(v).length === 0);

function inline(v) {
  if (Array.isArray(v)) return `[${v.map(inline).join(', ')}]`;
  if (isContainer(v)) return isEmpty(v) ? '{}' : `{ ${Object.entries(v).map(([k, x]) => `${string(k)}: ${inline(x)}`).join(', ')} }`;
  return scalar(v);
}

function format(v, indent, force = false) {
  const s = inline(v);
  if (!force && (indent.length + s.length <= WIDTH || !isContainer(v) || isEmpty(v))) return s;
  const inner = `${indent}  `;
  if (Array.isArray(v)) return `[\n${v.map((x) => inner + format(x, inner)).join(',\n')}\n${indent}]`;
  return `{\n${Object.entries(v).map(([k, x]) => `${inner}${string(k)}: ${format(x, inner)}`).join(',\n')}\n${indent}}`;
}

// The whole file's text, ending with a newline.
export function formatMap(map) {
  return `${format(map, '', true)}\n`;
}
