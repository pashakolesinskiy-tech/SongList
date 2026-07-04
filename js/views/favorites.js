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

export { getFavorites, toggleFavorite };
