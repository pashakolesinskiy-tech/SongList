import { getSong, saveSong } from '../storage/firebase.js';
import { parse, autoDetectAndParse } from '../parser/index.js';
import { renderSong, alignChords } from '../renderer/chord-renderer.js';
import { transposeSongText, noteToSemitone } from '../utils/transpose.js';
import { esc } from '../utils/escape.js';

const KEY_OPTIONS = ['C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B'];

async function createEditView(container, songId, settings) {
  container.innerHTML = '<div class="loading">Загрузка...</div>';

  try {
    const song = await getSong(songId);

    if (!song) {
      container.innerHTML = '<div class="loading">Песня не найдена</div>';
      return;
    }

    container.innerHTML = `
      <div class="upload-view">
        <a href="#/song/${songId}" style="font-size:0.85rem;color:var(--text-secondary);display:inline-block;margin-bottom:0.75rem">← Назад</a>
        <h2>Редактировать песню</h2>
        <form id="edit-form">
          <div class="form-row">
            <div class="form-group">
              <label for="song-title">Название</label>
              <input type="text" id="song-title" value="${esc(song.title)}" required>
            </div>
            <div class="form-group">
              <label for="song-artist">Исполнитель</label>
              <input type="text" id="song-artist" value="${esc(song.artist || '')}">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group small">
              <label for="song-capo">Каподастр</label>
              <input type="number" id="song-capo" min="0" max="12" value="${song.capo || 0}">
            </div>
            <div class="form-group">
              <label>Формат</label>
              <div class="radio-group">
                <label class="radio-label">
                  <input type="radio" name="format" value="auto" checked> Auto
                </label>
                <label class="radio-label">
                  <input type="radio" name="format" value="plain"> Plain Text
                </label>
                <label class="radio-label">
                  <input type="radio" name="format" value="chordpro"> ChordPro
                </label>
              </div>
            </div>
          </div>
          <div class="form-group">
            <label for="song-original-key">Исходная тональность</label>
            <div style="display:flex;gap:0.5rem;align-items:center">
              <select id="song-original-key" style="flex:1;padding:0.65rem 0.85rem;background:var(--bg);border:1px solid var(--border);border-radius:10px;color:var(--text-primary);font-size:0.95rem;font-family:inherit;outline:none;cursor:pointer">
                <option value="">Авто</option>
                ${KEY_OPTIONS.map(k => `<option value="${k}" ${song.originalKey === k ? 'selected' : ''}>${k}</option>`).join('')}
              </select>
              <button type="button" id="btn-apply-key" class="btn btn-secondary btn-sm" style="white-space:nowrap">Применить</button>
            </div>
          </div>
          <div class="form-group">
            <label for="song-text">Текст песни с аккордами</label>
            <textarea id="song-text" rows="14" required>${esc(song.rawText)}</textarea>
          </div>
          <div class="form-actions">
            <button type="button" id="btn-preview" class="btn btn-secondary">Предпросмотр</button>
            <button type="submit" class="btn btn-primary">Сохранить</button>
          </div>
        </form>
        <div id="preview-area" class="preview-area" style="display:none">
          <h3>Предпросмотр</h3>
          <div id="preview-content"></div>
        </div>
      </div>
    `;

    const form = container.querySelector('#edit-form');
    const textarea = container.querySelector('#song-text');
    const keySelect = container.querySelector('#song-original-key');
    const previewArea = container.querySelector('#preview-area');
    const previewContent = container.querySelector('#preview-content');

    container.querySelector('#btn-apply-key').addEventListener('click', () => {
      const newKey = keySelect.value;
      if (!newKey) return;
      const text = textarea.value.trim();
      if (!text) return;

      const CHORD_RE = /([A-G][#b]?(?:maj|min|dim|aug|sus[24]?|add\d+)?m?(?:\/[A-G][#b]?)?(?:\d+)?)/g;
      const counts = {};
      for (const line of text.split('\n')) {
        for (const m of line.matchAll(CHORD_RE)) {
          const rootMatch = m[1].match(/^([A-G][#b]?)/);
          if (rootMatch) {
            const root = rootMatch[1];
            counts[root] = (counts[root] || 0) + 1;
          }
        }
      }
      let maxCount = 0;
      let currentKey = '';
      for (const [note, count] of Object.entries(counts)) {
        if (count > maxCount) {
          maxCount = count;
          currentKey = note;
        }
      }
      if (!currentKey) return;

      const rootMatch = currentKey.match(/^([A-G][#b]?)/);
      const root = rootMatch ? rootMatch[1] : currentKey;
      const oldSemitone = noteToSemitone(root);
      const newSemitone = noteToSemitone(newKey);
      if (oldSemitone === -1 || newSemitone === -1) return;

      const offset = newSemitone - oldSemitone;
      textarea.value = transposeSongText(text, offset);
    });

    let hasChanges = false;
    textarea.addEventListener('input', () => { hasChanges = true; });
    container.querySelector('#song-title').addEventListener('input', () => { hasChanges = true; });
    container.querySelector('#song-artist').addEventListener('input', () => { hasChanges = true; });

    const backLink = container.querySelector('a[href]');
    if (backLink) {
      backLink.addEventListener('click', (e) => {
        if (hasChanges && !confirm('Есть несохранённые изменения. Уйти?')) {
          e.preventDefault();
        }
      });
    }

    container.querySelector('#btn-preview').addEventListener('click', () => {
      const text = textarea.value.trim();
      if (!text) return;
      const fmt = getFormat();
      const { parsed } = fmt === 'auto' ? autoDetectAndParse(text) : parse(text, fmt);
      previewContent.innerHTML = renderSong({
        title: container.querySelector('#song-title').value,
        artist: container.querySelector('#song-artist').value,
        capo: parseInt(container.querySelector('#song-capo').value) || null,
        sections: parsed.sections
      }, settings);
      alignChords();
      previewArea.style.display = 'block';
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const text = textarea.value.trim();
      if (!text) return;

      const fmt = getFormat();
      const { parsed, format: detected } = fmt === 'auto'
        ? autoDetectAndParse(text)
        : parse(text, fmt);

      try {
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Сохранение...';
        await saveSong({
          id: songId,
          title: container.querySelector('#song-title').value,
          artist: container.querySelector('#song-artist').value,
          capo: parseInt(container.querySelector('#song-capo').value) || null,
          originalKey: keySelect.value || null,
          rawText: text,
          format: detected,
          parsedData: parsed
        });
        window.location.hash = `#/song/${songId}`;
      } catch (err) {
        alert('Ошибка: ' + err.message);
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Сохранить';
      }
    });

    function getFormat() {
      return container.querySelector('input[name="format"]:checked').value;
    }
  } catch (err) {
    container.innerHTML = `<div class="loading">Ошибка: ${err.message}</div>`;
  }
}

export { createEditView };
