document.querySelectorAll('[data-youtube]').forEach(button => {
  button.addEventListener('click', () => {
    const frame = document.createElement('iframe');
    frame.src = 'https://www.youtube-nocookie.com/embed/' + button.dataset.youtube + '?autoplay=1';
    frame.title = button.dataset.title;
    frame.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share';
    frame.allowFullscreen = true;
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    button.replaceWith(frame);
    frame.focus();
  });
});
function revealArchiveAnchor() {
  if (!location.hash) return;
  let id;
  try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
  const target = document.getElementById(id);
  if (!target) return;
  let node = target.parentElement;
  while(node) { if(node.tagName === 'DETAILS') node.open = true; node = node.parentElement; }
  requestAnimationFrame(() => target.scrollIntoView());
}
window.addEventListener('hashchange', revealArchiveAnchor);
revealArchiveAnchor();

// Enhance the complete, server-rendered collection; it remains usable without JS.
const projectFilters = document.querySelector('[data-project-filters]');
if (projectFilters) {
  const buttons = [...projectFilters.querySelectorAll('[data-filter]')];
  const cards = [...document.querySelectorAll('[data-project]')];
  const count = projectFilters.querySelector('[data-project-count]');
  const supported = new Set(buttons.map(button => button.dataset.filter));

  function filterProjects(value, updateUrl = false) {
    const filter = supported.has(value) ? value : 'all';
    let visible = 0;
    cards.forEach(card => {
      const show = filter === 'all' || (filter === 'browser' ? card.dataset.browser === 'true' : card.dataset.category === filter);
      card.hidden = !show;
      if (show) visible++;
    });
    buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === filter)));
    count.textContent = visible + (filter === 'browser' ? ' games to play online' : ' worlds to explore');
    if (updateUrl) {
      const url = new URL(location.href);
      filter === 'all' ? url.searchParams.delete('collection') : url.searchParams.set('collection', filter);
      history.replaceState(null, '', url);
    }
  }
  buttons.forEach(button => button.addEventListener('click', () => filterProjects(button.dataset.filter, true)));
  window.addEventListener('popstate', () => filterProjects(new URL(location.href).searchParams.get('collection')));
  const legacyCollection = location.hash.slice(1);
  filterProjects(new URL(location.href).searchParams.get('collection') || legacyCollection);
  if (supported.has(legacyCollection)) document.getElementById('projects').scrollIntoView();
  projectFilters.hidden = false;
}

document.querySelectorAll('.portfolio-shell #navbarContent a[href*="#"]').forEach(link => {
  link.addEventListener('click', () => {
    const menu = document.getElementById('navbarContent');
    if (menu.classList.contains('show') && window.bootstrap) {
      bootstrap.Collapse.getOrCreateInstance(menu, { toggle: false }).hide();
    }
  });
});
