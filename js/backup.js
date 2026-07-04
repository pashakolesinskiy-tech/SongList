import { getSongs, saveSong } from './storage/firebase.js';

async function exportAll() {
  const songs = await getSongs();
  const data = JSON.stringify(songs, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `druisk-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

async function importAll(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const songs = JSON.parse(e.target.result);
        if (!Array.isArray(songs)) throw new Error('Неверный формат файла');
        let imported = 0;
        for (const song of songs) {
          await saveSong(song);
          imported++;
        }
        resolve(imported);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Ошибка чтения файла'));
    reader.readAsText(file);
  });
}

export { exportAll, importAll };
