(() => {
  "use strict";

  const SECTION_SIZE = 50;
  const pad = (n) => String(n).padStart(4, "0");

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

  const state = {
    section: Math.min(store.get("section", 0), sections.length - 1),
    view: store.get("view", "list"),
    mode: store.get("mode", "all"),
    query: "",
    cardIdx: 0,
    rounds: store.get("rounds", {}), // { 단어번호: [bool, bool, bool] }
  };

  const $ = (sel) => document.querySelector(sel);
  const main = $("#main");

  // ---------- 유틸 ----------
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fold = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, "").toLowerCase();
  const highlight = (text, word) => esc(text).split(esc(word)).join(`<span class="hl">${esc(word)}</span>`);
  const roundsOf = (no) => state.rounds[no] || [false, false, false];

  function currentList() {
    if (!state.query) return sections[state.section] || [];
    const q = fold(state.query);
    return WORDS.filter((w) =>
      [w.word, w.pinyin, w.meaning, ...w.pairs.flat()].some((t) => fold(t).includes(q)) ||
      pad(w.no) === state.query.trim()
    );
  }

  // ---------- 발음 (중국어 여성 음성 우선) ----------
  let zhVoice = null;
  function pickVoice() {
    if (!("speechSynthesis" in window)) return;
    const voices = speechSynthesis.getVoices().filter((v) => /^zh[-_](CN|Hans)/i.test(v.lang) || v.lang === "zh");
    zhVoice =
      voices.find((v) => /xiaoxiao|xiaoyi|tingting|ting-ting|meijia|female|女/i.test(v.name)) ||
      voices.find((v) => /google/i.test(v.name)) ||
      voices[0] || null;
  }
  if ("speechSynthesis" in window) {
    pickVoice();
    speechSynthesis.onvoiceschanged = pickVoice;
  }
  function speak(text, btn) {
    if (!("speechSynthesis" in window)) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "zh-CN";
    if (zhVoice) u.voice = zhVoice;
    u.rate = 0.85;
    if (btn) {
      btn.classList.add("playing");
      u.onend = u.onerror = () => btn.classList.remove("playing");
    }
    speechSynthesis.speak(u);
  }

  const SPEAKER = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9v6h4l5 4V5L7 9H3zm13.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z"/></svg>';

  // ---------- 렌더링 ----------
  function wordHTML(w) {
    const r = roundsOf(w.no);
    return `
      <article class="word" data-no="${w.no}">
        <div class="word-head">
          <div class="word-meta">
            <span class="no">${pad(w.no)}</span>
            <div class="rounds" aria-label="회독 체크">
              ${[0, 1, 2].map((i) => `<button class="round${r[i] ? " on" : ""}" data-round="${i}" aria-pressed="${r[i]}" aria-label="${i + 1}회독">${i + 1}</button>`).join("")}
            </div>
          </div>
          <div class="hw">
            <button class="hz zh mask" data-say="${esc(w.word)}" lang="zh-CN">${esc(w.word)}</button>
            <span class="py zh mask">${esc(w.pinyin)}</span>
            <button class="speak" data-say="${esc(w.word)}" aria-label="발음 듣기">${SPEAKER}</button>
          </div>
          <div class="mean ko mask">${esc(w.meaning)}</div>
        </div>
        <ol class="pairs">
          ${w.pairs.map((p, i) => `
            <li class="pair">
              <span class="n">${i + 1}</span>
              <button class="pz zh mask" data-say="${esc(p[0])}" lang="zh-CN">${highlight(p[0], w.word)}</button>
              <span class="pp zh mask">${esc(p[1])}</span>
              <span class="pk ko mask">${esc(p[2])}</span>
            </li>`).join("")}
        </ol>
      </article>`;
  }

  function renderSections() {
    $("#sections").innerHTML = sections.map((sec, i) => {
      const first = sec[0].no, last = sec[sec.length - 1].no;
      const done = sec.every((w) => roundsOf(w.no)[0]);
      const on = !state.query && i === state.section;
      return `<button class="chip${on ? " on" : ""}${done ? " done" : ""}" data-section="${i}">${pad(first)}–${pad(last)}</button>`;
    }).join("");
    const onChip = $("#sections .chip.on");
    if (onChip) onChip.scrollIntoView({ block: "nearest", inline: "center" });
  }

  function renderMain() {
    const list = currentList();
    if (!list.length) {
      main.innerHTML = `<p class="empty">‘${esc(state.query)}’에 맞는 단어가 없어요.</p>`;
      return;
    }
    if (state.view === "card") {
      state.cardIdx = Math.max(0, Math.min(state.cardIdx, list.length - 1));
      main.innerHTML = `<div class="card-stage">${wordHTML(list[state.cardIdx])}
        <p class="card-hint">${state.mode === "all" ? "위의 ‘가리기’를 켜고 먼저 말해 본 뒤 확인해요" : "가려진 부분을 누르면 정답이 보여요"} · 옆으로 밀어 넘기기</p></div>`;
    } else {
      main.innerHTML = (state.query ? `<p class="result-head">검색 결과 ${list.length}개</p>` : "") + list.map(wordHTML).join("");
    }
  }

  function renderProgress() {
    const list = currentList();
    const prev = $("#prevBtn"), next = $("#nextBtn");
    if (state.view === "card") {
      prev.disabled = state.cardIdx <= 0 && (state.query || state.section <= 0);
      next.disabled = state.cardIdx >= list.length - 1 && (state.query || state.section >= sections.length - 1);
    } else {
      prev.disabled = !!state.query || state.section <= 0;
      next.disabled = !!state.query || state.section >= sections.length - 1;
    }
    const counts = [0, 1, 2].map((i) => list.filter((w) => roundsOf(w.no)[i]).length);
    const total = list.length || 1;
    const left = state.view === "card" && list.length
      ? `<b>${state.cardIdx + 1}</b> / ${list.length}`
      : state.query ? "검색 결과" : `구간 <b>${pad(sections[state.section][0].no)}</b>`;
    $("#progress").innerHTML = `
      <div class="label"><span>${left}</span><span>회독 ${counts.join(" · ")} / ${list.length}</span></div>
      <div class="bars">${counts.map((c) => `<div class="bar"><i style="width:${(c / total) * 100}%"></i></div>`).join("")}</div>`;
  }

  function renderToolbar() {
    document.body.className = "mode-" + state.mode;
    document.querySelectorAll("#viewSeg button").forEach((b) => b.classList.toggle("on", b.dataset.view === state.view));
    document.querySelectorAll("#modeSeg button").forEach((b) => b.classList.toggle("on", b.dataset.mode === state.mode));
  }

  function render({ scrollTop = false } = {}) {
    renderToolbar();
    renderSections();
    renderMain();
    renderProgress();
    if (scrollTop) window.scrollTo({ top: 0 });
  }

  // ---------- 이동 ----------
  function goSection(i) {
    state.section = Math.max(0, Math.min(i, sections.length - 1));
    state.query = "";
    $("#search").value = "";
    store.set("section", state.section);
    render({ scrollTop: true });
  }

  function step(dir) {
    if (state.view !== "card") return goSection(state.section + dir);
    const list = currentList();
    const n = state.cardIdx + dir;
    if (n >= 0 && n < list.length) {
      state.cardIdx = n;
      render();
    } else if (!state.query && sections[state.section + dir]) {
      state.section += dir;
      store.set("section", state.section);
      state.cardIdx = dir > 0 ? 0 : sections[state.section].length - 1;
      render();
    }
  }

  // ---------- 이벤트 ----------
  $("#sections").addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    state.cardIdx = 0;
    goSection(+chip.dataset.section);
  });

  $("#viewSeg").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    state.view = b.dataset.view;
    state.cardIdx = 0;
    store.set("view", state.view);
    render({ scrollTop: true });
  });

  $("#modeSeg").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    state.mode = b.dataset.mode;
    store.set("mode", state.mode);
    renderToolbar();
    document.querySelectorAll(".mask.shown").forEach((el) => el.classList.remove("shown"));
  });

  let searchTimer;
  $("#search").addEventListener("input", (e) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      state.query = e.target.value.trim();
      state.cardIdx = 0;
      render({ scrollTop: true });
    }, 150);
  });

  const isHidden = (el) =>
    el.classList.contains("mask") && !el.classList.contains("shown") &&
    ((state.mode === "hide-ko" && el.classList.contains("ko")) || (state.mode === "hide-zh" && el.classList.contains("zh")));

  main.addEventListener("click", (e) => {
    const round = e.target.closest(".round");
    if (round) {
      const no = +round.closest(".word").dataset.no;
      const r = roundsOf(no).slice();
      const i = +round.dataset.round;
      r[i] = !r[i];
      state.rounds[no] = r;
      store.set("rounds", state.rounds);
      round.classList.toggle("on", r[i]);
      round.setAttribute("aria-pressed", r[i]);
      renderSections();
      renderProgress();
      return;
    }
    const mask = e.target.closest(".mask");
    if (mask && isHidden(mask)) {
      mask.classList.add("shown");
      return;
    }
    const sayer = e.target.closest("[data-say]");
    if (sayer) speak(sayer.dataset.say, sayer.closest(".word").querySelector(".speak"));
  });

  $("#prevBtn").addEventListener("click", () => step(-1));
  $("#nextBtn").addEventListener("click", () => step(1));

  // 카드 모드: 좌우로 밀어 넘기기
  let touchX = null, touchY = null;
  main.addEventListener("touchstart", (e) => { touchX = e.touches[0].clientX; touchY = e.touches[0].clientY; }, { passive: true });
  main.addEventListener("touchend", (e) => {
    if (state.view !== "card" || touchX == null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    const dy = e.changedTouches[0].clientY - touchY;
    touchX = null;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) step(dx < 0 ? 1 : -1);
  });

  document.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT") return;
    if (e.key === "ArrowRight") step(1);
    if (e.key === "ArrowLeft") step(-1);
  });

  const info = $("#info");
  $("#infoBtn").addEventListener("click", () => info.showModal());
  info.addEventListener("click", (e) => { if (e.target === info) info.close(); });

  render();
})();
