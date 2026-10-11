(() => {
  const key = 'morningstar-cafe-theme';
  const root = document.documentElement;
  const button = document.querySelector('.cafe-theme-toggle');
  if (!button) return;
  const hint = button.querySelector('.cafe-theme-hint');
  const apply = theme => {
    const day = theme === 'day';
    root.dataset.cafeTheme = day ? 'day' : 'night';
    root.style.colorScheme = day ? 'light' : 'dark';
    button.setAttribute('aria-pressed', String(!day));
    hint.textContent = day ? 'Switch to high contrast' : 'Switch to daytime';
    document.querySelector('meta[name="theme-color"]').content = day ? '#fcf8f4' : '#221321';
  };
  apply(root.dataset.cafeTheme);
  button.hidden = false;
  button.addEventListener('click', () => {
    const theme = root.dataset.cafeTheme === 'day' ? 'night' : 'day';
    apply(theme);
    try { localStorage.setItem(key, theme); } catch (_) {}
  });
  window.addEventListener('storage', event => {
    if (event.key === key || event.key === null) apply(event.newValue === 'day' ? 'day' : 'night');
  });
})();
