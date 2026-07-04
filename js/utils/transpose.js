const SHARP_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_NOTES  = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

function noteToSemitone(note) {
  if (note === 'H') return 11;
  const idx = SHARP_NOTES.indexOf(note);
  if (idx !== -1) return idx;
  return FLAT_NOTES.indexOf(note);
}

function semitoneToNote(s, preferFlat) {
  const n = ((s % 12) + 12) % 12;
  return preferFlat ? FLAT_NOTES[n] : SHARP_NOTES[n];
}

function transposeChord(chord, offset) {
  if (offset === 0) return chord;

  const m = chord.match(/^([A-H][#b]?)(.*)/);
  if (!m) return chord;

  const root = m[1];
  const rest = m[2];
  const preferFlat = root.includes('b');
  const s = noteToSemitone(root);
  if (s === -1) return chord;

  const newRoot = semitoneToNote(s + offset, preferFlat);

  const slash = rest.match(/^(.*?)(\/)([A-H][#b]?)$/);
  if (slash) {
    const bassPreferFlat = slash[3].includes('b');
    const bs = noteToSemitone(slash[3]);
    const newBass = semitoneToNote(bs + offset, bassPreferFlat);
    return newRoot + slash[1] + '/' + newBass;
  }

  return newRoot + rest;
}

function transposeSongText(text, offset) {
  if (offset === 0) return text;
  const CHORD_RE = /([A-H][#b]?(?:maj|min|dim|aug|sus[24]?|add\d+)?m?(?:\/[A-H][#b]?)?(?:\d+)?)/g;
  return text.replace(CHORD_RE, (chord) => transposeChord(chord, offset));
}

export { noteToSemitone, transposeChord, transposeSongText };
