import { getSong, saveSong } from '../storage/firebase.js';
import { parse, autoDetectAndParse } from '../parser/index.js';
import { renderSong } from '../renderer/chord-renderer.js';

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
    const previewArea = container.querySelector('#preview-area');
    const previewContent = container.querySelector('#preview-content');

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
        await saveSong({
          id: songId,
          title: container.querySelector('#song-title').value,
          artist: container.querySelector('#song-artist').value,
          capo: parseInt(container.querySelector('#song-capo').value) || null,
          rawText: text,
          format: detected,
          parsedData: parsed
        });
        window.location.hash = `#/song/${songId}`;
      } catch (err) {
        alert('Ошибка: ' + err.message);
      }
    });

    function getFormat() {
      return container.querySelector('input[name="format"]:checked').value;
    }
  } catch (err) {
    container.innerHTML = `<div class="loading">Ошибка: ${err.message}</div>`;
  }
}

function esc(text) {
  const d = document.createElement('div');
  d.textContent = text || '';
  return d.innerHTML;
}

export { createEditView };
