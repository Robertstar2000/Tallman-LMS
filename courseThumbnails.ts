const DEFAULT_PLACEHOLDER =
  'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=600&auto=format&fit=crop';

const palettes = [
  { start: '#1d4ed8', end: '#0f172a', accent: '#67e8f9', surface: '#dbeafe' },
  { start: '#0f766e', end: '#172554', accent: '#5eead4', surface: '#ccfbf1' },
  { start: '#7c3aed', end: '#1e1b4b', accent: '#c4b5fd', surface: '#ede9fe' },
  { start: '#b45309', end: '#1f2937', accent: '#fde68a', surface: '#fef3c7' },
  { start: '#be123c', end: '#111827', accent: '#fda4af', surface: '#ffe4e6' },
  { start: '#065f46', end: '#111827', accent: '#6ee7b7', surface: '#d1fae5' },
  { start: '#1e3a8a', end: '#111827', accent: '#93c5fd', surface: '#dbeafe' }
];

const hashTitle = (title: string) => {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = (hash * 31 + title.charCodeAt(i)) >>> 0;
  }
  return hash;
};

type VisualProfile = {
  track: string;
  badge: string;
  motif: string;
  icon: string;
  keywords: string[];
};

const visualProfiles: VisualProfile[] = [
  {
    track: 'Safety Track',
    badge: 'SAFE',
    motif: 'shield',
    icon: 'SHIELD',
    keywords: ['safety', 'osha', 'compliance', 'audit', 'inspection', 'ppe']
  },
  {
    track: 'Sales Track',
    badge: 'SELL',
    motif: 'growth',
    icon: 'GROWTH',
    keywords: ['sales', 'customer', 'crm', 'rental', 'revenue', 'account']
  },
  {
    track: 'Operations Track',
    badge: 'OPS',
    motif: 'warehouse',
    icon: 'OPS',
    keywords: ['parts', 'inventory', 'warehouse', 'epicor', 'p21', 'shipping', 'receiving', 'logistics']
  },
  {
    track: 'Electrical Track',
    badge: 'ELEC',
    motif: 'voltage',
    icon: 'HV',
    keywords: ['electric', 'voltage', 'power', 'distribution', 'wire', 'dielectric', 'utility', 'substation']
  },
  {
    track: 'Equipment Track',
    badge: 'MECH',
    motif: 'rigging',
    icon: 'RIG',
    keywords: ['hydraulic', 'hose', 'fitting', 'rope', 'swivel', 'rigging', 'lineman', 'tool']
  },
  {
    track: 'Leadership Track',
    badge: 'LEAD',
    motif: 'summit',
    icon: 'LEAD',
    keywords: ['leadership', 'mentor', 'management', 'coach', 'executive', 'strategy']
  },
  {
    track: 'Service Track',
    badge: 'SERV',
    motif: 'service',
    icon: 'SERV',
    keywords: ['service', 'repair', 'field', 'maintenance', 'shop', 'diagnostic']
  }
];

const escapeSvgText = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const inferProfile = (title: string) => {
  const lowered = title.toLowerCase();
  return (
    visualProfiles.find(profile => profile.keywords.some(keyword => lowered.includes(keyword))) || {
      track: 'Tallman Learning',
      badge: 'LMS',
      motif: 'framework',
      icon: 'LMS',
      keywords: []
    }
  );
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
      return `${line.slice(0, Math.max(0, maxLineLength - 1))}...`;
    }
    return line;
  });
};

const buildMotif = (motif: string, accent: string, surface: string, variant: number) => {
  switch (motif) {
    case 'voltage':
      return `
        <g opacity="0.95">
          <path d="M870 126 L985 126 L935 236 L1025 236 L890 424 L930 292 L844 292 Z" fill="${accent}" />
          <path d="M1010 116 L1110 200 L1070 242 L1134 306 L1070 354 L1112 404 L1020 474" fill="none" stroke="#ffffff" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" opacity="0.34" />
          <circle cx="922" cy="196" r="154" fill="${surface}" opacity="0.12" />
        </g>
      `;
    case 'warehouse':
      return `
        <g opacity="0.9">
          <rect x="808" y="130" width="260" height="292" rx="26" fill="rgba(255,255,255,0.10)" stroke="rgba(255,255,255,0.14)" />
          <path d="M840 184 H1032 M840 242 H1032 M840 300 H1032 M840 358 H1032" stroke="${accent}" stroke-width="10" stroke-linecap="round" opacity="0.8" />
          <path d="M884 154 V394 M948 154 V394 M1012 154 V394" stroke="#ffffff" stroke-width="8" stroke-linecap="round" opacity="0.32" />
          <rect x="${846 + variant * 18}" y="${206 + (variant % 3) * 58}" width="54" height="34" rx="8" fill="${surface}" opacity="0.78" />
        </g>
      `;
    case 'rigging':
      return `
        <g opacity="0.94">
          <path d="M844 142 C948 84, 1040 120, 1076 212 C1098 268, 1082 344, 1024 382 C958 426, 860 414, 808 334 C756 254, 772 182, 844 142 Z" fill="none" stroke="#ffffff" stroke-width="18" stroke-linecap="round" />
          <circle cx="942" cy="264" r="98" fill="none" stroke="${accent}" stroke-width="18" stroke-dasharray="18 18" />
          <path d="M882 214 L1006 338" stroke="${surface}" stroke-width="14" stroke-linecap="round" />
          <path d="M1006 214 L882 338" stroke="${surface}" stroke-width="14" stroke-linecap="round" opacity="0.65" />
        </g>
      `;
    case 'summit':
      return `
        <g opacity="0.95">
          <path d="M782 420 L902 178 L998 322 L1064 224 L1138 420 Z" fill="rgba(255,255,255,0.14)" />
          <path d="M840 420 L942 228 L1018 342 L1080 260 L1130 420 Z" fill="${accent}" opacity="0.36" />
          <circle cx="1016" cy="142" r="44" fill="${surface}" opacity="0.9" />
          <path d="M1016 110 V174 M984 142 H1048" stroke="${paletteSafeStroke(accent)}" stroke-width="10" stroke-linecap="round" />
        </g>
      `;
    case 'service':
      return `
        <g opacity="0.94">
          <circle cx="960" cy="250" r="114" fill="rgba(255,255,255,0.10)" />
          <path d="M960 164 L990 204 L1042 194 L1032 248 L1078 280 L1030 314 L1038 368 L988 354 L960 392 L932 354 L882 368 L890 314 L842 280 L888 248 L878 194 L930 204 Z" fill="${accent}" opacity="0.84" />
          <circle cx="960" cy="280" r="42" fill="${surface}" opacity="0.95" />
        </g>
      `;
    case 'shield':
      return `
        <g opacity="0.95">
          <path d="M960 126 L1082 170 V282 C1082 356 1034 422 960 454 C886 422 838 356 838 282 V170 Z" fill="rgba(255,255,255,0.12)" stroke="#ffffff" stroke-width="12" />
          <path d="M908 286 L948 326 L1022 236" fill="none" stroke="${accent}" stroke-width="18" stroke-linecap="round" stroke-linejoin="round" />
        </g>
      `;
    case 'growth':
      return `
        <g opacity="0.94">
          <path d="M826 388 H1106" stroke="rgba(255,255,255,0.20)" stroke-width="12" stroke-linecap="round" />
          <rect x="850" y="308" width="58" height="80" rx="12" fill="${surface}" opacity="0.78" />
          <rect x="932" y="264" width="58" height="124" rx="12" fill="${accent}" opacity="0.88" />
          <rect x="1014" y="206" width="58" height="182" rx="12" fill="#ffffff" opacity="0.62" />
          <path d="M842 222 L930 160 L986 214 L1092 118" fill="none" stroke="${accent}" stroke-width="14" stroke-linecap="round" stroke-linejoin="round" />
        </g>
      `;
    default:
      return `
        <g opacity="0.92">
          <rect x="820" y="146" width="252" height="240" rx="32" fill="rgba(255,255,255,0.10)" stroke="rgba(255,255,255,0.14)" />
          <path d="M852 214 H1040 M852 272 H1040 M852 330 H980" stroke="${accent}" stroke-width="12" stroke-linecap="round" />
          <circle cx="${1028 + variant * 6}" cy="${204 + (variant % 4) * 24}" r="16" fill="${surface}" opacity="0.88" />
        </g>
      `;
  }
};

const paletteSafeStroke = (accent: string) => accent;

const isLegacyGeneratedThumbnail = (thumbnailUrl: string) =>
  thumbnailUrl.startsWith('data:image/svg+xml') || thumbnailUrl.startsWith('data:image/svg+xml;charset=UTF-8');

const isLocalUploadThumbnail = (thumbnailUrl: string) =>
  thumbnailUrl.includes('/uploads/') || thumbnailUrl.startsWith('uploads/');

export const needsGeneratedCourseThumbnail = (thumbnailUrl?: string | null) => {
  if (!thumbnailUrl) return true;
  const trimmed = thumbnailUrl.trim();
  return trimmed === '' || trimmed === DEFAULT_PLACEHOLDER;
};

export const shouldPersistGeneratedCourseThumbnail = (thumbnailUrl?: string | null) => {
  if (!thumbnailUrl) return true;
  const trimmed = thumbnailUrl.trim();
  if (trimmed === '' || trimmed === DEFAULT_PLACEHOLDER) return true;
  if (isLocalUploadThumbnail(trimmed)) return false;
  if (isLegacyGeneratedThumbnail(trimmed)) return true;
  if (/images\.unsplash\.com/i.test(trimmed)) return true;
  if (/^https?:\/\//i.test(trimmed)) return true;
  return false;
};

export const resolveCourseThumbnail = (title: string, thumbnailUrl?: string | null) => {
  if (shouldPersistGeneratedCourseThumbnail(thumbnailUrl)) {
    return generateCourseThumbnail(title);
  }
  return thumbnailUrl || generateCourseThumbnail(title);
};

export const generateCourseThumbnail = (title: string) => {
  const safeTitle = (title || 'Tallman Learning').trim();
  const palette = palettes[hashTitle(safeTitle) % palettes.length];
  const profile = inferProfile(safeTitle);
  const lines = wrapTitle(safeTitle);
  const variant = hashTitle(`${safeTitle}:${profile.track}`) % 5;
  const lineMarkup = lines
    .map(
      (line, index) =>
        `<text x="72" y="${198 + index * 58}" fill="#ffffff" font-size="${index === 0 ? 42 : 36}" font-weight="800">${escapeSvgText(line)}</text>`
    )
    .join('');

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${palette.start}" />
          <stop offset="100%" stop-color="${palette.end}" />
        </linearGradient>
        <radialGradient id="glow" cx="18%" cy="18%" r="92%">
          <stop offset="0%" stop-color="rgba(255,255,255,0.20)" />
          <stop offset="100%" stop-color="rgba(255,255,255,0)" />
        </radialGradient>
      </defs>
      <rect width="1200" height="675" rx="36" fill="url(#bg)" />
      <rect width="1200" height="675" rx="36" fill="url(#glow)" />
      <circle cx="${1006 + variant * 14}" cy="140" r="${164 + variant * 8}" fill="${palette.accent}" opacity="0.14" />
      <circle cx="${968 - variant * 18}" cy="548" r="${198 + variant * 10}" fill="#ffffff" opacity="0.05" />
      <path d="M648 112 L870 420 L734 420 L610 610 L418 610 L564 368 L452 368 Z" fill="#ffffff" opacity="0.06" />
      <rect x="72" y="72" width="232" height="48" rx="24" fill="rgba(255,255,255,0.14)" stroke="rgba(255,255,255,0.18)" />
      <text x="108" y="103" fill="#ffffff" font-size="24" font-weight="800" letter-spacing="3">${profile.badge}</text>
      <text x="72" y="156" fill="rgba(255,255,255,0.72)" font-size="22" font-weight="700" letter-spacing="2">TALLMAN LEARNING LMS</text>
      ${lineMarkup}
      <text x="72" y="420" fill="${palette.accent}" font-size="26" font-weight="700">${escapeSvgText(profile.track)}</text>
      <text x="72" y="482" fill="rgba(255,255,255,0.82)" font-size="22" font-weight="500">Training, certification, and workforce readiness</text>
      <rect x="72" y="545" width="420" height="58" rx="29" fill="rgba(255,255,255,0.10)" stroke="rgba(255,255,255,0.14)" />
      <text x="108" y="582" fill="#ffffff" font-size="20" font-weight="700">Tallman Equipment Co.</text>
      <rect x="984" y="78" width="122" height="42" rx="21" fill="rgba(255,255,255,0.10)" stroke="rgba(255,255,255,0.18)" />
      <text x="1045" y="105" text-anchor="middle" fill="#ffffff" font-size="18" font-weight="800" letter-spacing="2">${escapeSvgText(profile.icon)}</text>
      <text x="1055" y="642" text-anchor="end" fill="rgba(255,255,255,0.52)" font-size="18" font-weight="700">AUTO-GENERATED COURSE VISUAL</text>
      ${buildMotif(profile.motif, palette.accent, palette.surface, variant)}
    </svg>
  `.trim();

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};
