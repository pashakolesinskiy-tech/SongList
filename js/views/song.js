import { getSong, deleteSong } from '../storage/firebase.js';
import { renderSong } from '../renderer/chord-renderer.js';
import { transposeSongText } from '../utils/transpose.js';

let scrollInterval = null;
let scrollSpeed = 1;

function stopScroll() {
  if (scrollInterval) {
    clearInterval(scrollInterval);
    scrollInterval = null;
  }
}

function startScroll(speed) {
  stopScroll();
  scrollSpeed = speed;
  scrollInterval = setInterval(() => {
    window.scrollBy(0, 1);
  }, 100 / speed);
}

async function createSongView(container, songId, settings, requestUnlock, unlocked) {
  stopScroll();
  container.innerHTML = '<div class="loading">Загрузка...</div>';

  try {
    const song = await getSong(songId);

    if (!song) {
      container.innerHTML = '<div class="loading">Песня не найдена</div>';
      return;
    }

    window._currentTransposeOffset = window._currentTransposeOffset || 0;
    const originalText = song.rawText;

    function renderSongView() {
      const offset = window._currentTransposeOffset;
      const text = transposeSongText(originalText, offset);
      const { parse } = getParser();
      const { parsed } = parse(text, 'auto');

      const rendered = renderSong({
        title: song.title,
        artist: song.artist,
        capo: song.capo,
        sections: parsed.sections
      }, settings);

      const chords = extractChords(text);
      const uniqueChords = [...new Set(chords)];

      container.innerHTML = `
        <div class="song-view">
          <div class="song-header">
            <div style="display:flex;justify-content:space-between;align-items:flex-start">
              <a href="#/" style="font-size:0.85rem;color:var(--text-secondary)">← Назад</a>
              <button class="icon-btn" id="btn-song-settings" title="Настройки">⚙️</button>
            </div>
            <h1>${esc(song.title)}</h1>
            ${song.artist ? `<div class="song-meta">${esc(song.artist)}</div>` : ''}
            ${song.capo ? `<div class="song-meta">Каподастр: ${song.capo}</div>` : ''}
            ${offset !== 0 ? `<div class="song-meta">Транспозиция: ${offset > 0 ? '+' : ''}${offset} полутонов</div>` : ''}
          </div>
          ${uniqueChords.length > 0 ? `
          <div class="chord-legend">
            <span class="chord-legend-label">Аккорды:</span>
            ${uniqueChords.map(c => `<span class="chord-legend-item">${esc(c)}</span>`).join('')}
          </div>
          ` : ''}
          <div class="song-body">${rendered}</div>
        </div>
        <div class="scroll-controls" id="scroll-controls">
          <button class="scroll-btn" id="scroll-toggle" title="Автопрокрутка">▶</button>
          <input type="range" id="scroll-speed" min="1" max="10" value="3" class="scroll-slider">
          <span class="scroll-label" id="scroll-label">3x</span>
        </div>
      `;

      bindEvents();
    }

    function extractChords(text) {
      const CHORD_RE = /([A-H][#b]?(?:maj|min|dim|aug|sus[24]?|add\d+)?m?(?:\/[A-H][#b]?)?(?:\d+)?)/g;
      const chords = [];
      for (const line of text.split('\n')) {
        for (const m of line.matchAll(CHORD_RE)) {
          chords.push(m[1]);
        }
      }
      return chords;
    }

    function bindEvents() {
      const scrollToggle = container.querySelector('#scroll-toggle');
      const scrollSpeedInput = container.querySelector('#scroll-speed');
      const scrollLabel = container.querySelector('#scroll-label');

      scrollToggle.addEventListener('click', () => {
        if (scrollInterval) {
          stopScroll();
          scrollToggle.textContent = '▶';
        } else {
          startScroll(parseInt(scrollSpeedInput.value));
          scrollToggle.textContent = '⏸';
        }
      });

      scrollSpeedInput.addEventListener('input', (e) => {
        scrollLabel.textContent = e.target.value + 'x';
        if (scrollInterval) startScroll(parseInt(e.target.value));
      });

      const settingsBtn = container.querySelector('#btn-song-settings');
      if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
          window._currentSongId = songId;
          window._currentSongUnlocked = unlocked;
          window._currentSongRequestUnlock = requestUnlock;
          window._currentSongData = song;
          window._currentSongRender = renderSongView;
          const overlay = document.getElementById('settings-overlay');
          const sheet = document.getElementById('settings-sheet');
          if (overlay && sheet) {
            updateSongActions(sheet);
            sheet.classList.add('open');
            overlay.classList.add('open');
          }
        });
      }
    }

    renderSongView();
  } catch (err) {
    container.innerHTML = `<div class="loading">Ошибка: ${err.message}</div>`;
  }
}

function getParser() {
  if (window._parseModule) return window._parseModule;
  return { parse: (text) => ({ parsed: { sections: [] } }) };
}

function esc(text) {
  const d = document.createElement('div');
  d.textContent = text || '';
  return d.innerHTML;
}

export { createSongView };
