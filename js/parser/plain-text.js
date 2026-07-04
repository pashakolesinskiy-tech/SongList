const INLINE_CHORD_REGEX = /\[([A-H][#b]?(?:maj|min|dim|aug|sus[24]?|add\d+)?m?(?:\/[A-H][#b]?)?(?:\d+)?)\]/g;
const CHORD_LINE_REGEX = /^([A-H][#b]?(?:maj|min|dim|aug|sus[24]?|add\d+)?m?(?:\/[A-H][#b]?)?(?:\d+)?\s*)+$/;
const CHORD_TOKEN_REGEX = /([A-H][#b]?(?:maj|min|dim|aug|sus[24]?|add\d+)?m?(?:\/[A-H][#b]?)?(?:\d+)?)/g;
const SECTION_LABEL_REGEX = /^\[(verse|chorus|bridge|intro|outro|prechorus|pre-chorus)(?:\s+(.+))?\]$/i;

function detectFormat(text) {
  if (/\{[A-H][#b]?(?:maj|min|dim|aug|sus[24]?|add\d+)?m?\d*\}/.test(text)) return 'chordpro';
  if (/\[[A-H][#b]?(?:maj|min|dim|aug|sus[24]?|add\d+)?m?\d*\]/.test(text)) return 'plain-inline';
  return 'plain-above';
}

function parseInlineLine(line) {
  const segments = [];
  let lastIndex = 0;

  for (const match of line.matchAll(INLINE_CHORD_REGEX)) {
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

function isChordOnlyLine(line) {
  const trimmed = line.trim();
  if (trimmed === '') return false;
  const stripped = trimmed.replace(CHORD_TOKEN_REGEX, '').replace(/[\s\-–—|,;./\\()]/g, '');
  return stripped.length === 0;
}

function extractChordPositions(line) {
  const chords = [];
  for (const match of line.matchAll(CHORD_TOKEN_REGEX)) {
    chords.push({ chord: match[1], position: match.index });
  }
  return chords;
}

function parseAboveLine(text) {
  const lines = text.split('\n');
  const sections = [];
  let currentSection = null;
  let i = 0;

  while (i < lines.length) {
    const trimmed = lines[i].trimEnd();

    const sectionMatch = trimmed.match(SECTION_LABEL_REGEX);
    if (sectionMatch) {
      const sectionType = detectSectionType(sectionMatch[1]);
      const label = sectionMatch[2] || '';
      currentSection = { type: sectionType, label, lines: [] };
      sections.push(currentSection);
      i++;
      continue;
    }

    if (trimmed === '') {
      i++;
      continue;
    }

    if (currentSection === null) {
      currentSection = { type: 'verse', label: '', lines: [] };
      sections.push(currentSection);
    }

    if (isChordOnlyLine(trimmed)) {
      let lyricLine = '';
      let j = i + 1;
      while (j < lines.length && lines[j].trim() === '') j++;
      if (j < lines.length) {
        lyricLine = lines[j].trimEnd();
        j++;
      }

      currentSection.lines.push({
        type: 'chord-above',
        chordLine: trimmed,
        lyricLine
      });

      i = j;
    } else {
      currentSection.lines.push({
        type: 'lyric',
        segments: [{ chord: null, text: trimmed }]
      });
      i++;
    }
  }

  return { sections };
}

function parsePlainText(text) {
  const format = detectFormat(text);

  if (format === 'plain-inline') {
    const lines = text.split('\n');
    const sections = [];
    let currentSection = null;

    for (const line of lines) {
      const trimmed = line.trimEnd();

      const sectionMatch = trimmed.match(SECTION_LABEL_REGEX);
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

      const segments = parseInlineLine(trimmed);
      const hasChord = segments.some(s => s.chord !== null);

      currentSection.lines.push({
        type: hasChord ? 'mixed' : 'lyric',
        segments
      });
    }

    return { sections };
  }

  return parseAboveLine(text);
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

export { parsePlainText, detectFormat };
