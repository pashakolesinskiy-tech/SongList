function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

const SECTION_NAMES = {
  verse: 'КУПЛЕТ',
  chorus: 'ПРИПЕВ',
  bridge: 'БРИДЖ',
  intro: 'ИНТРО',
  outro: 'АУТРО',
  prechorus: 'ПРЕДПРИПЕВ'
};

function renderChordLine(chordLine) {
  const CHORD_TOKEN = /([A-H][#b]?(?:maj|min|dim|aug|sus[24]?|add\d+)?m?(?:\/[A-H][#b]?)?(?:\d+)?)/g;
  let html = '';
  let lastIdx = 0;

  for (const m of chordLine.matchAll(CHORD_TOKEN)) {
    if (m.index > lastIdx) {
      const spaces = chordLine.substring(lastIdx, m.index);
      html += spaces.replace(/ /g, '&nbsp;');
    }
    html += `<span class="chord">${escapeHtml(m[1])}</span>`;
    lastIdx = m.index + m[0].length;
  }

  if (lastIdx < chordLine.length) {
    const tail = chordLine.substring(lastIdx);
    html += tail.replace(/ /g, '&nbsp;');
  }

  return html;
}

function segmentsToChordAbove(segments) {
  let chordLine = '';
  let lyricLine = '';

  for (const seg of segments) {
    if (seg.chord) {
      const textLen = seg.text.length || 1;
      chordLine += seg.chord + ' '.repeat(Math.max(1, textLen - seg.chord.length + 1));
      lyricLine += seg.text;
    } else {
      chordLine += ' '.repeat(seg.text.length);
      lyricLine += seg.text;
    }
  }

  return { chordLine, lyricLine };
}

function renderLine(line, showChords) {
  if (line.type === 'chord-above') {
    if (!showChords) {
      return `<div class="song-line lyric">${escapeHtml(line.lyricLine)}</div>`;
    }
    return `<div class="chord-above-block"><div class="chord-line">${renderChordLine(line.chordLine)}</div><div class="lyric-line">${escapeHtml(line.lyricLine)}</div></div>`;
  }

  if (line.type === 'mixed' && line.segments) {
    if (!showChords) {
      const text = line.segments.map(s => s.text).join('');
      return `<div class="song-line lyric">${escapeHtml(text)}</div>`;
    }
    const { chordLine, lyricLine } = segmentsToChordAbove(line.segments);
    return `<div class="chord-above-block"><div class="chord-line">${renderChordLine(chordLine)}</div><div class="lyric-line">${escapeHtml(lyricLine)}</div></div>`;
  }

  return `<div class="song-line ${line.type}">${renderSegments(line.segments || [])}</div>`;
}

function renderSegments(segments) {
  let html = '';
  for (const seg of segments) {
    if (seg.chord) {
      html += `<span class="chord-block"><span class="chord">${escapeHtml(seg.chord)}</span><span class="text">${escapeHtml(seg.text)}</span></span>`;
    } else {
      html += `<span class="text-only">${escapeHtml(seg.text)}</span>`;
    }
  }
  return html;
}

const MULTI_SECTIONS = new Set(['verse', 'chorus']);

function renderSection(section, index, showChords) {
  let html = '';
  const typeName = SECTION_NAMES[section.type] || 'КУПЛЕТ';
  const label = section.label;

  let displayLabel;
  if (!label) {
    displayLabel = MULTI_SECTIONS.has(section.type) ? `${typeName} ${index + 1}` : typeName;
  } else if (/^\d+$/.test(label)) {
    displayLabel = `${typeName} ${label}`;
  } else {
    displayLabel = label;
  }

  html += `<div style="display:flex;align-items:center;gap:0.75rem;margin-top:1.25rem;margin-bottom:0.75rem">`;
  html += `<div class="section-label">${escapeHtml(displayLabel)}</div>`;
  html += `<div style="flex:1 1 0%;height:1px;background:var(--border)"></div>`;
  html += `</div>`;
  html += `<div class="section" data-type="${section.type}">`;
  for (const line of section.lines) {
    html += renderLine(line, showChords);
  }
  html += '</div>';
  return html;
}

function renderSong(song, settings) {
  const counters = {};
  const showChords = settings ? settings.showChords !== false : true;
  let html = '<div class="song-container">';
  html += '<div class="song-body">';
  for (const section of song.sections) {
    const type = section.type || 'verse';
    if (!counters[type]) counters[type] = 0;
    counters[type]++;
    const idx = counters[type] - 1;
    html += renderSection(section, idx, showChords);
  }
  html += '</div></div>';
  return html;
}

export { renderSong, renderSegments };
