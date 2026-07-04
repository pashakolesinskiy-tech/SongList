import { init as initStorage, deleteSong } from './storage/firebase.js';
import { createHomeView } from './views/home.js';
import { createUploadView } from './views/upload.js';
import { createSongView } from './views/song.js';
import { createEditView } from './views/edit.js';
import { parse } from './parser/index.js';
import { transposeSongText } from './utils/transpose.js';

const appEl = document.getElementById('app');
const LOCK_CODE = '080826';

window._parseModule = { parse };
window._transposeModule = { transposeSongText };

function showConfirm(message) {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';
    overlay.innerHTML = `
      <div class="confirm-modal">
        <div class="confirm-icon">⚠️</div>
        <p class="confirm-message">${message}</p>
        <div class="confirm-actions">
          <button class="btn btn-secondary" id="confirm-cancel">Отмена</button>
          <button class="btn btn-danger" id="confirm-ok">Удалить</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.querySelector('#confirm-cancel').addEventListener('click', () => {
      overlay.remove();
      resolve(false);
    });
    overlay.querySelector('#confirm-ok').addEventListener('click', () => {
      overlay.remove();
      resolve(true);
    });
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.remove();
        resolve(false);
      }
    });
  });
}

const config = {
  url: '',
  anonKey: ''
};

let settings = {
  darkTheme: true,
  showNumbers: true,
  showChords: true,
  fontSize: 16,
  fontFamily: 'sans'
};

let unlocked = localStorage.getItem('druisk-unlocked') === 'true';

try {
  const saved = localStorage.getItem('chord-viewer-config');
  if (saved) Object.assign(config, JSON.parse(saved));
} catch {}

try {
  const savedSettings = localStorage.getItem('druisk-settings');
  if (savedSettings) Object.assign(settings, JSON.parse(savedSettings));
} catch {}

initStorage(config);

function saveSettings() {
  localStorage.setItem('druisk-settings', JSON.stringify(settings));
  applySettings();
}

function applySettings() {
  const root = document.documentElement;
  root.style.setProperty('--song-font-size', settings.fontSize + 'px');

  const fontMap = {
    sans: 'var(--font-main)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)'
  };
  root.style.setProperty('--song-font', fontMap[settings.fontFamily] || fontMap.sans);

  if (settings.darkTheme) {
    document.body.classList.remove('light-theme');
  } else {
    document.body.classList.add('light-theme');
  }
}

applySettings();

function parseHash() {
  const hash = window.location.hash || '#/';
  const parts = hash.slice(2).split('/');
  return { path: parts[0] || '', param: parts[1] || null };
}

let pendingAction = null;

function requestUnlock(callback) {
  if (unlocked) {
    callback();
    return;
  }
  pendingAction = callback;
  showLockModal();
}

function showLockModal() {
  const existing = document.getElementById('lock-modal');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'lock-modal';
  overlay.className = 'settings-overlay open';
  overlay.innerHTML = `
    <div class="settings-sheet open" style="max-width:360px;text-align:center">
      <div class="settings-handle"></div>
      <div style="font-size:2rem;margin-bottom:0.5rem">🔒</div>
      <h2 style="margin-bottom:0.5rem">Введите код</h2>
      <p style="color:var(--text-secondary);font-size:0.85rem;margin-bottom:1.25rem">Для добавления и удаления песен</p>
      <input type="password" id="lock-input" maxlength="6" inputmode="numeric" pattern="[0-9]*"
        style="width:100%;padding:0.75rem;text-align:center;font-size:1.5rem;letter-spacing:0.5rem;background:var(--bg);border:1px solid var(--border);border-radius:10px;color:var(--text-primary);font-family:var(--font-mono);outline:none;margin-bottom:1rem"
        placeholder="------">
      <div id="lock-error" style="color:#ef4444;font-size:0.85rem;margin-bottom:1rem;display:none">Неверный код</div>
      <div style="display:flex;gap:0.75rem">
        <button class="btn btn-secondary" id="lock-cancel" style="flex:1">Отмена</button>
        <button class="btn btn-primary" id="lock-ok" style="flex:1">Войти</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const input = document.getElementById('lock-input');
  const error = document.getElementById('lock-error');
  input.focus();

  function tryUnlock() {
    if (input.value === LOCK_CODE) {
      unlocked = true;
      localStorage.setItem('druisk-unlocked', 'true');
      overlay.remove();
      if (pendingAction) {
        pendingAction();
        pendingAction = null;
      }
    } else {
      error.style.display = 'block';
      input.value = '';
      input.focus();
    }
  }

  document.getElementById('lock-ok').addEventListener('click', tryUnlock);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') tryUnlock();
    error.style.display = 'none';
  });
  document.getElementById('lock-cancel').addEventListener('click', () => {
    overlay.remove();
    pendingAction = null;
  });
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.remove();
      pendingAction = null;
    }
  });
}

function lockApp() {
  unlocked = false;
  localStorage.setItem('druisk-unlocked', 'false');
  renderShell();
  navigate();
}

function renderShell() {
  appEl.innerHTML = `
    <div class="container">
      <header class="header">
        <h1>Druisk</h1>
        <div class="header-actions">
          ${unlocked ? `<button class="icon-btn" id="btn-add" title="Добавить песню">+</button>` : ''}
          <button class="icon-btn" id="btn-lock" title="${unlocked ? 'Заблокировать' : 'Разблокировать'}">${unlocked ? '🔓' : '🔒'}</button>
          <button class="icon-btn" id="btn-settings" title="Настройки">⚙️</button>
        </div>
      </header>
      <div id="page"></div>
    </div>
    <div class="settings-overlay" id="settings-overlay"></div>
    <div class="settings-sheet" id="settings-sheet">
      <div class="settings-handle"></div>
      <h2>Настройки</h2>
      <div class="setting-row">
        <p>Тёмная тема</p>
        <button class="toggle ${settings.darkTheme ? 'on' : 'off'}" data-setting="darkTheme">
          <span></span>
        </button>
      </div>
      <div class="setting-row">
        <p>Нумерация песен</p>
        <button class="toggle ${settings.showNumbers ? 'on' : 'off'}" data-setting="showNumbers">
          <span></span>
        </button>
      </div>
      <div class="setting-row">
        <p>Показывать аккорды</p>
        <button class="toggle ${settings.showChords ? 'on' : 'off'}" data-setting="showChords">
          <span></span>
        </button>
      </div>
      <div style="margin-bottom:1.25rem">
        <p style="font-size:0.95rem;margin-bottom:0.75rem">Размер шрифта</p>
        <div class="font-size-control">
          <button class="font-size-btn" id="fs-minus">A−</button>
          <input type="range" min="10" max="30" value="${settings.fontSize}" id="fs-slider">
          <button class="font-size-btn" id="fs-plus">A+</button>
          <span class="font-size-val" id="fs-val">${settings.fontSize}</span>
        </div>
      </div>
      <div style="margin-bottom:1.25rem">
        <p style="font-size:0.95rem;margin-bottom:0.75rem">Шрифт</p>
        <div class="font-family-row">
          <button class="font-family-btn ${settings.fontFamily === 'sans' ? 'active' : ''}" data-font="sans">
            <span class="preview" style="font-family:var(--font-main)">Aa</span>
            <span class="label">Обычный</span>
          </button>
          <button class="font-family-btn ${settings.fontFamily === 'serif' ? 'active' : ''}" data-font="serif">
            <span class="preview" style="font-family:var(--font-serif)">Aa</span>
            <span class="label">Засечки</span>
          </button>
          <button class="font-family-btn ${settings.fontFamily === 'rounded' ? 'active' : ''}" data-font="rounded">
            <span class="preview" style="font-family:var(--font-rounded)">Aa</span>
            <span class="label">Округлый</span>
          </button>
        </div>
      </div>
      ${unlocked ? `
      <div style="border-top:1px solid var(--border);padding-top:1.25rem;margin-bottom:0.75rem">
        <p style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:0.75rem">Облачная синхронизация (опционально)</p>
        <div class="setting-row" style="margin-bottom:0.75rem">
          <p style="font-size:0.9rem;color:var(--text-secondary)">Supabase URL</p>
          <input type="text" id="cfg-url" value="${config.url}" placeholder="https://..." style="width:200px;padding:0.4rem 0.6rem;background:var(--bg);border:1px solid var(--border);border-radius:8px;color:var(--text-primary);font-size:0.8rem;font-family:inherit;outline:none">
        </div>
        <div class="setting-row" style="margin-bottom:0">
          <p style="font-size:0.9rem;color:var(--text-secondary)">Supabase Key</p>
          <input type="text" id="cfg-key" value="${config.anonKey}" placeholder="eyJ..." style="width:200px;padding:0.4rem 0.6rem;background:var(--bg);border:1px solid var(--border);border-radius:8px;color:var(--text-primary);font-size:0.8rem;font-family:inherit;outline:none">
        </div>
      </div>
      ` : ''}
    </div>
  `;

  const settingsBtn = document.getElementById('btn-settings');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', toggleSettings);
  }
  document.getElementById('settings-overlay').addEventListener('click', toggleSettings);
  const addBtn = document.getElementById('btn-add');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      window.location.hash = '#/upload';
    });
  }
  const lockBtn = document.getElementById('btn-lock');
  if (lockBtn) {
    lockBtn.addEventListener('click', () => {
      if (unlocked) {
        lockApp();
      } else {
        requestUnlock(() => {
          renderShell();
          navigate();
        });
      }
    });
  }

  document.querySelectorAll('.toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.setting;
      settings[key] = !settings[key];
      btn.className = `toggle ${settings[key] ? 'on' : 'off'}`;
      saveSettings();
      if (key === 'showChords' || key === 'showNumbers') {
        navigate();
      }
    });
  });

  document.getElementById('fs-slider').addEventListener('input', (e) => {
    settings.fontSize = parseInt(e.target.value);
    document.getElementById('fs-val').textContent = settings.fontSize;
    saveSettings();
  });

  document.getElementById('fs-minus').addEventListener('click', () => {
    settings.fontSize = Math.max(10, settings.fontSize - 1);
    document.getElementById('fs-slider').value = settings.fontSize;
    document.getElementById('fs-val').textContent = settings.fontSize;
    saveSettings();
  });

  document.getElementById('fs-plus').addEventListener('click', () => {
    settings.fontSize = Math.min(30, settings.fontSize + 1);
    document.getElementById('fs-slider').value = settings.fontSize;
    document.getElementById('fs-val').textContent = settings.fontSize;
    saveSettings();
  });

  document.querySelectorAll('.font-family-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      settings.fontFamily = btn.dataset.font;
      document.querySelectorAll('.font-family-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      saveSettings();
    });
  });

  const urlEl = document.getElementById('cfg-url');
  const keyEl = document.getElementById('cfg-key');
  if (urlEl) {
    urlEl.addEventListener('change', () => {
      config.url = urlEl.value;
      localStorage.setItem('chord-viewer-config', JSON.stringify(config));
      initStorage(config);
    });
  }
  if (keyEl) {
    keyEl.addEventListener('change', () => {
      config.anonKey = keyEl.value;
      localStorage.setItem('chord-viewer-config', JSON.stringify(config));
      initStorage(config);
    });
  }
}

function toggleSettings() {
  const overlay = document.getElementById('settings-overlay');
  const sheet = document.getElementById('settings-sheet');
  const isOpen = sheet.classList.contains('open');
  if (isOpen) {
    sheet.classList.remove('open');
    overlay.classList.remove('open');
    const songActions = sheet.querySelector('.song-actions-section');
    if (songActions) songActions.remove();
  } else {
    sheet.classList.add('open');
    overlay.classList.add('open');
  }
}

function detectSongKey(song, offset) {
  if (!song || !song.rawText) return '—';
  const { transposeSongText } = window._transposeModule || {};
  const text = transposeSongText ? transposeSongText(song.rawText, offset || 0) : song.rawText;
  const CHORD_RE = /([A-H][#b]?(?:maj|min|dim|aug|sus[24]?|add\d+)?m?(?:\/[A-H][#b]?)?(?:\d+)?)/g;
  const counts = {};
  for (const line of text.split('\n')) {
    for (const m of line.matchAll(CHORD_RE)) {
      const root = m[1];
      counts[root] = (counts[root] || 0) + 1;
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

function updateSongActions(sheet) {
  const existing = sheet.querySelector('.song-actions-section');
  if (existing) existing.remove();

  if (!window._currentSongId) return;

  const songId = window._currentSongId;
  const requestUnlock = window._currentSongRequestUnlock;
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
    updateSongActions(sheet);
  });

  document.getElementById('sheet-tp-down').addEventListener('click', () => {
    window._currentTransposeOffset = (window._currentTransposeOffset || 0) - 1;
    if (window._currentSongRender) window._currentSongRender();
    updateSongActions(sheet);
  });

  const tpReset = document.getElementById('sheet-tp-reset');
  if (tpReset) {
    tpReset.addEventListener('click', () => {
      window._currentTransposeOffset = 0;
      if (window._currentSongRender) window._currentSongRender();
      updateSongActions(sheet);
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

window.updateSongActions = updateSongActions;
window.showConfirm = showConfirm;

function updateHeader() {
  const { path } = parseHash();
  const isSongView = path === 'song';
  const header = document.querySelector('.header');
  if (!header) return;

  const title = header.querySelector('h1');
  const addBtn = document.getElementById('btn-add');
  const lockBtn = document.getElementById('btn-lock');
  const settingsBtn = document.getElementById('btn-settings');

  if (title) title.style.display = isSongView ? 'none' : '';
  if (addBtn) addBtn.style.display = isSongView ? 'none' : '';
  if (lockBtn) lockBtn.style.display = isSongView ? 'none' : '';
  if (settingsBtn) settingsBtn.style.display = isSongView ? 'none' : '';
  header.style.display = isSongView ? 'none' : '';
}

function navigate() {
  const page = document.getElementById('page');
  if (!page) {
    renderShell();
    navigate();
    return;
  }

  updateHeader();

  const { path, param } = parseHash();

  if (path === '' || path === 'home') {
    window._currentTransposeOffset = 0;
    createHomeView(page, settings, requestUnlock, unlocked);
  } else if (path === 'upload') {
    if (!unlocked) {
      window.location.hash = '#/';
      return;
    }
    createUploadView(page, settings);
  } else if (path === 'song' && param) {
    if (window._lastSongId !== param) {
      window._currentTransposeOffset = 0;
      window._lastSongId = param;
    }
    createSongView(page, param, settings, requestUnlock, unlocked);
  } else if (path === 'edit' && param) {
    if (!unlocked) {
      window.location.hash = '#/';
      return;
    }
    createEditView(page, param, settings);
  } else {
    page.innerHTML = '<div class="loading">Страница не найдена</div>';
  }
}

window.addEventListener('hashchange', navigate);
renderShell();
navigate();
