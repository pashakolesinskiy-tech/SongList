const LOCK_CODE = '080826';

let unlocked = localStorage.getItem('druisk-unlocked') === 'true';
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
}

export { unlocked, requestUnlock, lockApp };
