(() => {
  const section = document.querySelector('[data-guestbook]');
  if (!section) return;
  const form = section.querySelector('[data-note-form]');
  const status = section.querySelector('[data-note-status]');
  const count = section.querySelector('[data-note-count]');
  const board = section.querySelector('[data-notes]');
  const boardStatus = section.querySelector('[data-board-status]');
  const more = section.querySelector('[data-more-notes]');
  const submit = form.querySelector('[type=submit]');
  const topics = new Map([...form.elements.topic.options].map(option => [option.value, option.text]));
  const seen = new Set();
  let cursor = null;
  let loading = false;
  let started = false;
  form.hidden = false;
  form.elements.message.addEventListener('input', () => { count.textContent = form.elements.message.value.length + ' / 1000'; });
  async function request(path, options = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(section.dataset.api + path, { ...options, credentials: 'omit', signal: controller.signal });
      const data = await response.json();
      if (!response.ok) { const error = new Error(data.error || 'service_unavailable'); error.status = response.status; throw error; }
      return data;
    } finally { clearTimeout(timer); }
  }
  function appendNote(post) {
    if (seen.has(post.id)) return;
    seen.add(post.id);
    const note = document.createElement('article');
    note.className = 'cafe-note';
    const text = document.createElement('p');
    text.textContent = post.message;
    if (post.topic !== 'general') { const topic = document.createElement('small'); topic.textContent = topics.get(post.topic) || post.topic; note.append(topic); }
    const foot = document.createElement('footer');
    const author = document.createElement('strong');
    author.textContent = post.nickname;
    const time = document.createElement('time');
    const date = new Date(post.createdAt);
    if (Number.isFinite(date.getTime())) { time.dateTime = date.toISOString(); time.textContent = date.toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' }); }
    foot.append(author, time);
    note.append(text, foot);
    board.append(note);
  }
  async function loadNotes() {
    if (loading) return;
    loading = true;
    more.disabled = true;
    boardStatus.textContent = 'Opening the guestbook…';
    try {
      const data = await request('/api/guestbook' + (cursor ? '?cursor=' + encodeURIComponent(cursor) : ''));
      if (!Array.isArray(data.posts)) throw new Error('invalid_response');
      data.posts.forEach(appendNote);
      cursor = data.nextCursor || null;
      more.hidden = !cursor;
      more.firstChild.textContent = 'Read more notes ';
      boardStatus.textContent = seen.size ? '' : 'A fresh page, waiting for its first little note. Yours could be the first.';
    } catch {
      boardStatus.textContent = 'The guestbook is taking a moment. You can try again, or reach me by email.';
      more.hidden = false;
      more.firstChild.textContent = 'Try loading again ';
    } finally { loading = false; more.disabled = false; }
  }
  more.addEventListener('click', loadNotes);
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => { if (entries.some(entry => entry.isIntersecting) && !started) { started = true; loadNotes(); observer.disconnect(); } }, { rootMargin: '300px' });
    observer.observe(section);
  } else { started = true; loadNotes(); }
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (submit.disabled || !form.reportValidity()) return;
    const message = form.elements.message.value.trim();
    if (message.length < 2) { status.dataset.kind = 'error'; status.textContent = 'Please write a little more before sending.'; form.elements.message.focus(); return; }
    submit.disabled = true;
    form.setAttribute('aria-busy', 'true');
    status.dataset.kind = 'pending';
    status.textContent = 'Sending your note…';
    try {
      const data = await request('/api/guestbook', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nickname: form.elements.nickname.value.trim(), email: form.elements.email.value.trim(), topic: form.elements.topic.value, message, website: form.elements.website.value }) });
      if (data.status !== 'pending' || !data.id) throw new Error('invalid_response');
      status.dataset.kind = 'success';
      status.textContent = 'Your note is safely in the guestbook. Thank you! It will appear on the wall after review. Your email stays private.';
      form.reset();
      count.textContent = '0 / 1000';
    } catch (error) {
      status.dataset.kind = 'error';
      if (error.status === 429) status.textContent = 'A few too many notes at once. Please wait a while and try again. Your note is still here.';
      else if (error.message === 'invalid_email') status.textContent = 'Please check your email address, or leave that field empty.';
      else if (error.name === 'AbortError') status.textContent = 'That took longer than expected. Your note may have arrived; please wait before trying again. You can also email me.';
      else status.textContent = 'The note could not be confirmed. Your writing is still here—please try again, or send it by email.';
    } finally { submit.disabled = false; form.removeAttribute('aria-busy'); }
  });
  const copy = section.querySelector('[data-copy-email]');
  if (navigator.clipboard && window.isSecureContext) {
    copy.hidden = false;
    copy.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(copy.dataset.copyEmail); copy.querySelector('span').textContent = 'Copied — thank you for reaching out!'; }
      catch { copy.querySelector('span').textContent = 'You can select the address above to copy it.'; }
    });
  }
})();
