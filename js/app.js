import { init as initStorage } from './storage/firebase.js';
import { createHomeView } from './views/home.js';
import { createUploadView } from './views/upload.js';
import { createSongView } from './views/song.js';
import { createEditView } from './views/edit.js';
import { parse } from './parser/index.js';
import { transposeSongText, transposeChord } from './utils/transpose.js';
import { config, settings, saveSettings } from './settings.js';
import { unlocked, requestUnlock, lockApp } from './lock.js';
import { updateSongActions } from './song-actions.js';
import { exportAll, importAll } from './backup.js';

const appEl = document.getElementById('app');

window._parseModule = { parse };
window._transposeModule = { transposeSongText, transposeChord };

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

function parseHash() {
  const hash = window.location.hash || '#/';
  const parts = hash.slice(2).split('/');
  return { path: parts[0] || '', param: parts[1] || null };
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
      <div style="border-top:1px solid var(--border);padding-top:1.25rem;margin-top:0.75rem">
        <p style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:0.75rem">Бэкап данных</p>
        <div style="display:flex;gap:0.75rem">
          <button class="btn btn-secondary" id="btn-export" style="flex:1">📥 Экспорт</button>
          <button class="btn btn-secondary" id="btn-import" style="flex:1">📤 Импорт</button>
          <input type="file" id="import-file" accept=".json" style="display:none">
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
        renderShell();
        navigate();
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

  const exportBtn = document.getElementById('btn-export');
  const importBtn = document.getElementById('btn-import');
  const importFile = document.getElementById('import-file');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => exportAll());
  }
  if (importBtn) {
    importBtn.addEventListener('click', () => importFile.click());
  }
  if (importFile) {
    importFile.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const count = await importAll(file);
        alert(`Импортировано ${count} песен`);
        navigate();
      } catch (err) {
        alert('Ошибка импорта: ' + err.message);
      }
      importFile.value = '';
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

window.updateSongActions = (sheet) => updateSongActions(sheet, { unlocked, requestUnlock, showConfirm });
window.showConfirm = showConfirm;

initStorage(config);

window.addEventListener('hashchange', navigate);
renderShell();
navigate();
