const CHORD_REGEX = /\{([A-H][#b]?(?:maj|min|dim|aug|sus[24]?|add\d+)?m?(?:\/[A-H][#b]?)?(?:\d+)?)\}/g;
const SECTION_REGEX = /^\[(verse|chorus|bridge|intro|outro|prechorus|pre-chorus)(?:\s+(.+))?\]$/i;
const CHORDPRO_SECTION_REGEX = /^\{(start_of_verse|start_of_chorus|start_of_bridge|start_of_intro|start_of_outro|start_of_prechorus|verse|chorus|bridge|intro|outro|prechorus)(?::\s*(.+))?\}$/i;
const SECTION_END_REGEX = /^\{(end_of_verse|end_of_chorus|end_of_bridge|end_of_intro|end_of_outro|end_of_prechorus)\}$/i;

function parseChordProLine(line) {
  const segments = [];
  let lastIndex = 0;

  for (const match of line.matchAll(CHORD_REGEX)) {
    if (match.index > lastIndex) {
      const text = line.substring(lastIndex, match.index);
      if (text) segments.push({ chord: null, text });
    }
    segments.push({ chord: match[1], text: '' });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < line.length) {
    const text = line.substring(lastIndex);
    if (text) segments.push({ chord: null, text });
  }

  if (segments.length === 0) {
    segments.push({ chord: null, text: line });
  }

  return segments;
}

function detectSectionType(name) {
  const lower = (name || '').toLowerCase();
  if (lower.includes('chorus') || lower.includes('припев')) return 'chorus';
  if (lower.includes('bridge') || lower.includes('бридж')) return 'bridge';
  if (lower.includes('intro')) return 'intro';
  if (lower.includes('outro')) return 'outro';
  if (lower.includes('pre-chorus') || lower.includes('prechorus') || lower.includes('предприпев')) return 'prechorus';
  return 'verse';
}

function parseChordPro(text) {
  const lines = text.split('\n');
  const sections = [];
  let currentSection = null;

  for (const line of lines) {
    const trimmed = line.trimEnd();

    const sectionEndMatch = trimmed.match(SECTION_END_REGEX);
    if (sectionEndMatch) {
      currentSection = null;
      continue;
    }

    const sectionMatch = trimmed.match(SECTION_REGEX) || trimmed.match(CHORDPRO_SECTION_REGEX);
    if (sectionMatch) {
      const sectionType = detectSectionType(sectionMatch[1]);
      const label = sectionMatch[2] || '';
      currentSection = { type: sectionType, label, lines: [] };
      sections.push(currentSection);
      continue;
    }

    if (currentSection === null) {
      currentSection = { type: 'verse', label: '', lines: [] };
      sections.push(currentSection);
    }

    const segments = parseChordProLine(trimmed);
    const hasChord = segments.some(s => s.chord !== null);

    currentSection.lines.push({
      type: hasChord ? 'mixed' : 'lyric',
      segments
    });
  }

  return { sections };
}

export { parseChordPro };
