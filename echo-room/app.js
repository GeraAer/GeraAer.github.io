'use strict';
(() => {
  const root = document.getElementById('app');
  const saved = (key) => { try { return sessionStorage.getItem(key); } catch { return null; } };
  const save = (key, value) => { try { if (value == null) sessionStorage.removeItem(key); else sessionStorage.setItem(key, value); } catch {} };
  let lang = new URLSearchParams(location.search).get('lang') || saved('echo-lang') || (navigator.language.startsWith('zh') ? 'zh' : 'en');
  let token = saved('echo-token'), user = null, room = null, authMode = 'register', chosenRole = 'judge', busy = false;
  let polling = false, signature = '', clockOffset = 0, connectionLost = false, currentView = '';
  const drafts = {}, params = new URLSearchParams(location.search);
  const invitation = (params.get('room') || saved('echo-room') || '').toUpperCase();
  const base = globalThis.ECHO_API_BASE || '';
  const t = (zh, en) => lang === 'zh' ? zh : en;
  const e = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const questions = () => t(['今天晚饭吃了什么？','最近一次熬夜在干嘛？','有没有一个一直改不掉的小习惯？','最近单曲循环的是哪首？','突然多出一天假，你会怎么过？','说一句你朋友一看就知道是你的话。'], ['What did you have for dinner?','What kept you up late recently?','What’s a habit you can’t shake?','What song is on repeat lately?','An extra day off. What would you do?','Say something your friend would recognize as you.']);
  const errors = {
    invalid_username:['用户名用 3–24 位英文字母、数字或下划线。','Use 3–24 letters, numbers, or underscores.'], invalid_password:['密码需要 10–128 个字符。','Use a password of 10–128 characters.'],
    username_taken:['这个用户名已被使用。','This username is already taken.'], wrong_credentials:['用户名或密码不正确。','Incorrect username or password.'], login_required:['请先登录。','Please sign in first.'],
    session_expired:['登录已过期，请重新登录。','Your session expired. Please sign in again.'], invalid_room:['请输入 8 位房间号。','Enter an 8-character room code.'], room_expired:['房间不存在或已过期。','This room does not exist or has expired.'],
    room_full:['这个房间已有两位玩家。','This room already has two players.'], not_in_room:['你不在这个房间内。','You are not a member of this room.'], wrong_phase:['回合已更新，请查看当前状态。','The round changed. Check the current state.'],
    room_changed:['房间刚刚更新，请重试。','The room just changed. Please try again.'], rate_limited:['操作过于频繁或试玩额度已用完，请稍后再试。','Too many requests or the playtest allowance is reached. Try again later.'],
    ai_unconfigured:['AI 还未接通，请稍后再来。','The AI is not connected yet. Please return later.'], ai_balance:['AI 服务余额不足，本轮尚未公布。','The AI service has insufficient credit. This round has not been revealed.'],
    ai_key:['AI 服务暂时无法验证，本轮尚未公布。','The AI service could not authenticate. This round has not been revealed.'], ai_unavailable:['AI 暂时没有回应，可以重试本轮。','The AI did not respond. You can retry this round.'],
    ai_timeout:['AI 回应超时，可以重试本轮。','The AI response timed out. You can retry this round.'], ai_empty:['AI 未返回有效回答，请重试。','The AI returned no answer. Please retry.'],
    retry_limit:['本轮已达到重试上限，请重新开局。','This round reached its retry limit. Start a new game.'], answer_timeout:['发言超时，本局已结束。','The answer deadline passed. This game has ended.'],
    service_unavailable:['暂时无法连接回声室，请稍后重试。','Echo Room is temporarily unavailable. Please try again.'], invalid_text:['请填写 1–140 个字符。','Enter 1–140 characters.'],
    network:['连接暂时中断，正在重连。输入的文字会保留。','Connection interrupted. Reconnecting; your draft is preserved.'],
  };
  const message = code => { const pair = errors[code] || errors.service_unavailable; return t(...pair); };
  let noticeTimer;
  function notice(text) { const el = document.getElementById('notice'); el.textContent = text; el.hidden = false; clearTimeout(noticeTimer); noticeTimer = setTimeout(() => el.hidden = true, 6000); }
  async function api(path, data) {
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 35000);
    try {
      const response = await fetch(base + path, { method: data === undefined ? 'GET' : 'POST', headers: { ...(data !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: data === undefined ? undefined : JSON.stringify(data), signal: controller.signal, cache: 'no-store', credentials: 'omit' });
      const result = await response.json();
      if (!response.ok) { const error = new Error(result.error || 'service_unavailable'); error.status = response.status; throw error; } return result;
    } catch (error) { if (!error.status) throw new Error('network'); throw error; } finally { clearTimeout(timer); }
  }
  function rules() { return `<details class="rules"><summary>${t('规则与说明','Rules & details')}</summary><ol><li>${t('两个人一起玩：一人提问、判断，另一人回答。','Two people play: one asks and judges; the other answers.')}</li><li>${t('共 6 轮。前三轮 AI 照抄真人，后三轮 AI 自己回答。','Six rounds. The AI copies the human for three, then writes its own answers.')}</li><li>${t('A、B 的回答同时出现，身份整局不变。','A and B reply together. Their identities stay fixed.')}</li><li>${t('最后 20 秒选出真人。选对，两人一起赢；选错或超时，AI 赢。','Pick the human in the final 20 seconds. Get it right and both players win. A wrong choice or timeout gives the AI the win.')}</li></ol><p class="fine">${t('每次回答限 90 秒。房间 30 分钟后过期。对话会发送给 DeepSeek，请勿填写敏感信息。账号暂不支持找回密码。','Each answer has a 90-second limit. Rooms expire after 30 minutes. Dialogue is sent to DeepSeek; avoid sensitive information. Password recovery is not yet available.')}</p></details>`; }
  function header() { document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en'; document.getElementById('language').textContent = t('EN', '中文'); const logout = document.getElementById('logout'); logout.hidden = !user; logout.textContent = t('退出', 'Sign out'); root.removeAttribute('aria-busy'); }
  function auth() {
    root.innerHTML = `<section class="welcome">
      <div class="hero">
        <div class="hero-kicker"><span>${t('双人对话游戏','A GAME FOR TWO')}</span><span>02 HUMANS / 01 AI</span></div>
        <h1 class="hero-title" aria-label="ECHO ROOM · 回声室"><span>ECHO</span><span class="title-cut">ROOM<small>回声室</small></span></h1>
        <div class="hero-bottom"><div class="hero-copy"><h2>${t('哪个才是你朋友？','Which one is your friend?')}</h2><p>${t('一个真人，一个学他说话的 AI。<br>聊六轮，再做判断。','One human. One AI copying them.<br>Ask six questions. Then make your choice.')}</p></div><div class="identity-print" aria-hidden="true"><span>A</span><span>B</span><i>?</i></div></div>
        <ol class="round-route"><li><span>01—03</span><b>${t('复读','COPY')}</b></li><li><span>04—06</span><b>${t('AI 作答','AI ANSWERS')}</b></li><li><span>00:20</span><b>${t('判断','DECIDE')}</b></li></ol>
      </div>
      <div class="entry-panel"><div class="entry-caption"><span>PLAYER ENTRY</span><span>↙</span></div>
        <div class="auth-switch"><button type="button" data-auth="register" aria-pressed="${authMode === 'register'}"><small>01</small>${t('新玩家', 'NEW PLAYER')}</button><button type="button" data-auth="login" aria-pressed="${authMode === 'login'}"><small>02</small>${t('登录', 'SIGN IN')}</button></div>
        <div class="entry-body"><h2>${authMode === 'register' ? t('先取个名字。','Choose a name.') : t('接着玩。','Welcome back.')}</h2><p class="entry-note">${authMode === 'register' ? t('注册后，建房或加入朋友。','Create an account, then meet your friend.') : t('登录后，进入房间。','Sign in to create or join a room.')}</p>
        ${invitation ? `<p class="badge">${t('受邀房间','Invitation')} ${e(invitation)}</p>` : ''}
        <form id="auth-form"><label for="username">${t('用户名','Username')}</label><input id="username" name="username" required minlength="3" maxlength="24" pattern="[A-Za-z0-9_]{3,24}" autocomplete="username" autocapitalize="none" spellcheck="false" placeholder="${t('3–24 位字母、数字或下划线','3–24 letters, numbers or underscores')}"><label for="password">${t('密码','Password')}</label><input id="password" name="password" type="password" required minlength="10" maxlength="128" autocomplete="${authMode === 'register' ? 'new-password' : 'current-password'}" placeholder="${t('至少 10 个字符','At least 10 characters')}"><button class="primary full" type="submit"><span>${authMode === 'register' ? t('注册，开始玩','CREATE ACCOUNT') : t('进入大厅','ENTER LOBBY')}</span><span aria-hidden="true">↗</span></button><p class="fine">${t('不用邮箱。对局里只显示 A 和 B。','No email needed. In the game, names are just A and B.')}</p></form>${rules()}</div>
      </div>
    </section>`;
    root.querySelectorAll('[data-auth]').forEach(b => b.onclick = () => { authMode = b.dataset.auth; auth(); });
    document.getElementById('auth-form').onsubmit = async ev => { ev.preventDefault(); if (busy) return; const values = new FormData(ev.currentTarget); await run(async () => { const result = await api('/api/auth/' + authMode, { username: values.get('username'), password: values.get('password') }); token = result.token; user = result.user; save('echo-token', token); render(); if (invitation) document.getElementById('join-code').value = invitation; }); };
  }
  function lobby() {
    root.innerHTML = `<section class="lobby"><div class="section-header"><div><p class="eyebrow">PLAY / LOBBY</p><h1>${t('准备开局。','LET’S PLAY.')}</h1><p>${t('叫上一个朋友，进同一个房间。','Bring a friend. Join the same room.')}</p></div><span class="badge">${e(user.username)}</span></div><div class="lobby-grid"><section class="create-panel"><div class="panel-heading"><span class="step-no">01</span><h2>${t('创建房间','CREATE A ROOM')}</h2></div><p>${t('你选一个角色，朋友玩另一个。','Choose a role. Your friend takes the other.')}</p><div class="role-picks"><button data-role="judge" aria-pressed="${chosenRole === 'judge'}"><span class="role-index" aria-hidden="true">Ⅰ</span><span><b>${t('判断者','JUDGE')}</b><small>${t('你提问，最后选出真人。','Ask questions. Pick the human.')}</small></span><span class="role-arrow" aria-hidden="true">↗</span></button><button data-role="speaker" aria-pressed="${chosenRole === 'speaker'}"><span class="role-index" aria-hidden="true">Ⅱ</span><span><b>${t('发言者','SPEAKER')}</b><small>${t('你回答，AI 会学你说话。','Answer. The AI learns from you.')}</small></span><span class="role-arrow" aria-hidden="true">↗</span></button></div><button class="primary full" id="create"><span>${t('创建房间','CREATE ROOM')}</span><span aria-hidden="true">↗</span></button></section><section class="join-panel"><div class="panel-heading"><span class="step-no">02</span><h2>${t('加入朋友','JOIN A FRIEND')}</h2></div><p>${t('已经有房间了？输入朋友发来的号码。','Already have a room? Enter your friend’s code.')}</p><form id="join-form"><label for="join-code">${t('8 位房间号','8-character room code')}</label><div class="join-row"><input id="join-code" required maxlength="8" minlength="8" pattern="[A-Za-z2-9]{8}" autocomplete="off" spellcheck="false" placeholder="XXXXXXXX" value="${e(invitation)}"><button class="secondary" type="submit">${t('加入 ↗','JOIN ↗')}</button></div></form><div class="lobby-stamp" aria-hidden="true"><strong>2<span>+1</span></strong><span>HUMANS + AI</span></div><p class="fine">${t('各用一个账号。手机、电脑都能玩。','Use separate accounts. Play on phone or desktop.')}</p></section></div>${rules()}</section>`;
    root.querySelectorAll('[data-role]').forEach(b => b.onclick = () => { chosenRole = b.dataset.role; lobby(); });
    document.getElementById('create').onclick = () => run(async () => setRoom((await api('/api/rooms', { role: chosenRole })).room));
    document.getElementById('join-form').onsubmit = ev => { ev.preventDefault(); const code = document.getElementById('join-code').value.trim().toUpperCase(); run(async () => setRoom((await api('/api/rooms/' + code + '/join', {})).room)); };
  }
  const wave = pending => `<div class="wave ${pending ? 'pending' : ''}" aria-hidden="true">${'<i></i>'.repeat(23)}</div>`;
  function channels(round, pending = false) { return `<div class="channels">${['A', 'B'].map(seat => `<article class="channel" aria-label="${t('匿名席位','Anonymous seat')} ${seat}"><div class="channel-head"><span class="channel-name">${seat}</span><span class="meta">CHANNEL ${seat}</span></div>${round ? `<p class="speech">${e(round[seat])}</p>` : `${wave(pending)}<p class="empty-speech">${t('等待回答','Waiting for an answer')}</p>`}</article>`).join('')}</div>`; }
  function history() { return room.rounds.length ? `<details class="history" ${room.status === 'finished' ? 'open' : ''}><summary>${t('回看对话','Earlier rounds')} (${room.rounds.length})</summary>${room.rounds.map(r => `<section class="history-item"><h4>${String(r.number).padStart(2, '0')} / ${e(r.question)}</h4><div class="history-pair"><div><b>A</b>${e(r.A)}</div><div><b>B</b>${e(r.B)}</div></div></section>`).join('')}</details>` : ''; }
  function gameplay() {
    const r = room, judge = r.role === 'judge', n = r.current?.number || Math.min(r.rounds.length + 1, 6), last = r.rounds.at(-1);
    let content = '', controls = '', title = r.current?.question || last?.question || (judge ? t('轮到你提问。','Your question.') : t('等对方提问。','Waiting for a question.'));
    if (r.status === 'waiting') {
      content = `<div class="waiting"><p class="eyebrow">WAITING / 01 OF 02</p><h2>${t('等朋友加入。','Waiting for your friend.')}</h2><p>${t('把下面的房间号发给朋友，人齐就开始。','Share this room code. The game starts when your friend joins.')}</p><div class="large-code">${e(r.code)}</div><button id="invite" class="primary">${t('复制邀请链接','Copy invitation link')}</button><p class="fine">${t('请使用不同账号加入。房间保留 30 分钟。','Join with different accounts. The room lasts for 30 minutes.')}</p></div>`;
    } else if (r.status === 'cancelled') {
      content = `<div class="result"><p class="eyebrow">GAME ENDED</p><h2>${t('本局已结束','This game has ended')}</h2><p>${r.error ? e(message(r.error)) : t('一位玩家离开了房间。','A player left the room.')}</p><button id="back" class="primary">${t('返回大厅','Return to lobby')}</button></div>`;
    } else {
      if (r.status === 'finished') {
        const won = r.result.winner === 'humans';
        content += `<section class="result"><p class="eyebrow">${won ? 'YOU WIN' : 'AI WINS'}</p><h2>${won ? t('找对了，你们赢了。','You found them. You both win.') : r.result.vote ? t('选中了 AI。','That was the AI.') : t('超时了，AI 赢了。','Time’s up. The AI wins.')}</h2><div class="result-identities"><span>${e(r.result.humanSeat)} / ${t('真人','Human')}</span><span>${e(r.result.aiSeat)} / DeepSeek AI</span></div><p>${t('从第 4 轮开始，AI 的回答就是自己写的了。','From round 4, the AI wrote its own answers.')}</p><button id="back" class="primary">${t('再开一局','Start another game')}</button></section>`;
      }
      content += `<section class="question"><span class="meta">${t('问题','QUESTION')} ${String(r.current?.number || last?.number || 1).padStart(2, '0')} / 06</span><h2>${e(title)}</h2></section>`;
      content += channels(r.current ? null : last, ['answering', 'generating', 'releasing'].includes(r.status));
      if (r.status === 'question' && judge) controls = `<form id="question-form"><label for="question-text">${t('这一轮问什么？','What’s your question?')} <span class="meta">${n} / 6</span></label><textarea id="question-text" required maxlength="140" placeholder="${e(questions()[n - 1])}">${e(drafts['q' + n] || '')}</textarea><div class="control-bottom"><button type="button" id="suggest" class="link-button">${t('试试这个问题','Use this question')}</button><button class="primary" type="submit">${t('发送问题 ↗','ASK ↗')}</button></div></form>`;
      else if (r.status === 'question') controls = `<p>${t('等对方提问。','Waiting for the next question.')}</p>`;
      else if (r.status === 'answering' && !judge) controls = `<form id="answer-form"><label for="answer-text">${t('你的回答','Your answer')} · <span data-timer></span></label><textarea id="answer-text" required maxlength="140" placeholder="${t('随便聊聊，不用想太久。','No need to overthink it.')}">${e(drafts['a' + n] || '')}</textarea><div class="control-bottom"><span class="fine">${t('最多 140 个字符','Up to 140 characters')}</span><button class="primary" type="submit">${t('发送回答 ↗','SEND ↗')}</button></div></form>`;
      else if (['answering', 'generating', 'releasing'].includes(r.status)) controls = `<p>${t('等两边答完，一起公布。','Both answers will appear when they’re ready.')}</p>`;
      else if (r.status === 'ai_error') controls = `<p class="error-text">${e(message(r.error))}</p>${!judge ? `<button class="secondary" id="retry">${t('重试本轮','Retry this round')}</button>` : `<p>${t('等对方重试，判断倒计时还没开始。','Waiting for a retry. Your decision timer hasn’t started.')}</p>`}`;
      else if (r.status === 'deciding') controls = `<p class="eyebrow">MAKE YOUR CHOICE</p><h2>${judge ? t('选出真人。','PICK THE HUMAN.') : t('等对方做选择。','Waiting for the judge’s choice.')}</h2><div class="timer mobile-timer" data-timer></div>${judge ? `<div class="vote-buttons"><button class="vote-button" data-vote="A">${t('A 是真人','A is human')}</button><button class="vote-button" data-vote="B">${t('B 是真人','B is human')}</button></div>` : ''}`;
    }
    root.innerHTML = `<section class="game-screen"><div class="room-top"><div class="room-actions"><span class="meta">ROOM</span><span class="room-code">${e(r.code)}</span><button class="text-button" id="copy-code">${t('复制','Copy')}</button></div><div class="room-actions"><div class="progress" aria-label="${r.rounds.length} / 6">${Array.from({ length: 6 }, (_, i) => `<span class="${i < r.rounds.length ? 'done' : i === r.rounds.length ? 'current' : ''}">${String(i + 1).padStart(2, '0')}</span>`).join('')}</div><button class="text-button" id="leave">${t('离开房间','Leave room')}</button></div></div><div class="room-layout"><div class="room-main">${content}<section class="control-area" aria-live="polite">${controls}</section>${history()}</div><aside class="sidebar"><p class="eyebrow">YOUR ROLE</p><h3>${judge ? t('判断者','JUDGE') : t('发言者','SPEAKER')}</h3><p>${judge ? t('你来提问。<br>六轮后，选出你的朋友。','You ask the questions.<br>Find your friend after six rounds.') : t('照平时的样子回答。<br>让朋友认出你。','Answer as yourself.<br>Help your friend recognize you.')}</p><hr><span class="meta">${t('已完成','ROUNDS PLAYED')}</span><div class="timer">${String(r.rounds.length).padStart(2, '0')}<span class="meta"> / 06</span></div><p>${t('01—03 / AI 复读<br>04—06 / AI 自己回答<br>00:20 / 选出真人','01—03 / AI copies<br>04—06 / AI answers<br>00:20 / Pick the human')}</p><hr><p>${t('A、B 不会换位。<br>两边的回答同时出现。','A and B never switch.<br>Both answers appear together.')}</p></aside></div></section>`;
    document.getElementById('leave').onclick = () => run(async () => { if (!['finished', 'cancelled'].includes(room.status) && !confirm(t('离开会结束本局，确定离开吗？','Leaving will end this game. Leave?'))) return; await api('/api/rooms/' + room.code + '/leave', {}); clearRoom(); });
    document.getElementById('copy-code').onclick = () => copy(r.code);
    const inviteButton = document.getElementById('invite'); if (inviteButton) inviteButton.onclick = () => { const url = new URL(location.href); url.search = ''; url.searchParams.set('room', r.code); url.searchParams.set('lang', lang); copy(url.href); };
    const back = document.getElementById('back'); if (back) back.onclick = clearRoom;
    const q = document.getElementById('question-form'); if (q) { const input = document.getElementById('question-text'); input.oninput = () => drafts['q' + n] = input.value; document.getElementById('suggest').onclick = () => { input.value = questions()[n - 1]; drafts['q' + n] = input.value; }; q.onsubmit = ev => { ev.preventDefault(); action('question', { text: input.value, round: n }); }; }
    const a = document.getElementById('answer-form'); if (a) { const input = document.getElementById('answer-text'); input.oninput = () => drafts['a' + n] = input.value; a.onsubmit = ev => { ev.preventDefault(); action('answer', { text: input.value, round: n }); }; }
    const retry = document.getElementById('retry'); if (retry) retry.onclick = () => action('retry', { round: n });
    root.querySelectorAll('[data-vote]').forEach(b => b.onclick = () => action('vote', { seat: b.dataset.vote }));
    tick();
  }
  async function copy(value) { try { await navigator.clipboard.writeText(value); notice(t('已复制','Copied')); } catch { notice(value); } }
  function render() { header(); if (!user) auth(); else if (!room) lobby(); else gameplay(); const nextView = !user ? 'auth' : room ? 'room:' + room.code : 'lobby'; if (nextView !== currentView) { currentView = nextView; window.scrollTo({ top: 0, behavior: 'instant' }); } }
  function clearRoom() { room = null; signature = ''; save('echo-room', null); const url = new URL(location.href); url.searchParams.delete('room'); historyReplace(url); render(); }
  function historyReplace(url) { window.history.replaceState(null, '', url); }
  function setRoom(value) { room = value; clockOffset = value.serverNow - Date.now(); save('echo-room', value.code); const next = JSON.stringify({ ...value, serverNow: 0 }); if (signature !== next) { signature = next; render(); } }
  async function run(fn) { if (busy) return; busy = true; root.querySelectorAll('button[type=submit],#create,#retry,[data-vote]').forEach(b => b.disabled = true); try { await fn(); } catch (err) { notice(message(err.message)); if (err.status === 401 && user) { token = null; user = null; room = null; save('echo-token', null); render(); } } finally { busy = false; root.querySelectorAll('button[type=submit],#create,#retry,[data-vote]').forEach(b => b.disabled = false); } }
  const action = (name, data) => run(async () => { const code = room.code; const result = await api('/api/rooms/' + code + '/' + name, data); if (room?.code === code) setRoom(result.room); });
  async function poll() {
    if (!room || polling || document.hidden || ['finished', 'cancelled'].includes(room.status)) return;
    polling = true; const code = room.code;
    try { const result = await api('/api/rooms/' + code); if (room?.code === code) setRoom(result.room); if (connectionLost) notice(t('已重新连接','Reconnected')); connectionLost = false; }
    catch (error) { if (!connectionLost) notice(message(error.message)); connectionLost = true; if ([401, 403, 404].includes(error.status)) { if (error.status === 401) { token = null; user = null; save('echo-token', null); } clearRoom(); } }
    finally { polling = false; }
  }
  function tick() { if (!room) return; const deadline = room.status === 'deciding' ? room.decisionDeadline : room.current?.answerDeadline; if (!deadline) return; const remaining = Math.max(0, Math.ceil((deadline - Date.now() - clockOffset) / 1000)); root.querySelectorAll('[data-timer]').forEach(el => { el.textContent = remaining + 's'; el.classList.toggle('urgent', remaining <= 5); }); }
  document.getElementById('language').onclick = () => { lang = lang === 'zh' ? 'en' : 'zh'; save('echo-lang', lang); render(); };
  document.getElementById('logout').onclick = () => run(async () => { if (room && !['finished', 'cancelled'].includes(room.status)) { if (!confirm(t('退出会结束本局，确定吗？','Signing out ends this game. Continue?'))) return; await api('/api/rooms/' + room.code + '/leave', {}); } await api('/api/auth/logout', {}); token = null; user = null; room = null; signature = ''; save('echo-token', null); save('echo-room', null); render(); });
  async function init() {
    if (token) { try { user = (await api('/api/me')).user; const code = saved('echo-room'); if (code) { try { setRoom((await api('/api/rooms/' + code)).room); } catch { save('echo-room', null); } } } catch (error) { if (error.status === 401) { token = null; save('echo-token', null); } else notice(message(error.message)); } }
    render(); setInterval(poll, 900); setInterval(tick, 200); document.addEventListener('visibilitychange', () => { if (!document.hidden) poll(); });
    if (document.modelContext?.registerTool) { try { await document.modelContext.registerTool({ name: 'read_echo_room', description: 'Read the visible game phase and anonymous conversation for the signed-in player. Does not reveal hidden identities before the result.', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true, untrustedContentHint: true }, execute: async input => { if (input && Object.keys(input).length) throw new Error('No arguments allowed'); if (room) await poll(); return room ? { code: room.code, role: room.role, status: room.status, rounds: room.rounds, result: room.result || null } : { status: user ? 'lobby' : 'signed_out' }; } }); } catch {} }
  }
  init();
})();
