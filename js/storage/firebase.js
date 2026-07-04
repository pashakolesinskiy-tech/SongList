let supabase = null;
let isConfigured = false;

function init(config) {
  if (!config || !config.url || !config.anonKey) {
    console.warn('Supabase not configured. Using localStorage fallback.');
    return;
  }

  if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
    supabase = window.supabase.createClient(config.url, config.anonKey);
    isConfigured = true;
  } else {
    console.warn('Supabase client library not loaded. Using localStorage fallback.');
  }
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

async function saveSong(song) {
  const existing = song.id ? getFromLocalStorage().find(s => s.id === song.id) : null;
  const record = {
    id: song.id || generateId(),
    title: song.title,
    artist: song.artist,
    capo: song.capo || null,
    tuning: song.tuning || 'standard',
    originalKey: song.originalKey || null,
    rawText: song.rawText,
    format: song.format,
    parsedData: song.parsedData,
    createdAt: existing ? existing.createdAt : new Date().toISOString()
  };

  if (isConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('songs')
        .upsert(record)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (e) {
      console.warn('Supabase save failed, using localStorage:', e.message);
    }
  }

  return saveToLocalStorage(record);
}

async function getSongs() {
  if (isConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('songs')
        .select('*')
        .order('createdAt', { ascending: false });

      if (error) throw error;
      return data;
    } catch (e) {
      console.warn('Supabase fetch failed, using localStorage:', e.message);
    }
  }

  return getFromLocalStorage();
}

async function getSong(id) {
  if (isConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('songs')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (e) {
      console.warn('Supabase fetch failed, using localStorage:', e.message);
    }
  }

  return getFromLocalStorage().find(s => s.id === id) || null;
}

async function deleteSong(id) {
  if (isConfigured && supabase) {
    try {
      const { error } = await supabase
        .from('songs')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (e) {
      console.warn('Supabase delete failed, using localStorage:', e.message);
    }
  }

  return deleteFromLocalStorage(id);
}

function saveToLocalStorage(song) {
  const songs = getFromLocalStorage();
  const existing = songs.findIndex(s => s.id === song.id);
  if (existing >= 0) {
    songs[existing] = song;
  } else {
    songs.push(song);
  }
  localStorage.setItem('chord-viewer-songs', JSON.stringify(songs));
  return song;
}

function getFromLocalStorage() {
  try {
    return JSON.parse(localStorage.getItem('chord-viewer-songs') || '[]');
  } catch {
    return [];
  }
}

function deleteFromLocalStorage(id) {
  const songs = getFromLocalStorage().filter(s => s.id !== id);
  localStorage.setItem('chord-viewer-songs', JSON.stringify(songs));
  return true;
}

function getIsConfigured() {
  return isConfigured;
}

export { init, saveSong, getSongs, getSong, deleteSong, getIsConfigured };
