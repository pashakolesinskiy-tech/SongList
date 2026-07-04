import { parseChordPro } from './chordpro.js';
import { parsePlainText, detectFormat } from './plain-text.js';

function autoDetectAndParse(text) {
  const format = detectFormat(text);
  if (format === 'chordpro') {
    return { parsed: parseChordPro(text), format: 'chordpro' };
  }
  return { parsed: parsePlainText(text), format: 'plain' };
}

function parse(text, format) {
  if (format === 'chordpro') {
    return { parsed: parseChordPro(text), format: 'chordpro' };
  }
  if (format === 'plain' || format === 'plain-inline' || format === 'plain-above') {
    return { parsed: parsePlainText(text), format: 'plain' };
  }
  return autoDetectAndParse(text);
}

export { autoDetectAndParse, parse, detectFormat };
