import { getSongs, deleteSong } from '../storage/firebase.js';

function getFavorites() {
  try {
    return JSON.parse(localStorage.getItem('druisk-favorites') || '[]');
  } catch {
    return [];
  }
}

function saveFavorites(favs) {
  localStorage.setItem('druisk-favorites', JSON.stringify(favs));
}

function toggleFavorite(songId) {
  const favs = getFavorites();
  const idx = favs.indexOf(songId);
  if (idx >= 0) {
    favs.splice(idx, 1);
  } else {
    favs.push(songId);
  }
  saveFavorites(favs);
  return idx < 0;
}

async function createHomeView(container, settings, requestUnlock, unlocked) {
  container.innerHTML = `
    <div class="search-wrap">
      <span class="search-icon">🔍</span>
      <input type="text" class="search-input" id="search" placeholder="Поиск по названию или тексту...">
    </div>
    <div class="filter-row">
      <select id="sort-select" class="sort-select">
        <option value="date">По дате</option>
        <option value="title">По названию</option>
        <option value="artist">По исполнителю</option>
      </select>
      <button class="btn btn-secondary btn-sm" id="btn-favs" style="white-space:nowrap">★ Избранное</button>
    </div>
    <div id="songs-list"><div class="loading">Загрузка...</div></div>
  `;

  const listEl = container.querySelector('#songs-list');
  const searchInput = container.querySelector('#search');
  const sortSelect = container.querySelector('#sort-select');
  const favsBtn = container.querySelector('#btn-favs');
  let allSongs = [];
  let showFavsOnly = false;

  function sortSongs(songs, sortBy) {
    const sorted = [...songs];
    switch (sortBy) {
      case 'title':
        sorted.sort((a, b) => (a.title || '').localeCompare(b.title || '', 'ru'));
        break;
      case 'artist':
        sorted.sort((a, b) => (a.artist || '').localeCompare(b.artist || '', 'ru'));
        break;
      case 'date':
      default:
        sorted.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        break;
    }
    return sorted;
  }

  function getVisibleSongs() {
    let songs = allSongs;
    if (showFavsOnly) {
      const favs = getFavorites();
      songs = songs.filter(s => favs.includes(s.id));
    }
    return songs;
  }

  favsBtn.addEventListener('click', () => {
    showFavsOnly = !showFavsOnly;
    favsBtn.className = showFavsOnly ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm';
    favsBtn.textContent = showFavsOnly ? '★ Все песни' : '★ Избранное';
    const q = searchInput.value.trim();
    if (q) {
      const results = searchSongs(getVisibleSongs(), q);
      renderSearchResults(results, q);
    } else {
      renderList(getVisibleSongs());
    }
  });

  try {
    allSongs = await getSongs();
    renderList(allSongs);
  } catch (err) {
    listEl.innerHTML = `<div class="loading">Ошибка: ${err.message}</div>`;
  }

  sortSelect.addEventListener('change', () => {
    const q = searchInput.value.trim();
    if (q) {
      const results = searchSongs(getVisibleSongs(), q);
      renderSearchResults(results, q);
    } else {
      renderList(getVisibleSongs());
    }
  });

  searchInput.addEventListener('input', () => {
    const q = searchInput.value.trim();
    if (!q) {
      renderList(getVisibleSongs());
      return;
    }
    const results = searchSongs(getVisibleSongs(), q);
    renderSearchResults(results, q);
  });

  function searchSongs(songs, query) {
    const lowerQuery = query.toLowerCase();
    const results = [];

    for (const song of songs) {
      const titleMatch = song.title && song.title.toLowerCase().includes(lowerQuery);
      const artistMatch = song.artist && song.artist.toLowerCase().includes(lowerQuery);

      let matchingLines = [];
      if (song.rawText) {
        const lines = song.rawText.split('\n');
        for (const line of lines) {
          if (line.toLowerCase().includes(lowerQuery)) {
            const trimmed = line.trim();
            if (trimmed) matchingLines.push(trimmed);
          }
        }
      }

      if (titleMatch || artistMatch || matchingLines.length > 0) {
        results.push({
          song,
          titleMatch,
          artistMatch,
          matchingLines: matchingLines.slice(0, 5)
        });
      }
    }

    return results;
  }

  function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function highlightMatch(text, query) {
    if (!query) return esc(text);
    const escaped = escapeRegex(query);
    const regex = new RegExp(`(${escaped})`, 'gi');
    return esc(text).replace(regex, '<span class="search-match">$1</span>');
  }

  function renderSearchResults(results, query) {
    if (results.length === 0) {
      listEl.innerHTML = `
        <div class="empty-state">
          <p>Ничего не найдено</p>
        </div>
      `;
      return;
    }

    listEl.innerHTML = `<ul class="song-list">${results.map((r, i) => `
      <li class="song-item">
        <a href="#/song/${r.song.id}">
          <div class="song-card">
            ${settings.showNumbers ? `<span class="song-num">${i + 1}</span>` : ''}
            <div style="flex:1;overflow:hidden">
              <p class="song-title">${highlightMatch(r.song.title, query)}</p>
              ${r.song.artist ? `<div class="song-artist-sub">${highlightMatch(r.song.artist, query)}</div>` : ''}
              ${r.matchingLines.length > 0 ? `
              <div class="search-examples">
                ${r.matchingLines.map(line => `<div class="search-excerpt">${highlightMatch(line, query)}</div>`).join('')}
              </div>
              ` : ''}
            </div>
            ${unlocked ? `<div class="song-actions">
              <button class="btn btn-danger btn-sm js-delete" data-id="${r.song.id}">✕</button>
            </div>` : ''}
          </div>
        </a>
      </li>
    `).join('')}</ul>`;

    listEl.querySelectorAll('.js-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const id = e.target.dataset.id;
        requestUnlock(async () => {
          if (await window.showConfirm('Удалить эту песню?')) {
            await deleteSong(id);
            allSongs = allSongs.filter(s => s.id !== id);
            const q = searchInput.value.trim();
            if (q) {
              const results = searchSongs(allSongs, q);
              renderSearchResults(results, q);
            } else {
              renderList(allSongs);
            }
          }
        });
      });
    });
  }

  function renderList(songs) {
    if (songs.length === 0) {
      listEl.innerHTML = `
        <div class="empty-state">
          <p>Пока нет песен</p>
        </div>
      `;
      return;
    }

    const sortBy = sortSelect.value;
    const sorted = sortSongs(songs, sortBy);
    const favs = getFavorites();

    listEl.innerHTML = `<ul class="song-list">${sorted.map((song, i) => `
      <li class="song-item">
        <a href="#/song/${song.id}">
          <div class="song-card">
            ${settings.showNumbers ? `<span class="song-num">${i + 1}</span>` : ''}
            <div style="flex:1;overflow:hidden">
              <p class="song-title">${esc(song.title)}</p>
              ${song.artist ? `<div class="song-artist-sub">${esc(song.artist)}</div>` : ''}
            </div>
            <div class="song-actions">
              <button class="btn-fav js-fav" data-id="${song.id}" title="Избранное">${favs.includes(song.id) ? '★' : '☆'}</button>
              ${unlocked ? `<button class="btn btn-danger btn-sm js-delete" data-id="${song.id}">✕</button>` : ''}
            </div>
          </div>
        </a>
      </li>
    `).join('')}</ul>`;

    listEl.querySelectorAll('.js-fav').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const id = e.target.dataset.id;
        const isFav = toggleFavorite(id);
        e.target.textContent = isFav ? '★' : '☆';
        if (showFavsOnly && !isFav) {
          renderList(getVisibleSongs());
        }
      });
    });

    listEl.querySelectorAll('.js-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const id = e.target.dataset.id;
        requestUnlock(async () => {
          if (await window.showConfirm('Удалить эту песню?')) {
            await deleteSong(id);
            allSongs = allSongs.filter(s => s.id !== id);
            renderList(allSongs);
          }
        });
      });
    });
  }
}

function esc(text) {
  const d = document.createElement('div');
  d.textContent = text || '';
  return d.innerHTML;
}

export { createHomeView };
