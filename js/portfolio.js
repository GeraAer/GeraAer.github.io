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
  const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
  if (!target) return;
  let node = target.parentElement;
  while(node) { if(node.tagName === 'DETAILS') node.open = true; node = node.parentElement; }
  requestAnimationFrame(() => target.scrollIntoView());
}
window.addEventListener('hashchange', revealArchiveAnchor);
revealArchiveAnchor();
