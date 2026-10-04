(() => {
  const video = document.querySelector('#ls-video');
  const shell = document.querySelector('.ls-video-shell');
  document.querySelectorAll('[data-trailer-play]').forEach(control => {
    control.addEventListener('click', () => {
      if (!video) return;
      video.play().catch(() => {
        shell?.classList.add('is-started');
        video.focus();
      });
    });
  });
  video?.addEventListener('play', () => shell?.classList.add('is-playing', 'is-started'));
  video?.addEventListener('seeking', () => shell?.classList.add('is-started'));
  video?.addEventListener('pause', () => shell?.classList.remove('is-playing'));
  video?.addEventListener('ended', () => shell?.classList.remove('is-playing', 'is-started'));
  const image = document.querySelector('#ls-shot-image');
  const link = document.querySelector('#ls-shot-link');
  const caption = document.querySelector('#ls-shot-caption');
  const number = document.querySelector('#ls-shot-number');
  const thumbnails = [...document.querySelectorAll('.ls-thumbnail')];
  thumbnails.forEach(thumbnail => {
    thumbnail.addEventListener('click', () => {
      if (!image || !link || !caption || !number) return;
      image.src = thumbnail.dataset.image;
      image.alt = thumbnail.dataset.alt;
      link.href = thumbnail.dataset.image;
      caption.textContent = thumbnail.dataset.caption;
      number.textContent = thumbnail.dataset.number;
      thumbnails.forEach(button => button.setAttribute('aria-pressed', String(button === thumbnail)));
    });
  });
})();
