import { parse, autoDetectAndParse } from '../parser/index.js';
import { renderSong, alignChords } from '../renderer/chord-renderer.js';
import { saveSong } from '../storage/firebase.js';

function createUploadView(container, settings) {
  container.innerHTML = `
    <div class="upload-view">
      <a href="#/" style="font-size:0.85rem;color:var(--text-secondary);display:inline-block;margin-bottom:0.75rem">← Назад</a>
      <h2>Добавить песню</h2>
      <form id="upload-form">
        <div class="form-row">
          <div class="form-group">
            <label for="song-title">Название</label>
            <input type="text" id="song-title" placeholder="Название песни" required>
          </div>
          <div class="form-group">
            <label for="song-artist">Исполнитель</label>
            <input type="text" id="song-artist" placeholder="Исполнитель">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group small">
            <label for="song-capo">Каподастр</label>
            <input type="number" id="song-capo" min="0" max="12" value="0">
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
          <div id="drop-zone" class="drop-zone">
            <p>Перетащите .txt файл сюда или</p>
            <label class="btn btn-secondary btn-sm" style="cursor:pointer;margin-top:0.5rem">
              Выберите файл
              <input type="file" id="file-input" accept=".txt,.text" style="display:none">
            </label>
          </div>
          <textarea id="song-text" rows="14" placeholder="[Am]В лесу [Em]родилась [C]ёлочка [G]зелёная&#10;&#10;Или: {Am}В лесу {Em}родилась {C}ёлочка&#10;&#10;Или аккорды над текстом:&#10;Am               Em&#10;В лесу родилась ёлочка" required></textarea>
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

  const form = container.querySelector('#upload-form');
  const textarea = container.querySelector('#song-text');
  const previewArea = container.querySelector('#preview-area');
  const previewContent = container.querySelector('#preview-content');
  const dropZone = container.querySelector('#drop-zone');
  const fileInput = container.querySelector('#file-input');

  function loadFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      textarea.value = e.target.result;
    };
    reader.readAsText(file);
  }

  fileInput.addEventListener('change', (e) => {
    loadFile(e.target.files[0]);
  });

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-over');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    loadFile(e.dataTransfer.files[0]);
  });

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
        title: container.querySelector('#song-title').value,
        artist: container.querySelector('#song-artist').value,
        capo: parseInt(container.querySelector('#song-capo').value) || null,
        rawText: text,
        format: detected,
        parsedData: parsed
      });
      window.location.hash = '#/';
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
}

export { createUploadView };
