function esc(text) {
  const d = document.createElement('div');
  d.textContent = text || '';
  return d.innerHTML;
}

export { esc };
