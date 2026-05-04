const DEFAULT_PLACEHOLDER =
  'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=600&auto=format&fit=crop';

const palettes = [
  { start: '#1d4ed8', end: '#0f172a', accent: '#67e8f9' },
  { start: '#0f766e', end: '#172554', accent: '#5eead4' },
  { start: '#7c3aed', end: '#1e1b4b', accent: '#c4b5fd' },
  { start: '#b45309', end: '#1f2937', accent: '#fde68a' },
  { start: '#be123c', end: '#111827', accent: '#fda4af' }
];

const hashTitle = (title: string) => {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = (hash * 31 + title.charCodeAt(i)) >>> 0;
  }
  return hash;
};

const inferTrack = (title: string) => {
  const lowered = title.toLowerCase();
  if (/(safety|osha|compliance|audit|inspection)/.test(lowered)) return 'Safety Track';
  if (/(sales|customer|crm|rubbertree)/.test(lowered)) return 'Sales Track';
  if (/(parts|inventory|warehouse|epicor|p21)/.test(lowered)) return 'Operations Track';
  if (/(electric|voltage|power|distribution|wire)/.test(lowered)) return 'Electrical Track';
  if (/(hydraulic|hose|fitting|rope|swivel)/.test(lowered)) return 'Equipment Track';
  if (/(leadership|mentor|management|coach)/.test(lowered)) return 'Leadership Track';
  if (/(service|repair|field|maintenance|shop)/.test(lowered)) return 'Service Track';
  return 'Tallman Learning';
};

const inferBadge = (title: string) => {
  const lowered = title.toLowerCase();
  if (/(safety|osha|compliance|audit|inspection)/.test(lowered)) return 'SAFE';
  if (/(sales|customer|crm|rubbertree)/.test(lowered)) return 'SELL';
  if (/(parts|inventory|warehouse|epicor|p21)/.test(lowered)) return 'OPS';
  if (/(electric|voltage|power|distribution|wire)/.test(lowered)) return 'ELEC';
  if (/(hydraulic|hose|fitting|rope|swivel)/.test(lowered)) return 'MECH';
  if (/(leadership|mentor|management|coach)/.test(lowered)) return 'LEAD';
  if (/(service|repair|field|maintenance|shop)/.test(lowered)) return 'SERV';
  return 'LMS';
};

const wrapTitle = (title: string, maxLineLength = 22) => {
  const words = title.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxLineLength || current.length === 0) {
      current = next;
      continue;
    }
    lines.push(current);
    current = word;
    if (lines.length === 2) break;
  }

  if (current && lines.length < 3) lines.push(current);
  if (lines.length === 0) lines.push('Tallman Learning');

  return lines.slice(0, 3).map((line, index, arr) => {
    if (index === arr.length - 1 && words.join(' ').length > arr.join(' ').length) {
      return `${line.slice(0, Math.max(0, maxLineLength - 1))}…`;
    }
    return line;
  });
};

export const needsGeneratedCourseThumbnail = (thumbnailUrl?: string | null) => {
  return !thumbnailUrl || thumbnailUrl.trim() === '' || thumbnailUrl === DEFAULT_PLACEHOLDER;
};

export const generateCourseThumbnail = (title: string) => {
  const safeTitle = (title || 'Tallman Learning').trim();
  const palette = palettes[hashTitle(safeTitle) % palettes.length];
  const badge = inferBadge(safeTitle);
  const track = inferTrack(safeTitle);
  const lines = wrapTitle(safeTitle);
  const lineMarkup = lines
    .map(
      (line, index) =>
        `<text x="72" y="${190 + index * 58}" fill="#ffffff" font-size="${index === 0 ? 42 : 36}" font-weight="800">${line
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')}</text>`
    )
    .join('');

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${palette.start}" />
          <stop offset="100%" stop-color="${palette.end}" />
        </linearGradient>
        <radialGradient id="glow" cx="20%" cy="20%" r="90%">
          <stop offset="0%" stop-color="rgba(255,255,255,0.18)" />
          <stop offset="100%" stop-color="rgba(255,255,255,0)" />
        </radialGradient>
      </defs>
      <rect width="1200" height="675" rx="36" fill="url(#bg)" />
      <rect width="1200" height="675" rx="36" fill="url(#glow)" />
      <circle cx="1010" cy="140" r="180" fill="${palette.accent}" opacity="0.15" />
      <circle cx="980" cy="560" r="210" fill="#ffffff" opacity="0.05" />
      <path d="M850 110 L1070 420 L930 420 L810 610 L610 610 L760 370 L640 370 Z" fill="#ffffff" opacity="0.08" />
      <rect x="72" y="72" width="212" height="48" rx="24" fill="rgba(255,255,255,0.14)" stroke="rgba(255,255,255,0.18)" />
      <text x="106" y="103" fill="#ffffff" font-size="24" font-weight="800" letter-spacing="3">${badge}</text>
      <text x="72" y="156" fill="rgba(255,255,255,0.72)" font-size="22" font-weight="700" letter-spacing="2">TALLMAN LEARNING LMS</text>
      ${lineMarkup}
      <text x="72" y="420" fill="${palette.accent}" font-size="26" font-weight="700">${track}</text>
      <text x="72" y="482" fill="rgba(255,255,255,0.82)" font-size="22" font-weight="500">Training, certification, and workforce readiness</text>
      <rect x="72" y="545" width="420" height="58" rx="29" fill="rgba(255,255,255,0.10)" stroke="rgba(255,255,255,0.14)" />
      <text x="108" y="582" fill="#ffffff" font-size="20" font-weight="700">Tallman Equipment Co.</text>
      <text x="1055" y="86" text-anchor="end" fill="rgba(255,255,255,0.52)" font-size="18" font-weight="700">AUTO-GENERATED COURSE VISUAL</text>
    </svg>
  `.trim();

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

