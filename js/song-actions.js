import { deleteSong } from './storage/firebase.js';

function detectSongKey(song, offset) {
  if (!song || !song.rawText) return '—';
  const { transposeSongText } = window._transposeModule || {};
  const text = transposeSongText ? transposeSongText(song.rawText, offset || 0) : song.rawText;
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
  let key = '—';
  for (const [note, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count;
      key = note;
    }
  }
  return key;
}

function updateSongActions(sheet, { unlocked, requestUnlock, showConfirm }) {
  const existing = sheet.querySelector('.song-actions-section');
  if (existing) existing.remove();

  if (!window._currentSongId) return;

  const songId = window._currentSongId;
  const song = window._currentSongData;
  const currentOffset = window._currentTransposeOffset || 0;
  const key = detectSongKey(song, currentOffset);

  const section = document.createElement('div');
  section.className = 'song-actions-section';
  section.style.cssText = 'border-top:1px solid var(--border);padding-top:1.25rem;margin-top:1.25rem';
  section.innerHTML = `
    <p style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:0.75rem">Тон</p>
    <div style="display:flex;align-items:center;justify-content:center;gap:0.75rem;margin-bottom:1rem">
      <button class="transpose-btn" id="sheet-tp-down" title="Вниз">−</button>
      <span class="transpose-display">${key}${currentOffset !== 0 ? `<span class="transpose-offset">${currentOffset > 0 ? '+' : ''}${currentOffset}</span>` : ''}</span>
      <button class="transpose-btn" id="sheet-tp-up" title="Вверх">+</button>
      ${currentOffset !== 0 ? '<button class="transpose-reset" id="sheet-tp-reset" title="Сбросить">↺</button>' : ''}
    </div>
    ${unlocked ? `
    <p style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:0.75rem">Действия с песней</p>
    <div style="display:flex;gap:0.75rem;margin-bottom:0.75rem">
      <button class="btn btn-secondary" id="sheet-edit" style="flex:1">Редактировать</button>
      <button class="btn btn-danger" id="sheet-delete" style="flex:1">Удалить</button>
    </div>
    <button class="btn btn-secondary" id="sheet-export" style="width:100%">📥 Скачать как текст</button>
    ` : ''}
  `;

  sheet.appendChild(section);

  document.getElementById('sheet-tp-up').addEventListener('click', () => {
    window._currentTransposeOffset = (window._currentTransposeOffset || 0) + 1;
    if (window._currentSongRender) window._currentSongRender();
    updateSongActions(sheet, { unlocked, requestUnlock, showConfirm });
  });

  document.getElementById('sheet-tp-down').addEventListener('click', () => {
    window._currentTransposeOffset = (window._currentTransposeOffset || 0) - 1;
    if (window._currentSongRender) window._currentSongRender();
    updateSongActions(sheet, { unlocked, requestUnlock, showConfirm });
  });

  const tpReset = document.getElementById('sheet-tp-reset');
  if (tpReset) {
    tpReset.addEventListener('click', () => {
      window._currentTransposeOffset = 0;
      if (window._currentSongRender) window._currentSongRender();
      updateSongActions(sheet, { unlocked, requestUnlock, showConfirm });
    });
  }

  if (unlocked) {
    document.getElementById('sheet-edit').addEventListener('click', () => {
      const overlay = document.getElementById('settings-overlay');
      const sheetEl = document.getElementById('settings-sheet');
      sheetEl.classList.remove('open');
      overlay.classList.remove('open');
      requestUnlock(() => {
        window.location.hash = `#/edit/${songId}`;
      });
    });

    document.getElementById('sheet-delete').addEventListener('click', () => {
      requestUnlock(async () => {
        if (await showConfirm('Удалить эту песню?')) {
          await deleteSong(songId);
          window.location.hash = '#/';
        }
      });
    });

    document.getElementById('sheet-export').addEventListener('click', () => {
      if (!song || !song.rawText) return;
      const title = song.title || 'song';
      const filename = title.replace(/[^a-zA-Zа-яА-Я0-9]/g, '_').substring(0, 50) + '.txt';
      const blob = new Blob([song.rawText], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    });
  }
}

export { detectSongKey, updateSongActions };
