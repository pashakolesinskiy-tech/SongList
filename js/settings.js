const config = {
  url: 'https://zepofyjklltfdxxomvku.supabase.co',
  anonKey: 'sb_publishable_JJILkEwxTpf1GvkvUOv5sA_A6Nlk-gb'
};

let settings = {
  darkTheme: true,
  showNumbers: true,
  showChords: true,
  fontSize: 16
};

try {
  const saved = localStorage.getItem('chord-viewer-config');
  if (saved) Object.assign(config, JSON.parse(saved));
} catch {}

try {
  const savedSettings = localStorage.getItem('druisk-settings');
  if (savedSettings) Object.assign(settings, JSON.parse(savedSettings));
} catch {}

function saveSettings() {
  localStorage.setItem('druisk-settings', JSON.stringify(settings));
  applySettings();
}

function applySettings() {
  const root = document.documentElement;
  root.style.setProperty('--song-font-size', settings.fontSize + 'px');
  root.style.setProperty('--song-font', "'Calibri', sans-serif");

  if (settings.darkTheme) {
    document.body.classList.remove('light-theme');
  } else {
    document.body.classList.add('light-theme');
  }
}

applySettings();

export { config, settings, saveSettings, applySettings };
