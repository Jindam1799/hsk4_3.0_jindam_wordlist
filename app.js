/*! HSK 4급 진담 짝꿍어휘 단어장 · © 2026 진담중국어(진심을 담은 중국어). All rights reserved. */
(() => {
  "use strict";

  const SECTION_SIZE = 50;
  const AGAIN_GAP = 4; // '다시' 누른 단어는 4장 뒤에 다시 나옴
  const pad = (n) => String(n).padStart(4, "0");
  const CIRCLED = ["①", "②", "③"];

  // ---------- 저장 (localStorage가 막혀 있어도 앱은 동작) ----------
  const store = {
    get(key, fallback) {
      try { const v = localStorage.getItem("hsk4:" + key); return v == null ? fallback : JSON.parse(v); }
      catch { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem("hsk4:" + key, JSON.stringify(value)); } catch { /* 무시 */ }
    },
  };

  const sections = [];
  for (let i = 0; i < WORDS.length; i += SECTION_SIZE) sections.push(WORDS.slice(i, i + SECTION_SIZE));
  const clampSection = (i) => Math.max(0, Math.min(i, sections.length - 1));
  const sectionLabel = (sec) => `${sec[0].no} – ${sec[sec.length - 1].no}`; // 예: 1 – 50

  const state = {
    section: clampSection(store.get("section", 0)),
    dir: store.get("dir", "zh"),               // zh: 한자 보고 뜻 떠올리기 / ko: 뜻 보고 중국어 말하기
    rounds: store.get("rounds", {}),           // { 단어번호: [bool, bool, bool] } 체크박스 3개
    status: store.get("status", {}),           // { 단어번호: "k"(알아요) | "a"(다시) } 마지막 결과
    log: store.get("log", {}),                 // { "YYYY-MM-DD": { seen, known } } 날짜별 공부량
    session: store.get("cardSession", null),   // 지금 넘기고 있는 카드 묶음
  };

  const $ = (sel) => document.querySelector(sel);
  const stageEl = $("#cardStage");

  // ---------- 유틸 ----------
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fold = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, "").toLowerCase();
  const highlight = (text, word) => esc(text).split(esc(word)).join(`<span class="hl">${esc(word)}</span>`);
  const roundsOf = (no) => state.rounds[no] || [false, false, false];
  const wordOf = (no) => WORDS[no - 1];
  const shuffle = (arr) => { // 순서 섞기 (Fisher–Yates)
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };
  // 🔄 이모지는 색을 바꿀 수 없어서 같은 모양의 아이콘을 직접 그림 (글자색을 따라감)
  const AGAIN_ICON = '<svg class="ic-again" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8 8 0 0 0-14.3-4.9"/><path d="M5.2 2.8v3.6h3.6"/><path d="M4 13a8 8 0 0 0 14.3 4.9"/><path d="M18.8 21.2v-3.6h-3.6"/></svg>';
  const todayKey = () => new Date().toLocaleDateString("sv-SE"); // YYYY-MM-DD (기기 시간 기준)

  // ---------- 발음: 여자 목소리 Tingting ----------
  // 1순위 Tingting(婷婷) — 아이폰·아이패드·맥(사파리·크롬 모두)
  // 2순위 구글 기본 중국어 음성 "Google 普通话（中国大陆）"(여성) — PC 크롬
  // 3순위 다른 여성 음성(Huihui·Xiaoxiao 등) / 안드로이드는 기기 기본 중국어 음성(구글 TTS 기본값이 여성)
  // 남성 음성(Li-mu, Kangkang, Yunxi 등)은 고르지 않음
  const isAndroid = /Android/i.test(navigator.userAgent);
  const TINGTING = /tingting|ting-ting|婷婷/i;
  const FEMALE = /meijia|sin-ji|xiaoxiao|xiaoyi|xiaohan|xiaomo|huihui|yaoyao|female|女/i;
  const MALE = /li-?mu|kangkang|yunxi|yunyang|yunjian|yunze|\bmale\b|男/i;
  let zhVoice = null;
  function pickVoice() {
    if (!("speechSynthesis" in window)) return null;
    const zh = speechSynthesis.getVoices().filter((v) => /^(zh|cmn)[-_](CN|Hans)/i.test(v.lang) || TINGTING.test(v.name));
    const tingting = zh.filter((v) => TINGTING.test(v.name));
    zhVoice =
      tingting.find((v) => /enhanced|premium|향상|高/i.test(v.name)) || tingting[0] ||
      zh.find((v) => /^google/i.test(v.name)) ||
      zh.find((v) => FEMALE.test(v.name) && !MALE.test(v.name)) ||
      (isAndroid ? null : zh.find((v) => !MALE.test(v.name))) ||
      null; // null이면 lang="zh-CN"만 지정해 기기 기본 중국어 음성 사용
    const label = document.getElementById("voiceName");
    if (label) label.textContent = zhVoice ? zhVoice.name : "기기 기본 중국어 음성";
    return zhVoice;
  }
  if ("speechSynthesis" in window) {
    pickVoice();
    speechSynthesis.addEventListener?.("voiceschanged", pickVoice);
  }
  // reveal: 재생하는 동안 답을 보여 줄 곳(카드 앞면 또는 짝꿍어휘 한 줄). 재생이 끝나면 다시 숨김
  let playing = null;
  function stopPlaying() {
    if (!playing) return;
    clearTimeout(playing.timer);
    playing.btn?.classList.remove("playing");
    playing.reveal?.classList.remove("say-show");
    playing = null;
  }
  function speak(text, btn, reveal) {
    stopPlaying();
    if (!("speechSynthesis" in window)) return;
    pickVoice(); // 음성 목록이 늦게 들어오는 브라우저 대비: 말할 때마다 다시 확인
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = zhVoice ? zhVoice.lang : "zh-CN";
    if (zhVoice) u.voice = zhVoice;
    u.rate = 0.85;
    const me = { btn, reveal };
    playing = me;
    btn?.classList.add("playing");
    reveal?.classList.add("say-show");
    const done = () => { if (playing === me) stopPlaying(); };
    u.onend = u.onerror = done;
    // 일부 휴대폰은 재생 끝 신호가 안 오므로, 글자 수로 재생 시간을 어림해 넉넉히 기다린 뒤 숨김
    me.timer = setTimeout(done, 1500 + [...text].length * 450);
    speechSynthesis.speak(u);
  }
  const SPEAKER = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9v6h4l5 4V5L7 9H3zm13.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z"/></svg>';

  // ---------- 기록 ----------
  function saveSession() { store.set("cardSession", state.session); }
  function addLog(known) {
    const k = todayKey();
    const d = state.log[k] || { seen: 0, known: 0 };
    d.seen += 1;
    if (known) d.known += 1;
    state.log[k] = d;
    store.set("log", state.log);
  }
  function fillRound(no) { // ⭕ 알아요: 비어 있는 첫 체크박스를 채움
    const r = roundsOf(no).slice();
    const i = r.indexOf(false);
    if (i >= 0) r[i] = true;
    state.rounds[no] = r;
    store.set("rounds", state.rounds);
  }
  function setStatus(no, s) {
    state.status[no] = s;
    store.set("status", state.status);
  }
  const weakWords = () => WORDS.filter((w) => state.status[w.no] === "a").map((w) => w.no);
  function streakDays() {
    let n = 0;
    const d = new Date();
    if (!state.log[todayKey()]) d.setDate(d.getDate() - 1); // 오늘 아직 안 했으면 어제부터 셈
    for (;;) {
      const k = d.toLocaleDateString("sv-SE");
      if (!state.log[k]?.seen) break;
      n += 1;
      d.setDate(d.getDate() - 1);
    }
    return n;
  }

  // ---------- 카드 묶음(세션) ----------
  // queue: 넘길 단어 번호 목록 / pos: 지금 카드 위치 / known·again: 이번 묶음에서 누른 결과
  function sectionSession(i, startNo) {
    const sec = sections[i];
    const queue = sec.map((w) => w.no);
    return { key: "s" + i, section: i, title: `구간 ${sectionLabel(sec)}`, queue, pos: startNo ? Math.max(0, queue.indexOf(startNo)) : 0, known: [], again: [] };
  }
  function listSession(key, title, nos) {
    return { key, section: state.section, title, queue: nos, pos: 0, known: [], again: [] };
  }
  const cur = () => wordOf(state.session.queue[state.session.pos]);
  const isDone = () => state.session.pos >= state.session.queue.length;

  // ---------- 카드 그리기 ----------
  let flipped = false;

  const boxes = (no) => `
    <span class="boxes" aria-label="공부한 횟수">
      ${roundsOf(no).map((on, i) => `<button class="box${on ? " on" : ""}" data-box="${i}" aria-pressed="${on}" aria-label="${i + 1}번째 공부"></button>`).join("")}
    </span>`;
  const speakBtn = (text, cls = "") => `<button class="say ${cls}" data-say="${esc(text)}" aria-label="발음 듣기">${SPEAKER}</button>`;
  const lenCls = (s) => `len-${Math.min([...s].length, 5)}`;

  function frontHTML(w) {
    const zhFirst = state.dir === "zh";
    const q = zhFirst
      ? `<div class="q q-zh ${lenCls(w.word)}" lang="zh-CN">${esc(w.word)}</div>`
      : `<div class="q q-ko">${esc(w.meaning)}</div>`;
    const a = zhFirst
      ? `<div class="a"><div class="a-py">${esc(w.pinyin)}</div><div class="a-ko">${esc(w.meaning)}</div></div>`
      : `<div class="a"><div class="a-zh" lang="zh-CN">${esc(w.word)}</div><div class="a-py">${esc(w.pinyin)}</div></div>`;
    return `
      <section class="face front">
        <div class="face-top"><span class="no">${pad(w.no)}</span>${boxes(w.no)}${speakBtn(w.word)}</div>
        <div class="face-main hold" data-hold="front">${q}${a}</div>
        <p class="face-hint">꾹 누르면 ${zhFirst ? "뜻·병음" : "중국어"} · 톡 치면 짝꿍어휘</p>
      </section>`;
  }

  function backHTML(w) {
    const zhFirst = state.dir === "zh";
    const rows = w.pairs.map((p, i) => {
      const q = zhFirst ? `<div class="pq pq-zh" lang="zh-CN">${highlight(p[0], w.word)}</div>` : `<div class="pq pq-ko">${esc(p[2])}</div>`;
      const a = zhFirst
        ? `<div class="a"><span class="a-py">${esc(p[1])}</span><span class="a-ko">${esc(p[2])}</span></div>`
        : `<div class="a"><span class="a-zh" lang="zh-CN">${highlight(p[0], w.word)}</span><span class="a-py">${esc(p[1])}</span></div>`;
      return `
        <li class="prow hold" data-hold="p${i}">
          <span class="n">${CIRCLED[i]}</span>
          <div class="pbody">${q}${a}</div>
          ${speakBtn(p[0], "sm")}
        </li>`;
    }).join("");
    return `
      <section class="face back">
        <div class="face-top">
          <span class="no">${pad(w.no)}</span>
          <span class="back-title">${zhFirst ? `<b lang="zh-CN">${esc(w.word)}</b> 짝꿍어휘` : `<b>${esc(w.meaning.split(/[;,]/)[0])}</b> 짝꿍어휘`}</span>
        </div>
        <ol class="prows">${rows}</ol>
        <p class="face-hint">한 줄씩 꾹 눌러 확인 · 톡 치면 앞면</p>
      </section>`;
  }

  function doneHTML() {
    const s = state.session;
    const retry = [...new Set(s.again)].filter((no) => state.status[no] === "a");
    const nextSec = s.key.startsWith("s") && s.section < sections.length - 1;
    return `
      <div class="done">
        <div class="done-badge">🎉</div>
        <h2>${esc(s.title)} 끝!</h2>
        <p class="done-sum"><span>⭕ 알아요 <b>${s.known.length}</b></span><span>❌ 몰라요 <b>${s.again.length}</b></span></p>
        <div class="done-actions">
          ${retry.length ? `<button class="cta-sm" data-act="retry">${AGAIN_ICON} 다시 단어만 한 번 더 (${retry.length})</button>` : ""}
          ${nextSec ? `<button class="cta-sm${retry.length ? " ghost" : ""}" data-act="next">다음 구간 ${sectionLabel(sections[s.section + 1])} →</button>` : ""}
          <button class="ghost" data-act="restart">이 묶음 처음부터 다시</button>
        </div>
      </div>`;
  }

  // 카드 높이에 맞춰 글자 크기 배율(--k)을 정하고, 넘치면 조금씩 줄임
  function fitCard() {
    const fc = stageEl.querySelector(".fc");
    if (!fc) return;
    let k = Math.max(0.78, Math.min(1.3, stageEl.clientHeight / 430));
    const over = () => [...fc.querySelectorAll(".face")].some((f) => f.scrollHeight > f.clientHeight + 1);
    fc.style.setProperty("--k", k.toFixed(2));
    for (let i = 0; i < 14 && over() && k > 0.6; i++) {
      k -= 0.04;
      fc.style.setProperty("--k", k.toFixed(2));
    }
  }

  function renderCard() {
    const s = state.session;
    $("#cardBandTitle").textContent = s.title;
    document.querySelectorAll("#dirSeg button").forEach((b) => b.classList.toggle("on", b.dataset.dir === state.dir));
    if (isDone()) {
      stageEl.innerHTML = doneHTML();
    } else {
      const w = cur();
      stageEl.innerHTML = `<div class="fc">
        <div class="fc-inner${flipped ? " flipped" : ""}">${frontHTML(w)}${backHTML(w)}</div>
        <div class="stamp know" aria-hidden="true">⭕ 알아요</div>
        <div class="stamp again" aria-hidden="true">❌ 몰라요</div>
      </div>`;
      $("#judge").hidden = false;
      fitCard();
    }
    $("#undoBtn").disabled = !(s.hist && s.hist.length);
    renderFoot();
    maybeCoach();
  }

  function renderFoot() {
    const s = state.session;
    const n = s.queue.length, at = Math.min(s.pos + 1, n);
    $("#cardFoot").innerHTML = `
      <div class="label"><span><b>${at}</b> / ${n}</span><span>⭕ <b>${s.known.length}</b> · ❌ <b>${s.again.length}</b></span></div>
      <div class="track"><i style="width:${(Math.min(s.pos, n) / n) * 100}%"></i></div>`;
  }

  function toast(text) {
    const t = document.createElement("div");
    t.className = "toast";
    t.textContent = text;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 900);
  }

  // 처음 카드 화면에 들어왔을 때 사용법 안내 (한 번만)
  function maybeCoach() {
    if (store.get("coachSeen", false) || isDone() || stageEl.querySelector(".coach")) return;
    stageEl.insertAdjacentHTML("beforeend", `
      <div class="coach">
        <p><b>👆 꾹</b> 누르고 있으면 → 뜻·병음<br><small>손을 떼면 다시 사라져요</small></p>
        <p><b>👆 톡</b> 치면 → 뒤집어서 짝꿍어휘</p>
        <p><b>👉 오른쪽으로 밀면</b> → ⭕ 알아요</p>
        <p><b>👈 왼쪽으로 밀면</b> → ❌ 몰라요<br><small>4장 뒤에 다시 나와요</small></p>
        <button class="cta-sm" data-act="coach">알겠어요!</button>
      </div>`);
  }

  // ---------- 넘기기 애니메이션 ----------
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let busy = false;
  function slide(dir, apply) { // dir 1: 왼쪽으로 나감(다음) / -1: 오른쪽으로 나감(이전)
    stopPlaying();
    const card = stageEl.querySelector(".fc");
    if (reduceMotion || !card) { apply(); renderCard(); return; }
    busy = true;
    card.style.transition = "transform .16s ease-in, opacity .16s ease-in";
    card.style.transform = `translateX(${-dir * 110}%) rotate(${-dir * 6}deg)`;
    card.style.opacity = "0";
    setTimeout(() => {
      apply();
      renderCard();
      const inc = stageEl.querySelector(".fc") || stageEl.firstElementChild;
      inc.style.transition = "none";
      inc.style.transform = `translateX(${dir * 30}%)`;
      inc.style.opacity = "0";
      requestAnimationFrame(() => requestAnimationFrame(() => {
        inc.style.transition = "transform .2s ease-out, opacity .2s ease-out";
        inc.style.transform = "";
        inc.style.opacity = "";
        setTimeout(() => { busy = false; }, 200);
      }));
    }, 160);
  }
  function bounce(el) {
    el.style.transition = "transform .2s ease-out";
    el.style.transform = "";
  }

  // 오른쪽으로 밀기 = ⭕ 알아요 / 왼쪽으로 밀기 = ❌ 몰라요
  function judge(known) {
    if (busy || isDone()) return;
    const s = state.session, no = s.queue[s.pos];
    s.hist = s.hist || [];
    const h = { known, no, pos: s.pos, rounds: state.rounds[no] ? state.rounds[no].slice() : null, status: state.status[no] ?? null, day: todayKey() };
    if (known) {
      fillRound(no);
      setStatus(no, "k");
      s.known.push(no);
      const filled = roundsOf(no).filter(Boolean).length;
      toast(filled === 3 ? "⭕ 3번 공부 완료!" : `⭕ ${filled}번째 체크`);
    } else {
      setStatus(no, "a");
      s.again.push(no);
      h.insertAt = Math.min(s.pos + 1 + AGAIN_GAP, s.queue.length);
      s.queue.splice(h.insertAt, 0, no); // 4장 뒤에 다시
      toast("❌ 몰라요 · 4장 뒤에 다시");
    }
    addLog(known);
    s.hist.push(h);
    if (s.hist.length > 30) s.hist.shift();
    slide(known ? -1 : 1, () => { s.pos += 1; flipped = false; saveSession(); }); // 민 방향으로 날아감
  }

  // ↩ 되돌리기: 방금 밀었던 카드를 다시 가져오고 체크·기록도 되돌림
  function undo() {
    const s = state.session;
    if (busy || !s.hist || !s.hist.length) return;
    const h = s.hist.pop();
    if (h.rounds) state.rounds[h.no] = h.rounds; else delete state.rounds[h.no];
    if (h.status) state.status[h.no] = h.status; else delete state.status[h.no];
    store.set("rounds", state.rounds);
    store.set("status", state.status);
    const list = h.known ? s.known : s.again;
    const i = list.lastIndexOf(h.no);
    if (i >= 0) list.splice(i, 1);
    if (!h.known && h.insertAt != null) s.queue.splice(h.insertAt, 1);
    const d = state.log[h.day];
    if (d) { d.seen = Math.max(0, d.seen - 1); if (h.known) d.known = Math.max(0, d.known - 1); store.set("log", state.log); }
    toast("↩ 되돌렸어요");
    slide(h.known ? 1 : -1, () => { s.pos = h.pos; flipped = false; saveSession(); });
  }

  function flip() {
    stopPlaying();
    flipped = !flipped;
    stageEl.querySelector(".fc-inner")?.classList.toggle("flipped", flipped);
    stageEl.querySelectorAll(".hold.show").forEach((h) => h.classList.remove("show"));
  }

  // ---------- 터치: 꾹(보기) / 톡(뒤집기) / 밀기(넘기기) ----------
  const HOLD_MS = 160;
  let pt = null;
  stageEl.addEventListener("contextmenu", (e) => e.preventDefault());
  const NEAR = 12;
  function nearButton(x, y) { // 지금 보이는 면의 버튼(🔊·체크박스) 둘레 12px까지는 버튼 자리로 봄
    const face = stageEl.querySelector(flipped ? ".back" : ".front");
    return [...(face?.querySelectorAll("button") || [])].some((b) => {
      const r = b.getBoundingClientRect();
      return x > r.left - NEAR && x < r.right + NEAR && y > r.top - NEAR && y < r.bottom + NEAR;
    });
  }
  let lastButtonAt = 0;
  stageEl.addEventListener("pointerdown", (e) => {
    const fc = e.target.closest(".fc");
    if (e.target.closest("button") || (fc && nearButton(e.clientX, e.clientY))) { lastButtonAt = Date.now(); return; }
    if (!fc || busy || (e.pointerType === "mouse" && e.button !== 0)) return;
    const target = flipped ? e.target.closest(".back .hold") : fc.querySelector(".front .hold");
    pt = { id: e.pointerId, x: e.clientX, y: e.clientY, t: Date.now(), fc, target, held: false, drag: false, dx: 0 };
    try { fc.setPointerCapture(e.pointerId); } catch { /* 무시 */ }
    pt.timer = setTimeout(() => {
      if (pt && !pt.drag && pt.target) { pt.held = true; pt.target.classList.add("show"); }
    }, HOLD_MS);
  });
  stageEl.addEventListener("pointermove", (e) => {
    if (!pt || e.pointerId !== pt.id) return;
    const dx = e.clientX - pt.x, dy = e.clientY - pt.y;
    if (!pt.drag && Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy)) {
      pt.drag = true;
      clearTimeout(pt.timer);
      pt.target?.classList.remove("show");
    }
    if (pt.drag) {
      pt.dx = dx;
      pt.fc.style.transition = "none";
      pt.fc.style.transform = `translateX(${dx}px) rotate(${dx / 30}deg)`;
      const o = Math.min(1, Math.abs(dx) / 90);
      pt.fc.querySelector(".stamp.know").style.opacity = dx > 0 ? o : 0;
      pt.fc.querySelector(".stamp.again").style.opacity = dx < 0 ? o : 0;
    }
  });
  function endPointer(e, cancelled) {
    if (!pt || (e && e.pointerId !== pt.id)) return;
    const p = pt;
    pt = null;
    clearTimeout(p.timer);
    p.target?.classList.remove("show");
    if (cancelled) { bounce(p.fc); return; }
    if (p.drag) {
      const fast = Math.abs(p.dx) > 30 && Date.now() - p.t < 250;
      if (Math.abs(p.dx) > 70 || fast) judge(p.dx > 0);
      else {
        bounce(p.fc);
        p.fc.querySelectorAll(".stamp").forEach((st) => { st.style.opacity = 0; });
      }
      return;
    }
    if (!p.held && Date.now() - p.t < 400 && Date.now() - lastButtonAt > 500) flip(); // 짧게 톡 → 뒤집기 (버튼 누른 직후는 제외)
  }
  stageEl.addEventListener("pointerup", (e) => endPointer(e, false));
  stageEl.addEventListener("pointercancel", (e) => endPointer(e, true));

  // 버튼: 발음 / 체크박스 / 끝 화면 / 안내
  stageEl.addEventListener("click", (e) => {
    const say = e.target.closest("[data-say]");
    if (say) {
      lastButtonAt = Date.now();
      const reveal = say.closest(".prow") || stageEl.querySelector(".front .hold");
      speak(say.dataset.say, say, reveal);
      return;
    }
    const box = e.target.closest("[data-box]");
    if (box) {
      const no = cur().no, i = +box.dataset.box;
      const r = roundsOf(no).slice();
      r[i] = !r[i];
      state.rounds[no] = r;
      store.set("rounds", state.rounds);
      box.classList.toggle("on", r[i]);
      box.setAttribute("aria-pressed", r[i]);
      return;
    }
    const act = e.target.closest("[data-act]")?.dataset.act;
    if (!act) return;
    const s = state.session;
    if (act === "coach") { store.set("coachSeen", true); stageEl.querySelector(".coach")?.remove(); }
    if (act === "retry") startSession(listSession("retry", "다시 볼 단어", shuffle([...new Set(s.again)].filter((no) => state.status[no] === "a"))));
    if (act === "next") { state.section = s.section + 1; store.set("section", state.section); startSession(sectionSession(state.section)); }
    if (act === "restart") startSession({ ...s, queue: [...new Set(s.queue)], pos: 0, known: [], again: [], hist: [] });
  });

  $("#undoBtn").addEventListener("click", undo);
  $("#dirSeg").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-dir]");
    if (!b) return;
    state.dir = b.dataset.dir;
    store.set("dir", state.dir);
    flipped = false;
    renderCard();
  });

  function startSession(sess) {
    // 구간 카드를 넘기다가 '다시 볼 단어' 연습으로 가면, 구간 진행 위치를 따로 보관해 두었다가 이어서 함
    const prev = state.session;
    if (prev && prev.key.startsWith("s") && !isDone()) store.set("sectionSession", prev);
    state.session = sess;
    flipped = false;
    saveSession();
    if ($("#cards").hidden) showScreen("cards");
    else renderCard();
  }

  // ---------- 화면 전환 (홈 ↔ 카드) ----------
  function renderHome() {
    let s = state.session;
    if (s && (isDone() || !s.key.startsWith("s"))) { // 다시 볼 단어 연습 뒤에는 보관해 둔 구간 진행을 기준으로
      const saved = store.get("sectionSession", null);
      if (saved && saved.section === state.section && saved.pos < saved.queue.length) s = saved;
    }
    const started = s && (s.pos > 0 || s.known.length || s.again.length) && s.pos < s.queue.length;
    $("#cardsBtn b").textContent = started ? "🃏 이어서 외우기" : "🃏 카드로 외우기";
    $("#continueSub").textContent = s && !s.key.startsWith("s") && s.pos < s.queue.length ? s.title : `구간 ${sectionLabel(sections[state.section])}`;
  }
  function showScreen(name) {
    $("#home").hidden = name !== "home";
    $("#cards").hidden = name !== "cards";
    if (name === "home") renderHome();
    if (name === "cards") {
      renderCard();
      if (history.state?.screen !== "cards") history.pushState({ screen: "cards" }, "");
    }
  }
  window.addEventListener("popstate", () => { closeSheets(); showScreen(history.state?.screen === "cards" ? "cards" : "home"); });
  document.querySelectorAll("[data-home]").forEach((b) => b.addEventListener("click", () => {
    if (history.state?.screen === "cards") history.back();
    else showScreen("home");
  }));
  $("#cardsBtn").addEventListener("click", () => {
    // 이어서 하던 묶음이 지금 구간과 같으면 그대로, 아니면 이 구간을 새로 시작
    const s = state.session;
    const keep = s && !isDone() && (!s.key.startsWith("s") || s.section === state.section);
    if (!keep) {
      const saved = store.get("sectionSession", null);
      state.session = saved && saved.section === state.section && saved.pos < saved.queue.length ? saved : sectionSession(state.section);
      saveSession();
    }
    flipped = false;
    showScreen("cards");
  });

  window.addEventListener("resize", () => { if (!$("#cards").hidden) fitCard(); });

  // ---------- 아래에서 올라오는 창 ----------
  function openSheet(sheet) {
    sheet.hidden = false;
    document.body.classList.add("sheet-open");
  }
  function closeSheets() {
    document.querySelectorAll(".sheet").forEach((s) => { s.hidden = true; });
    document.body.classList.remove("sheet-open");
  }
  document.querySelectorAll(".sheet").forEach((sheet) => {
    sheet.addEventListener("click", (e) => {
      if (e.target === sheet || e.target.closest("[data-close]")) closeSheets();
    });
  });

  // 구간 고르기
  let sectionFrom = "home";
  function openSections(from) {
    sectionFrom = from;
    $("#sectionGrid").innerHTML = sections.map((sec, i) => {
      const done = sec.filter((w) => roundsOf(w.no)[0]).length;
      return `
        <button class="sec${i === state.section ? " on" : ""}" data-section="${i}">
          <b>${sectionLabel(sec)}</b>
          <span class="sec-bar"><i style="width:${(done / sec.length) * 100}%"></i></span>
          <small>외운 단어 ${done} / ${sec.length}</small>
        </button>`;
    }).join("");
    openSheet($("#sectionSheet"));
  }
  $("#homeSectionBtn").addEventListener("click", () => openSections("home"));
  $("#cardBandBtn").addEventListener("click", () => openSections("cards"));
  $("#sectionGrid").addEventListener("click", (e) => {
    const b = e.target.closest(".sec");
    if (!b) return;
    closeSheets();
    state.section = +b.dataset.section;
    store.set("section", state.section);
    if (sectionFrom === "cards") startSession(sectionSession(state.section));
    else renderHome();
  });

  $("#guideBtn").addEventListener("click", () => { pickVoice(); openSheet($("#guideSheet")); });

  // 단어 찾기: 0 정확히 일치 / 1 표제어·뜻에 포함 / 2 짝꿍어휘에만 포함
  function search(query) {
    const q = fold(query);
    if (!q) return [];
    const score = (w) => {
      if (fold(w.word) === q || fold(w.pinyin) === q || pad(w.no) === query.trim() || String(w.no) === query.trim()) return 0;
      if ([w.word, w.pinyin, w.meaning].some((t) => fold(t).includes(q))) return 1;
      if (w.pairs.flat().some((t) => fold(t).includes(q))) return 2;
      return -1;
    };
    return WORDS.map((w) => [score(w), w])
      .filter(([sc]) => sc >= 0)
      .sort((a, b) => a[0] - b[0] || a[1].no - b[1].no)
      .slice(0, 80)
      .map(([, w]) => w);
  }
  let searchTimer;
  $("#search").addEventListener("input", (e) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      const query = e.target.value.trim();
      const list = search(query);
      $("#results").innerHTML = !query
        ? `<li class="empty">한자, 병음(성조 없이도 OK), 뜻, 번호로 찾아요.</li>`
        : list.length
          ? list.map((w) => `
              <li><button data-no="${w.no}">
                <span class="r-no">${pad(w.no)}</span>
                <span class="r-zh">${esc(w.word)}</span>
                <span class="r-py">${esc(w.pinyin)}</span>
                <span class="r-ko">${esc(w.meaning)}</span>
              </button></li>`).join("")
          : `<li class="empty">‘${esc(query)}’에 맞는 단어가 없어요.</li>`;
    }, 120);
  });
  $("#searchBtn").addEventListener("click", () => {
    $("#search").value = "";
    $("#search").dispatchEvent(new Event("input"));
    openSheet($("#searchSheet"));
    setTimeout(() => $("#search").focus(), 50);
  });
  $("#results").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-no]");
    if (!b) return;
    const no = +b.dataset.no;
    closeSheets();
    state.section = Math.floor((no - 1) / SECTION_SIZE);
    store.set("section", state.section);
    startSession(sectionSession(state.section, no));
  });

  // ---------- 📍 내 공부 현황 ----------
  function renderStats() {
    const total = WORDS.length;
    const learned = WORDS.filter((w) => roundsOf(w.no)[0]).length;
    const mastered = WORDS.filter((w) => roundsOf(w.no).every(Boolean)).length;
    const weak = weakWords();
    const today = state.log[todayKey()] || { seen: 0, known: 0 };
    const pct = (n) => Math.round((n / total) * 100);
    $("#statsBody").innerHTML = `

      <div class="st-big">
        <div class="st-ring" style="--p:${pct(learned)}"><b>${learned}</b><small>/ ${total}</small></div>
        <div class="st-big-text">
          <p><b>외운 단어</b> <span>⭕ 알아요를 한 번 이상 누른 단어</span></p>
          <p class="st-line"><span>3번 공부 완료</span><b>${mastered}개</b></p>
          <div class="st-bar"><i style="width:${pct(mastered)}%"></i></div>
        </div>
      </div>

      <div class="st-cards">
        <div><small>오늘 넘긴 카드</small><b>${today.seen}</b></div>
        <div><small>오늘 알아요</small><b>${today.known}</b></div>
        <div><small>연속 공부</small><b>${streakDays()}일${streakDays() >= 3 ? " 🔥" : ""}</b></div>
      </div>

      <button class="st-weak" data-act="weak" ${weak.length ? "" : "disabled"}>
        <span>${AGAIN_ICON} 다시 볼 단어 <b>${weak.length}개</b></span>
        <small>${weak.length ? "모아서 연습하기 →" : "아직 없어요"}</small>
      </button>

      <p class="st-map-title">구간 지도 <small>누르면 그 구간 카드를 시작해요</small></p>
      <div class="st-map">
        ${sections.map((sec, i) => {
          const done = sec.filter((w) => roundsOf(w.no)[0]).length;
          const full = sec.every((w) => roundsOf(w.no)[0]);
          // 토마토 짝꿍이 모양: 외운 만큼 아래에서부터 빨갛게 익어 감
          return `<button class="tile${i === state.section ? " on" : ""}${full ? " full" : ""}" data-tile="${i}" style="--f:${(done / sec.length) * 100}%" aria-label="구간 ${sectionLabel(sec)} 외운 단어 ${done}개">
            <span class="t-leaf"></span>
            <span class="t-body"><span class="t-eyes"></span><b>${i + 1}</b><small>${done}/${sec.length}</small></span>
          </button>`;
        }).join("")}
      </div>`;
  }
  document.querySelectorAll("[data-stats]").forEach((b) => b.addEventListener("click", () => { renderStats(); openSheet($("#statsSheet")); }));
  $("#statsBody").addEventListener("click", (e) => {
    const tile = e.target.closest("[data-tile]");
    if (tile) {
      closeSheets();
      state.section = +tile.dataset.tile;
      store.set("section", state.section);
      startSession(sectionSession(state.section));
      return;
    }
    if (e.target.closest('[data-act="weak"]')) {
      const weak = weakWords();
      if (!weak.length) return;
      closeSheets();
      startSession(listSession("weak", `다시 볼 단어 ${weak.length}개`, shuffle(weak).slice(0, 50))); // 랜덤 순서
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeSheets();
    if (e.target.tagName === "INPUT" || document.body.classList.contains("sheet-open") || $("#cards").hidden) return;
    if (e.key === "ArrowRight") judge(true);
    if (e.key === "ArrowLeft") judge(false);
    if (e.key === "Backspace") undo();
    if (e.key === " ") { e.preventDefault(); flip(); }
  });

  // ---------- 시작: 홈(표지). 처음 온 사람에게는 '공부 방법'을 한 번 보여 줌 ----------
  if (state.session && !Array.isArray(state.session.queue)) state.session = null;
  history.replaceState({ screen: "home" }, "");
  showScreen("home");
  if (!store.get("introSeen", false)) {
    store.set("introSeen", true);
    openSheet($("#guideSheet"));
  }
})();
