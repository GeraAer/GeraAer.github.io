import { WIDTH, HEIGHT, TAU, LEVELS, createGame, update, orbitCount, releaseStar, medals, readProgress, recordWin, mergeProgress } from './engine.mjs';

const $ = id => document.getElementById(id);
const canvas = $('universe'), ctx = canvas.getContext('2d');
const overlay = $('overlay'), helpDialog = $('help-dialog');
const STORAGE = 'mayflare.every-star.v1';
const prefsKey = 'mayflare.every-star.preferences.v1';
let progress = readProgress(null), preferences = {};
try { progress = readProgress(localStorage.getItem(STORAGE)); preferences = JSON.parse(localStorage.getItem(prefsKey) || '{}') || {}; } catch {}
const requestedLanguage = new URLSearchParams(location.search).get('lang');
let lang = requestedLanguage === 'en' ? 'en' : requestedLanguage === 'zh' ? 'zh' : preferences.language || (navigator.language.startsWith('zh') ? 'zh' : 'en');
if (!['zh', 'en'].includes(lang)) lang = 'en';
let relaxed = Boolean(preferences.relaxed), soundEnabled = false;
let game = createGame(0, relaxed), mode = 'menu', chartReturn = 'menu', focusToggle = false;
let pointer = null, keys = new Set(), portrait = false, scale = 1, offsetX = 0, offsetY = 0;
let width = 1000, height = 625, pixelRatio = 1;
let lastTime = 0, visualTime = 0, uiTime = 0, effectClock = 0, toastUntil = 0, effects = [], lastHUD = '';
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const text = (zh, en) => lang === 'zh' ? zh : en;
const local = pair => pair[lang === 'zh' ? 0 : 1];
const two = n => String(n).padStart(2, '0');
const clock = seconds => `${two(Math.floor(seconds / 60))}:${two(Math.floor(seconds % 60))}`;
const icons = {
  arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h15m-5-5 5 5-5 5"/></svg>',
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 11 7-11 7z"/></svg>'
};

function savePrefs() {
  try { localStorage.setItem(prefsKey, JSON.stringify({ language: lang, relaxed })); } catch {}
}

function saveProgress() {
  try {
    progress = mergeProgress(progress, localStorage.getItem(STORAGE));
    localStorage.setItem(STORAGE, JSON.stringify(progress));
  }
  catch { toast(text('此浏览器不能保存进度；当前游戏仍可继续。', 'This browser cannot save progress. You can still keep playing.')); }
}

window.addEventListener('storage', event => {
  if (event.key !== STORAGE || !event.newValue) return;
  progress = mergeProgress(progress, event.newValue);
  if (mode !== 'playing') renderOverlay();
  updateHUD();
});

function setLabels() {
  document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
  document.title = lang === 'zh' ? 'Every Star is Alive · 旅行星' : 'Every Star is Alive · A game by Mayflare';
  $('language').textContent = lang === 'zh' ? 'EN' : '中';
  $('language').setAttribute('aria-label', text('Switch to English', '切换为中文'));
  $('edition-label').textContent = text('旅行星 · 浏览器完整篇', 'EVERY STAR IS ALIVE · WEB EDITION');
  $('save-label').textContent = text('8 个星区 · 进度保存在此设备', '8 SECTORS · SAVED ON THIS DEVICE');
  $('log-label').textContent = text('航行记录', 'FLIGHT JOURNAL');
  $('quota-label').textContent = text('环绕的伙伴', 'COMPANIONS IN ORBIT');
  $('shield-label').textContent = text('星光护盾', 'STARLIGHT SHIELDS');
  $('focus-label').textContent = text('引力收束', 'Focus gravity');
  $('release-label').textContent = text('释放卫星', 'Release');
  $('chart-label').textContent = text('展开星图', 'Constellation chart');
  $('footer-line').textContent = text('每一颗星，都有一个可以回去的地方。', 'Every star deserves a place to call home.');
  $('original-link').textContent = text('原版 · itch.io ↗', 'Original · itch.io ↗');
  $('help').setAttribute('aria-label', text('怎么玩', 'How to play'));
  $('help').dataset.tip = text('怎么玩 · H', 'How to play · H');
  $('pause').setAttribute('aria-label', text('暂停游戏', 'Pause game'));
  $('pause').dataset.tip = text('暂停 · Esc', 'Pause · Esc');
  $('sound').dataset.tip = text('声音', 'Sound');
  $('sound').setAttribute('aria-label', soundEnabled ? text('关闭声音', 'Mute sound') : text('开启声音', 'Enable sound'));
  $('focus').setAttribute('aria-label', text('切换引力收束：扩大捕获范围并减速', 'Toggle gravity focus: a wider capture field and slower movement'));
  $('release').setAttribute('aria-label', text('沿切线释放一颗卫星；可以再次捕获', 'Release one companion along its tangent; you can catch it again'));
  canvas.setAttribute('aria-label', text('移动鼠标、触摸，或使用方向键控制太阳。按空格收束引力，E 释放卫星，Esc 暂停。', 'Move the mouse, touch, or use arrow keys to steer the sun. Space focuses gravity, E releases a companion, Escape pauses.'));
  $('control-hint').textContent = portrait ? text('触摸航行 · 轻点「收束」更稳', 'TOUCH TO STEER · FOCUS TO SLOW DOWN') : text('移动鼠标 / WASD · 空格收束', 'MOUSE / WASD TO STEER · SPACE TO FOCUS');
  renderHelp(); renderOverlay(); updateHUD();
}

function showMenu() {
  mode = 'menu'; keys.clear(); pointer = null; focusToggle = false;
  game = createGame(0, relaxed); effects = [];
  renderOverlay(); updateHUD();
}

function startLevel(index) {
  game = createGame(index, relaxed); mode = 'playing'; focusToggle = index === 0; pointer = null; keys.clear(); effects = [];
  $('toast').classList.remove('visible');
  renderOverlay(); updateHUD();
  canvas.focus({ preventScroll: true });
  toast(local(game.level.tip), 5);
  tone('start');
}

function pauseGame() {
  if (mode !== 'playing') return;
  mode = 'paused'; keys.clear(); pointer = null; renderOverlay(); updateHUD();
}

function resumeGame() {
  if (mode !== 'paused') return;
  mode = 'playing'; keys.clear(); pointer = null; renderOverlay(); updateHUD(); canvas.focus({ preventScroll: true });
}

function openChart() {
  if (mode === 'chart') return;
  chartReturn = mode === 'playing' || mode === 'paused' ? 'paused' : mode;
  mode = 'chart'; keys.clear(); pointer = null; renderOverlay(); updateHUD();
}

function chartClose() { mode = chartReturn; renderOverlay(); updateHUD(); }

function renderOverlay() {
  overlay.hidden = mode === 'playing';
  overlay.className = `overlay ${mode === 'menu' ? 'menu' : 'card-mode'}`;
  if (mode === 'playing') { overlay.replaceChildren(); return; }
  $('toast').classList.remove('visible'); $('toast').textContent = ''; toastUntil = 0;
  if (mode === 'menu') {
    const hasProgress = Object.keys(progress.records).length > 0;
    overlay.innerHTML = `<div class="intro"><span class="eyebrow">A LITTLE ORBITAL ODYSSEY</span><h1>Every star<br>is <em>alive.</em></h1><p>${text('你是一颗小小的太阳。<br>找到漂流的伙伴，带着整个星系回家。', 'You are a little sun.<br>Gather the wandering planets.<br>Bring your solar system home.')}</p><button class="primary-button" data-action="start">${hasProgress ? text('继续远航', 'Continue voyage') : text('让星光启程', 'Begin your voyage')}${icons.arrow}</button><button class="text-button" data-action="chart">${text('展开星图', 'Explore the constellation')} ↗</button><div class="intro-mode"><span>${text('航行方式', 'FLIGHT MODE')}</span><button class="mode-button" data-mode="normal" aria-pressed="${!relaxed}">${text('标准', 'Classic')}</button><button class="mode-button" data-mode="relaxed" aria-pressed="${relaxed}">${text('悠游', 'Gentle')}</button></div><div class="menu-caption">${text('8 个星区 · 无倒计时 · 无需下载', '8 SECTORS · NO TIME LIMIT · NO DOWNLOAD')}</div></div>`;
  } else if (mode === 'paused') {
    overlay.innerHTML = `<div class="result-card"><div class="result-icon">Ⅱ</div><span class="eyebrow">A MOMENT OF STILLNESS</span><h1>${text('星光等你。', 'The stars can wait.')}</h1><p>${text('深呼吸。你的伙伴们都在这里。', 'Take a breath. Your little companions are right here.')}</p><button class="primary-button" data-action="resume">${text('继续航行', 'Resume voyage')}${icons.play}</button><button class="text-button" data-action="retry">${text('重新出发', 'Restart this sector')} · R</button><button class="text-button" data-action="chart">${text('选择星区', 'Choose a sector')}</button><button class="text-button" data-action="menu">${text('回到标题页', 'Back to title')}</button></div>`;
  } else if (mode === 'won' || mode === 'finished') {
    const final = mode === 'finished', all = orbitCount(game) === game.stars.length;
    const earned = medals(game), totalMedals = Object.values(progress.records).reduce((sum, r) => sum + r.medals, 0);
    overlay.innerHTML = `<div class="result-card"><div class="result-icon">✧</div><span class="eyebrow">${final ? 'THE CONSTELLATION IS COMPLETE' : 'SECTOR COMPLETE'}</span><h1>${final ? text('我们到家了。', 'We made it home.') : text('又一片星空，亮了。', 'A little more light.')}</h1><p>${final ? text('八个星区，一路相伴。<br>每一颗星都活着，而你让它们不再孤单。', 'Eight sectors. One beautiful journey.<br>Every star is alive. Thanks to you, none has to shine alone.') : local(game.level.subtitle)}</p><div class="medals" aria-label="${earned} / 3 ${text('星徽', 'medals')}">${[1, 2, 3].map(n => `<span class="${n > earned ? 'empty' : ''}">✦</span>`).join('')}</div><div class="result-stats"><div><strong>${orbitCount(game)} / ${game.stars.length}</strong><span>${text('同行的伙伴', 'PLANETS RESCUED')}</span></div><div><strong>${clock(game.elapsed)}</strong><span>${text('航行时间', 'FLIGHT TIME')}</span></div><div><strong>${final ? `${totalMedals}/24` : game.hits}</strong><span>${final ? text('收集的星徽', 'TOTAL MEDALS') : text('碰撞次数', 'COLLISIONS')}</span></div></div><button class="primary-button" data-action="${final ? 'chart' : 'next'}">${final ? text('再访这片星空', 'Revisit the stars') : text('前往下个星区', 'On to the next sector')}${icons.arrow}</button><button class="text-button" data-action="retry">${text('重玩此星区', 'Replay this sector')}</button><p class="result-note">${earned === 3 ? text('全员获救 · 无碰撞，完美航行。', 'Every planet rescued. No collisions. A perfect flight.') : all ? text('尝试不碰撞，赢得第三枚星徽。', 'Try a flight without collisions for the third medal.') : text('找到所有小星，可再获得一枚星徽。', 'Rescue every planet for another medal.')}</p></div>`;
  } else if (mode === 'lost') {
    overlay.innerHTML = `<div class="result-card"><div class="result-icon">↺</div><span class="eyebrow">LIGHT ALWAYS RETURNS</span><h1>${text('再试一次，好吗？', 'Another little try?')}</h1><p>${text('护盾耗尽了。放慢一点，观察流星的轨迹；你的引力依然温柔。', 'Your shields are gone. Slow down and watch the meteor paths. Your gravity is still gentle.')}</p><button class="primary-button" data-action="retry">${text('重新出发', 'Try this sector again')}${icons.arrow}</button><button class="text-button" data-action="gentle">${text('悠游模式 · 5 层护盾，流星更慢', 'Gentle mode · 5 shields, slower meteors')}</button><button class="text-button" data-action="chart">${text('打开星图', 'Open the constellation chart')}</button></div>`;
  } else if (mode === 'chart') {
    overlay.innerHTML = `<div class="chart-panel"><div class="chart-header"><span class="eyebrow">YOUR LITTLE UNIVERSE</span><button class="small-close" data-action="close-chart" aria-label="${text('关闭星图', 'Close chart')}">×</button></div><h1>${text('八次远航，一片星空。', 'Eight voyages. One sky.')}</h1><div class="sector-grid">${LEVELS.map((level, index) => `<button class="sector-card ${index === game.levelIndex ? 'current' : ''}" data-level="${index}" ${index > progress.unlocked ? 'disabled' : ''} aria-label="${two(index + 1)} ${local(level.name)}${index > progress.unlocked ? text('，尚未解锁', ', locked') : ''}"><span class="sector-n">${two(index + 1)}</span><span class="sector-title">${local(level.name)}</span><span class="sector-medals">${index > progress.unlocked ? '—' : progress.records[index] ? '✦'.repeat(progress.records[index].medals) + '·'.repeat(3 - progress.records[index].medals) : '···'}</span></button>`).join('')}</div><p>${text('通关 +1 星徽 · 全员获救 +1 · 全员获救且无碰撞再 +1<br>进度仅保存在当前浏览器；关闭页面也不会丢失已通关的星区。', 'Finish +1 medal · Rescue everyone +1 · Everyone rescued, no hits +1<br>Completed sectors are saved in this browser. Closing the page will not erase them.')}</p></div>`;
  }
}

function updateHUD() {
  const active = mode !== 'menu', count = orbitCount(game), ready = game.portal.open;
  const timeLabel = clock(game.elapsed);
  if ($('elapsed').textContent !== timeLabel) $('elapsed').textContent = timeLabel;
  const signature = [mode, game.levelIndex, count, ready, game.player.hp, focusToggle, keys.has(' '), lang, relaxed, Object.keys(progress.records).length].join('|');
  if (signature === lastHUD) return;
  lastHUD = signature;
  $('stage-hud').hidden = !active; $('stage-bottom').hidden = !active;
  $('pause').disabled = mode !== 'playing';
  $('focus').disabled = mode !== 'playing'; $('release').disabled = mode !== 'playing' || count === 0;
  $('focus').setAttribute('aria-pressed', String(focusToggle || keys.has(' ')));
  $('mission-number').textContent = active ? `SECTOR ${two(game.levelIndex + 1)} / 08` : '00 — 08';
  $('mission-name').innerHTML = active ? local(game.level.name) : text('带上你的<br>小小星系。', 'A small sun.<br>A whole universe.');
  $('mission-description').textContent = active ? local(game.level.subtitle) : text('成为一颗太阳，找回漂流的小星。让引力把大家连在一起。', 'Become a sun. Find the wandering planets. Let gravity bring you together.');
  $('mission-tip').textContent = active ? local(game.level.tip) : text('没有倒计时。每一颗星，都可以慢慢找到。悠游模式有更多护盾与更慢的流星。', 'No time limit. Every planet can be found at your own pace. Gentle mode adds shields and slows meteors.');
  $('quota-count').textContent = count;
  $('quota-target').textContent = ` / ${game.level.goal}`;
  $('star-slots').innerHTML = game.stars.map((_, i) => `<span class="${i < count ? 'filled' : ''} ${i >= game.level.goal ? 'bonus' : ''}"></span>`).join('');
  $('portal-status').textContent = ready ? text('星门已开启。带大家一起回家。', 'The gate is open. Bring everyone home.') : text(`再找到 ${game.level.goal - count} 颗，开启星门。`, `${game.level.goal - count} more to open the gate.`);
  document.querySelector('.quota-box').classList.toggle('ready', ready);
  $('shields').innerHTML = Array.from({ length: relaxed ? 5 : 3 }, (_, i) => `<span class="${i >= game.player.hp ? 'spent' : ''}">✦</span>`).join('');
  $('shields').setAttribute('aria-label', `${game.player.hp} ${text('层护盾', 'shields remaining')}`);
  $('chart-progress').textContent = `${two(Object.keys(progress.records).length)} / 08`;
  $('sector-label').textContent = `${two(game.levelIndex + 1)} / ${local(game.level.name).toUpperCase()}`;
}

function toast(message, seconds = 3) {
  $('toast').textContent = message; $('toast').classList.add('visible'); toastUntil = effectClock + seconds;
}

function renderHelp() {
  const steps = lang === 'zh' ? [
    ['你就是太阳', '移动鼠标、触摸屏幕，或按 WASD / 方向键航行。小星会被你的引力吸引。'],
    ['靠近，然后慢下来', '按住空格或点亮「引力收束」，扩大捕获范围并减速。进入范围、速度合适的小星会成为卫星。第一关默认开启收束。'],
    ['带着伙伴走向星门', '左侧亮青色小星是你的伙伴。捕获目标数量后，青色漩涡星门会开启。碰撞危险消耗一层护盾，并释放一颗卫星；它可以再次被找回。'],
    ['可选：放它去远行', '按 E 或「释放卫星」，让最后一颗卫星沿轨道切线飞出。可以再次捕获；释放不是通关要求。边界会让自由小星反弹，不会永久丢失。']
  ] : [
    ['You are the sun', 'Move your mouse, touch the screen, or use WASD / arrow keys to steer. Little planets are drawn to your gravity.'],
    ['Approach. Then slow down.', 'Hold Space or toggle Focus for a wider capture field and slower movement. Nearby planets moving at a compatible speed join your orbit. Focus starts on in sector one.'],
    ['Bring your companions home', 'Cyan planets are your friends. Capture the quota to open the cyan whirlgate. A collision uses a shield and releases one companion; you can rescue it again.'],
    ['Optional: let one go', 'Press E or Release to send the last companion along its orbital tangent. Catch it again later. Releasing is never required. Free planets bounce at the boundary and cannot be permanently lost.']
  ];
  $('help-content').innerHTML = `<span class="eyebrow">A FIELD GUIDE TO GRAVITY</span><h2 id="help-title">${text('一点引力，一路相伴。', 'A little gravity goes a long way.')}</h2><p>${text('找到足够的小星，进入星门。没有倒计时；这是关于节奏、靠近与陪伴的小小旅程。', 'Gather enough planets, then enter the gate. There is no time limit. This is a small journey about rhythm, closeness, and company.')}</p><div class="help-steps">${steps.map((s, i) => `<div class="help-step"><span>${two(i + 1)}</span><div><h3>${s[0]}</h3><p>${s[1]}</p></div></div>`).join('')}</div><div class="help-keys"><span>WASD / ↑ ↓ ← → · ${text('移动', 'MOVE')}</span><span>SPACE · ${text('收束', 'FOCUS')}</span><span>E · ${text('释放', 'RELEASE')}</span><span>R · ${text('重玩', 'RESTART')}</span><span>ESC / P · ${text('暂停', 'PAUSE')}</span><span>H · ${text('帮助', 'HELP')}</span></div><p class="help-small">${text('标准：3 层护盾。悠游：5 层护盾、流星减速。通关后可从星图重玩。声音默认关闭，可随时开启；进度只存储在此浏览器。', 'Classic: 3 shields. Gentle: 5 shields and slower meteors. Replay completed sectors from the chart. Sound starts muted. Progress stays in this browser.')}<br>${text('本网页篇根据 Mayflare 的 Unity 原型重新制作，新增八关、护盾、切向释放与完整引导。', 'This web edition reimagines Mayflare’s Unity prototype with eight sectors, shields, tangential release, and a complete tutorial.')}</p>`;
}

function openHelp() { keys.clear(); pointer = null; helpDialog.showModal(); }
$('help').addEventListener('click', openHelp);
$('close-help').addEventListener('click', () => helpDialog.close());
helpDialog.addEventListener('click', event => { if (event.target === helpDialog && (event.clientX < helpDialog.getBoundingClientRect().left || event.clientX > helpDialog.getBoundingClientRect().right || event.clientY < helpDialog.getBoundingClientRect().top || event.clientY > helpDialog.getBoundingClientRect().bottom)) helpDialog.close(); });
helpDialog.addEventListener('close', () => { keys.clear(); pointer = null; if (mode === 'playing') canvas.focus({ preventScroll: true }); });
$('language').addEventListener('click', () => {
  lang = lang === 'zh' ? 'en' : 'zh';
  $('toast').classList.remove('visible'); $('toast').textContent = ''; toastUntil = 0;
  const url = new URL(location.href); url.searchParams.set('lang', lang); history.replaceState(null, '', url);
  savePrefs(); setLabels();
});
$('pause').addEventListener('click', pauseGame);
$('focus').addEventListener('click', () => { focusToggle = !focusToggle; updateHUD(); });
$('release').addEventListener('click', () => { releaseStar(game); updateHUD(); });
$('chart').addEventListener('click', openChart);
overlay.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button || button.disabled) return;
  if (button.dataset.level !== undefined) { startLevel(Number(button.dataset.level)); return; }
  if (button.dataset.mode) { relaxed = button.dataset.mode === 'relaxed'; savePrefs(); game = createGame(0, relaxed); renderOverlay(); updateHUD(); return; }
  const action = button.dataset.action;
  if (action === 'start') startLevel(progress.unlocked);
  else if (action === 'next') startLevel(game.levelIndex + 1);
  else if (action === 'retry') startLevel(game.levelIndex);
  else if (action === 'resume') resumeGame();
  else if (action === 'chart') openChart();
  else if (action === 'close-chart') chartClose();
  else if (action === 'menu') showMenu();
  else if (action === 'gentle') { relaxed = true; savePrefs(); startLevel(game.levelIndex); }
});

function worldPoint(event) {
  const bounds = canvas.getBoundingClientRect();
  const x = event.clientX - bounds.left, y = event.clientY - bounds.top;
  if (portrait) return { x: Math.max(22, Math.min(WIDTH - 22, (y - offsetY) / scale)), y: Math.max(22, Math.min(HEIGHT - 22, (width - x - offsetX) / scale)) };
  return { x: Math.max(22, Math.min(WIDTH - 22, (x - offsetX) / scale)), y: Math.max(22, Math.min(HEIGHT - 22, (y - offsetY) / scale)) };
}
canvas.addEventListener('pointerdown', event => { if (mode === 'playing') { pointer = worldPoint(event); canvas.setPointerCapture(event.pointerId); canvas.focus({ preventScroll: true }); } });
canvas.addEventListener('pointermove', event => { if (mode === 'playing' && (event.pointerType === 'mouse' || event.buttons)) pointer = worldPoint(event); });
canvas.addEventListener('pointerleave', event => { if (event.pointerType === 'mouse') pointer = null; });
canvas.addEventListener('pointercancel', () => { pointer = null; });
window.addEventListener('keydown', event => {
  if (helpDialog.open || event.ctrlKey || event.metaKey || event.altKey || ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)) return;
  const key = event.key.toLowerCase();
  if (key === 'escape' || key === 'p') { event.preventDefault(); if (mode === 'playing') pauseGame(); else if (mode === 'paused') resumeGame(); else if (mode === 'chart') chartClose(); return; }
  if (key === 'h') { event.preventDefault(); if (!event.repeat) openHelp(); return; }
  if (mode !== 'playing') return;
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd', ' '].includes(key)) { event.preventDefault(); keys.add(key); }
  if (key === 'e' && !event.repeat) { releaseStar(game); updateHUD(); }
  if (key === 'r' && !event.repeat) startLevel(game.levelIndex);
});
window.addEventListener('keyup', event => keys.delete(event.key.toLowerCase()));
window.addEventListener('blur', () => { keys.clear(); pointer = null; if (!helpDialog.open) pauseGame(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { keys.clear(); pointer = null; pauseGame(); } });

let audioContext = null;
function tone(kind) {
  if (!soundEnabled || !audioContext) return;
  const start = audioContext.currentTime;
  const notes = { capture: [523, 784, 1047], release: [659, 440], hit: [110, 82], portal: [392, 523, 659, 784], won: [523, 659, 784, 1047], lost: [220, 196, 146], start: [392, 523] }[kind] || [523];
  notes.forEach((frequency, index) => {
    const oscillator = audioContext.createOscillator(), gain = audioContext.createGain();
    oscillator.type = kind === 'hit' ? 'triangle' : 'sine';
    oscillator.frequency.value = frequency;
    const at = start + index * .085;
    gain.gain.setValueAtTime(0, at); gain.gain.linearRampToValueAtTime(.045, at + .015); gain.gain.exponentialRampToValueAtTime(.001, at + .4);
    oscillator.connect(gain); gain.connect(audioContext.destination); oscillator.start(at); oscillator.stop(at + .45);
  });
}
$('sound').addEventListener('click', async () => {
  try {
    if (!audioContext) { const Audio = window.AudioContext || window.webkitAudioContext; if (!Audio) throw new Error('audio'); audioContext = new Audio(); }
    await audioContext.resume(); soundEnabled = !soundEnabled;
    $('sound').setAttribute('aria-pressed', String(soundEnabled)); setLabels(); if (soundEnabled) tone('capture');
  } catch { toast(text('此浏览器暂不支持声音，仍可继续游玩。', 'Sound is unavailable in this browser. You can still play.')); }
});

const sky = Array.from({ length: 130 }, (_, i) => ({ x: ((i * 173.71 + 83) % WIDTH), y: ((i * 93.17 + 21) % HEIGHT), r: i % 8 === 0 ? 1.25 : .6, a: .15 + (i % 7) * .07 }));
function circle(x, y, r, fill, stroke, line = 1) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = line; ctx.stroke(); } }
function glow(x, y, r, color) { const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, color); g.addColorStop(1, 'transparent'); circle(x, y, r, g); }
function line(x, y, x2, y2, color, w = 1) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x2, y2); ctx.strokeStyle = color; ctx.lineWidth = w; ctx.stroke(); }
function upright(x, y, callback) { ctx.save(); ctx.translate(x, y); if (portrait) ctx.rotate(-Math.PI / 2); callback(); ctx.restore(); }
function label(message, x, y, color = '#b4c7df', size = 10) { upright(x, y, () => { ctx.fillStyle = color; ctx.font = `500 ${size}px "Space Grotesk", "Microsoft YaHei", sans-serif`; ctx.textAlign = 'center'; ctx.fillText(message, 0, 0); }); }

function drawSpace() {
  ctx.fillStyle = '#0a1023'; ctx.fillRect(0, 0, WIDTH, HEIGHT);
  glow(850, 50, 590, '#17334765'); glow(270, 580, 430, '#24274370'); glow(750, 550, 390, '#241d3930');
  ctx.strokeStyle = '#9bbed807'; ctx.lineWidth = 1;
  for (let x = 25; x < WIDTH; x += 50) line(x, 0, x, HEIGHT, '#9bbed807');
  for (let y = 25; y < HEIGHT; y += 50) line(0, y, WIDTH, y, '#9bbed807');
  for (let i = 0; i < sky.length; i++) {
    const s = sky[i], alpha = reducedMotion.matches ? s.a : s.a * (.82 + Math.sin(visualTime * .6 + i) * .18);
    circle(s.x, s.y, s.r, `rgba(188,216,239,${alpha})`);
    if (i % 23 === 0) { line(s.x - 3, s.y, s.x + 3, s.y, '#d6e6f057'); line(s.x, s.y - 3, s.x, s.y + 3, '#d6e6f057'); }
  }
  ctx.setLineDash([3, 8]); ctx.strokeStyle = '#6b8ba118'; ctx.strokeRect(20, 20, WIDTH - 40, HEIGHT - 40); ctx.setLineDash([]);
}

function drawSun(x, y, radius, focus, invincible = 0) {
  if (invincible > 0 && Math.floor(invincible * 9) % 2 === 0) ctx.globalAlpha = .45;
  glow(x, y, focus ? 120 : 80, focus ? '#9beee828' : '#efd09821');
  const fieldRadius = focus ? 83 : 56;
  circle(x, y, fieldRadius, focus ? '#8eeae009' : null, focus ? '#8eeae065' : '#e4cfa820', 1);
  if (focus) { ctx.setLineDash([2, 6]); circle(x, y, fieldRadius + 7, null, '#8eeae02b'); ctx.setLineDash([]); }
  if (!reducedMotion.matches && mode === 'playing') {
    const angle = Math.atan2(game.player.vy, game.player.vx), velocity = Math.hypot(game.player.vx, game.player.vy);
    if (velocity > 25) {
      ctx.beginPath(); ctx.moveTo(x - Math.sin(angle) * 9, y + Math.cos(angle) * 9); ctx.lineTo(x - Math.cos(angle) * (22 + velocity * .3), y - Math.sin(angle) * (22 + velocity * .3)); ctx.lineTo(x + Math.sin(angle) * 9, y - Math.cos(angle) * 9);
      ctx.fillStyle = '#efcc8c20'; ctx.fill();
    }
  }
  ctx.save(); ctx.translate(x, y); ctx.rotate(reducedMotion.matches ? .2 : visualTime * .08);
  ctx.beginPath();
  for (let i = 0; i < 24; i++) { const a = i / 24 * TAU, r = i % 2 ? radius * 1.03 : radius * 1.4; const px = Math.cos(a) * r, py = Math.sin(a) * r; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
  ctx.closePath(); ctx.fillStyle = '#c99d63'; ctx.fill(); ctx.restore();
  const sun = ctx.createRadialGradient(x - radius * .35, y - radius * .4, 0, x, y, radius); sun.addColorStop(0, '#fff0c0'); sun.addColorStop(1, '#ebc780');
  circle(x, y, radius, sun);
  upright(x, y, () => { circle(-radius * .31, -radius * .08, radius * .08, '#4b3932'); circle(radius * .31, -radius * .08, radius * .08, '#4b3932'); ctx.beginPath(); ctx.arc(0, radius * .15, radius * .19, .15, Math.PI - .15); ctx.strokeStyle = '#665140'; ctx.lineWidth = 1.3; ctx.stroke(); });
  ctx.globalAlpha = 1;
}

function drawPlanet(s, time) {
  const captured = s.state === 'orbit', color = captured ? '#a3ede4' : ['#8bc2df', '#d2b5eb', '#a7d9e0', '#c6d5ad'][s.id % 4];
  if (captured) {
    const p = game.player;
    circle(p.x, p.y, s.radius, null, '#96ddd21c', .8);
    if (!reducedMotion.matches) {
      ctx.beginPath(); ctx.arc(p.x, p.y, s.radius, s.angle - Math.sign(s.omega) * 1.1, s.angle, s.omega < 0); ctx.strokeStyle = '#9eeddb65'; ctx.lineWidth = 1.8; ctx.stroke();
    }
  }
  glow(s.x, s.y, s.r * 3, captured ? '#8ce7dc35' : '#97b3d524');
  circle(s.x, s.y, s.r, color);
  ctx.save(); ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.clip(); circle(s.x + 3, s.y + 4, s.r * .75, captured ? '#398e9b80' : '#47709670'); ctx.restore();
  upright(s.x, s.y, () => { circle(-2.4, -.5, .7, '#18394a'); circle(2.4, -.5, .7, '#18394a'); if (captured) { ctx.beginPath(); ctx.arc(0, 1, 2.2, 0, Math.PI); ctx.strokeStyle = '#18394a'; ctx.lineWidth = .6; ctx.stroke(); } });
  if (!captured && s.cooldown === 0) { ctx.setLineDash([2, 4]); circle(s.x, s.y, s.r + 7, null, '#b8d9e029'); ctx.setLineDash([]); }
}

function drawHazard(h) {
  if (h.x2 !== h.originX || h.y2 !== h.originY) {
    ctx.setLineDash([3, 7]); line(h.originX, h.originY, h.x2, h.y2, '#f28b9a33'); ctx.setLineDash([]);
    circle(h.originX, h.originY, 3, null, '#fa8b9f50'); circle(h.x2, h.y2, 3, null, '#fa8b9f50');
  }
  glow(h.x, h.y, h.r * 2.8, '#eb667e19');
  circle(h.x, h.y, h.r + 7, null, '#ec869a21');
  ctx.save(); ctx.translate(h.x, h.y); ctx.rotate(reducedMotion.matches ? .5 : visualTime * .22);
  ctx.beginPath(); for (let i = 0; i < 7; i++) { const a = i / 7 * TAU, r = h.r * (i % 2 ? .85 : 1); i ? ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r) : ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); ctx.fillStyle = '#543144'; ctx.fill(); ctx.strokeStyle = '#dc8292'; ctx.lineWidth = 1.5; ctx.stroke();
  line(-h.r * .45, -h.r * .3, h.r * .3, h.r * .2, '#a65f73'); line(h.r * .3, h.r * .2, 0, h.r * .65, '#a65f73'); ctx.restore();
  upright(h.x, h.y, () => { line(-5, -6, 5, 5, '#f8b3b8', 1.7); line(-5, 5, 5, -6, '#f8b3b8', 1.7); });
}

function drawWell(w) {
  glow(w.x, w.y, 125, '#9275e022');
  for (let i = 0; i < 3; i++) { ctx.save(); ctx.translate(w.x, w.y); ctx.rotate((reducedMotion.matches ? 0 : visualTime * .09) + i); ctx.beginPath(); ctx.ellipse(0, 0, 52 + i * 15, 30 + i * 11, 0, 0, TAU); ctx.strokeStyle = `rgba(164,136,232,${.24 - i * .05})`; ctx.lineWidth = 1; ctx.stroke(); ctx.restore(); }
  circle(w.x, w.y, w.r + 4, '#76669c', '#c6ace4', 1); circle(w.x, w.y, w.r, '#101426');
  circle(w.x, w.y, w.r - 8, null, '#a389d742');
  label('◇', w.x, w.y + 5, '#b297df', 15);
}

function drawPortal(p, count, goal) {
  const color = p.open ? '#91ede6' : '#48637d';
  glow(p.x, p.y, p.open ? 110 : 65, p.open ? '#55cccf2b' : '#37567114');
  ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(reducedMotion.matches ? -.3 : visualTime * -.28);
  for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.ellipse(0, 0, 15 + i * 6, 9 + i * 6, i * .48, 0, TAU); ctx.strokeStyle = p.open ? `rgba(135,236,230,${.7 - i * .13})` : `rgba(90,127,155,${.35 - i * .06})`; ctx.lineWidth = i === 0 ? 2 : 1; ctx.stroke(); }
  ctx.restore();
  ctx.setLineDash([1, 7]); circle(p.x, p.y, 43, null, color); ctx.setLineDash([]);
  circle(p.x, p.y, 5, p.open ? '#cdffff' : '#48637d');
  label(p.open ? text('回家的方向', 'WAY HOME') : `${count} / ${goal}`, p.x, p.y + 65, color, 9);
}

function drawMenu() {
  const x = portrait ? 720 : 720, y = portrait ? 255 : 312;
  glow(x, y, 245, '#8ddcce11');
  const sizes = [70, 112, 162];
  sizes.forEach((r, i) => { circle(x, y, r, null, `rgba(132,186,208,${.23 - i * .04})`); });
  ctx.save(); ctx.translate(x, y); ctx.rotate(-.28); ctx.beginPath(); ctx.ellipse(0, 0, 200, 105, 0, 0, TAU); ctx.strokeStyle = '#8ac6d32d'; ctx.stroke(); ctx.restore();
  for (let i = 0; i < 6; i++) {
    const r = sizes[Math.floor(i / 2)], a = i * 1.7 + (reducedMotion.matches ? .3 : visualTime * (.16 - i * .012));
    const s = { x: x + Math.cos(a) * r, y: y + Math.sin(a) * r, r: 8 + i % 3, id: i, state: 'free', cooldown: 1 };
    drawPlanet(s, visualTime);
  }
  drawSun(x, y, 28, false);
  label('YOU ARE A LITTLE SUN', x, y + 210, '#8fb5c8', 8);
  if (!portrait) { line(x - 93, y + 205, x - 53, y + 205, '#8fb5c850'); line(x + 53, y + 205, x + 93, y + 205, '#8fb5c850'); }
}

function drawEffects() {
  for (const effect of effects) {
    const age = effectClock - effect.at, ratio = age / effect.life;
    if (ratio >= 1) continue;
    if (!reducedMotion.matches) {
      circle(effect.x, effect.y, 15 + ratio * 55, null, effect.color.replace('ALPHA', String((1 - ratio) * .6)), 1.5);
      for (let i = 0; i < 8; i++) { const a = i / 8 * TAU, d = ratio * 43; circle(effect.x + Math.cos(a) * d, effect.y + Math.sin(a) * d, 1.7, effect.color.replace('ALPHA', String(1 - ratio))); }
    }
  }
  effects = effects.filter(effect => effectClock - effect.at < effect.life);
}

function draw() {
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0); ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#080e1e'; ctx.fillRect(0, 0, width, height);
  ctx.save();
  if (portrait) { ctx.translate(width - offsetX, offsetY); ctx.rotate(Math.PI / 2); ctx.scale(scale, scale); }
  else { ctx.translate(offsetX, offsetY); ctx.scale(scale, scale); }
  drawSpace();
  if (mode === 'menu') drawMenu();
  else {
    const count = orbitCount(game);
    for (const w of game.wells) drawWell(w);
    for (const h of game.hazards) drawHazard(h);
    drawPortal(game.portal, count, game.level.goal);
    for (const s of game.stars) drawPlanet(s, game.elapsed);
    drawSun(game.player.x, game.player.y, 16, game.focus, game.player.invincible);
    if (mode === 'playing' && pointer && Math.hypot(pointer.x - game.player.x, pointer.y - game.player.y) > 25) {
      circle(pointer.x, pointer.y, 5, null, '#d0e0ec2e'); line(pointer.x - 8, pointer.y, pointer.x + 8, pointer.y, '#d0e0ec33'); line(pointer.x, pointer.y - 8, pointer.x, pointer.y + 8, '#d0e0ec33');
    }
  }
  drawEffects(); ctx.restore();
}

function resize() {
  const bounds = canvas.getBoundingClientRect(); width = bounds.width; height = bounds.height;
  if (!width || !height) return;
  pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * pixelRatio); canvas.height = Math.round(height * pixelRatio);
  portrait = width / height < .85;
  scale = Math.min(width / (portrait ? HEIGHT : WIDTH), height / (portrait ? WIDTH : HEIGHT));
  offsetX = (width - (portrait ? HEIGHT : WIDTH) * scale) / 2;
  offsetY = (height - (portrait ? WIDTH : HEIGHT) * scale) / 2;
  $('control-hint').textContent = portrait ? text('触摸航行 · 轻点「收束」更稳', 'TOUCH TO STEER · FOCUS TO SLOW DOWN') : text('移动鼠标 / WASD · 空格收束', 'MOUSE / WASD TO STEER · SPACE TO FOCUS');
  draw();
}
new ResizeObserver(resize).observe(canvas.parentElement);

function processEvents() {
  for (const event of game.events.splice(0)) {
    tone(event.type);
    const color = event.type === 'hit' || event.type === 'lost' ? 'rgba(251,134,156,ALPHA)' : event.type === 'capture' ? 'rgba(153,238,220,ALPHA)' : 'rgba(241,211,160,ALPHA)';
    effects.push({ x: event.x, y: event.y, at: effectClock, life: .8, color });
    if (event.type === 'capture') toast(text(`找到你了！${event.count} 颗小星正在环绕。`, `Found you! ${event.count} ${event.count === 1 ? 'companion' : 'companions'} in orbit.`), 2.2);
    if (event.type === 'portal') toast(text('星门开启了。带着伙伴一起回家。', 'The gate is open. Bring your companions home.'), 5);
    if (event.type === 'hit') toast(text(`碰撞！还剩 ${game.player.hp} 层护盾，掉落的伙伴可以找回。`, `Collision! ${game.player.hp} shields left. You can rescue the released companion.`), 3.5);
    if (event.type === 'release') toast(text('沿切线远行。靠近后可以再次捕获。', 'A tangential goodbye. You can catch that companion again.'), 2.5);
    if (event.type === 'won') { progress = recordWin(progress, game); saveProgress(); mode = game.levelIndex === LEVELS.length - 1 ? 'finished' : 'won'; pointer = null; keys.clear(); renderOverlay(); updateHUD(); }
    if (event.type === 'lost') { mode = 'lost'; pointer = null; keys.clear(); renderOverlay(); updateHUD(); }
  }
}

function frame(now) {
  const dt = Math.min((now - lastTime) / 1000 || 0, .05); lastTime = now;
  effectClock += dt;
  if (!reducedMotion.matches && !document.hidden) visualTime += dt;
  if (mode === 'playing' && !helpDialog.open) {
    const screenDx = Number(keys.has('d') || keys.has('arrowright')) - Number(keys.has('a') || keys.has('arrowleft'));
    const screenDy = Number(keys.has('s') || keys.has('arrowdown')) - Number(keys.has('w') || keys.has('arrowup'));
    const dx = portrait ? screenDy : screenDx, dy = portrait ? -screenDx : screenDy;
    update(game, { dx, dy, target: pointer, focus: focusToggle || keys.has(' ') }, dt);
    processEvents();
    uiTime += dt; if (uiTime > .15) { uiTime = 0; updateHUD(); }
  }
  if (toastUntil < effectClock) $('toast').classList.remove('visible');
  draw(); requestAnimationFrame(frame);
}
setLabels(); resize(); requestAnimationFrame(frame);
