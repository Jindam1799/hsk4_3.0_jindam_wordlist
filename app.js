(() => {
  "use strict";

  const SECTION_SIZE = 50;
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
  const state = {
    section: clampSection(store.get("section", 0)),
    idx: store.get("idx", 0), // 구간 안에서 몇 번째 단어인지 (마지막으로 본 단어에서 이어서 시작)
    mode: store.get("mode", "all"),
    rounds: store.get("rounds", {}), // { 단어번호: [bool, bool, bool] }
  };
  state.idx = Math.max(0, Math.min(state.idx, sections[state.section].length - 1));

  const $ = (sel) => document.querySelector(sel);
  const stage = $("#stage");

  // ---------- 유틸 ----------
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fold = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, "").toLowerCase();
  const highlight = (text, word) => esc(text).split(esc(word)).join(`<span class="hl">${esc(word)}</span>`);
  const roundsOf = (no) => state.rounds[no] || [false, false, false];
  const currentWord = () => sections[state.section][state.idx];
  const sectionLabel = (sec) => `${pad(sec[0].no)} – ${pad(sec[sec.length - 1].no)}`;

  function saveSpot() {
    store.set("section", state.section);
    store.set("idx", state.idx);
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
        <div class="side">
          <span class="no">${pad(w.no)}</span>
          <div class="rounds" aria-label="공부한 횟수 체크">
            ${[0, 1, 2].map((i) => `<button class="round${r[i] ? " on" : ""}" data-round="${i}" aria-pressed="${r[i]}" aria-label="${i + 1}번째 공부"></button>`).join("")}
          </div>
        </div>
        <div class="body">
          <div class="word-head">
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
                <span class="n">${CIRCLED[i]}</span>
                <button class="pz zh mask" data-say="${esc(p[0])}" lang="zh-CN">${highlight(p[0], w.word)}</button>
                <span class="pp zh mask">${esc(p[1])}</span>
                <span class="pk ko mask">${esc(p[2])}</span>
              </li>`).join("")}
          </ol>
        </div>
      </article>`;
  }

  function renderCard() {
    const hint = state.mode === "all"
      ? "← 밀어서 넘기기 →"
      : "가려진 곳을 누르면 정답 · ← 밀어서 넘기기 →";
    stage.innerHTML = `<div class="card">${wordHTML(currentWord())}</div><p class="hint">${hint}</p>`;
  }

  function renderChrome() {
    const sec = sections[state.section];
    $("#bandTitle").textContent = `구간 ${sectionLabel(sec)}`;
    ["all", "hide-ko", "hide-zh"].forEach((m) => document.body.classList.toggle("mode-" + m, m === state.mode));
    document.querySelectorAll("#modeSeg button").forEach((b) => b.classList.toggle("on", b.dataset.mode === state.mode));
    $("#prevBtn").disabled = state.section === 0 && state.idx === 0;
    $("#nextBtn").disabled = state.section === sections.length - 1 && state.idx === sec.length - 1;
    renderProgress();
  }

  function renderProgress() {
    const sec = sections[state.section];
    const counts = [0, 1, 2].map((i) => sec.filter((w) => roundsOf(w.no)[i]).length);
    $("#progress").innerHTML = `
      <div class="label"><span><b>${state.idx + 1}</b> / ${sec.length}</span><span>${counts.map((c, i) => `${i + 1}회 <b>${c}</b>`).join(" · ")}</span></div>
      <div class="track"><i style="width:${((state.idx + 1) / sec.length) * 100}%"></i></div>`;
  }

  function render() {
    renderChrome();
    renderCard();
  }

  // ---------- 이동 (애니메이션) ----------
  function neighbor(dir) {
    let section = state.section, idx = state.idx + dir;
    if (idx < 0) {
      if (section === 0) return null;
      section -= 1; idx = sections[section].length - 1;
    } else if (idx >= sections[section].length) {
      if (section === sections.length - 1) return null;
      section += 1; idx = 0;
    }
    return { section, idx };
  }

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let busy = false;

  function bounce(card) {
    card.style.transition = "transform .2s ease-out";
    card.style.transform = "";
  }

  function go(dir) {
    if (busy) return;
    const next = neighbor(dir);
    const card = stage.querySelector(".card");
    if (!next) { if (card) bounce(card); return; }

    const apply = () => {
      Object.assign(state, next);
      saveSpot();
      render();
    };
    if (reduceMotion || !card) { apply(); return; }

    busy = true;
    card.style.transition = "transform .16s ease-in, opacity .16s ease-in";
    card.style.transform = `translateX(${-dir * 110}%)`;
    card.style.opacity = "0";
    setTimeout(() => {
      apply();
      const incoming = stage.querySelector(".card");
      incoming.style.transition = "none";
      incoming.style.transform = `translateX(${dir * 35}%)`;
      incoming.style.opacity = "0";
      requestAnimationFrame(() => requestAnimationFrame(() => {
        incoming.style.transition = "transform .2s ease-out, opacity .2s ease-out";
        incoming.style.transform = "";
        incoming.style.opacity = "";
        setTimeout(() => { busy = false; }, 200);
      }));
    }, 160);
  }

  function jumpTo(section, idx) {
    state.section = clampSection(section);
    state.idx = Math.max(0, Math.min(idx, sections[state.section].length - 1));
    saveSpot();
    render();
  }

  // ---------- 손가락으로 밀어 넘기기 ----------
  let drag = null;
  stage.addEventListener("touchstart", (e) => {
    const card = stage.querySelector(".card");
    if (!card || busy || e.touches.length > 1) return;
    drag = { x: e.touches[0].clientX, y: e.touches[0].clientY, dx: 0, horizontal: null, card, t: Date.now() };
  }, { passive: true });

  stage.addEventListener("touchmove", (e) => {
    if (!drag) return;
    const dx = e.touches[0].clientX - drag.x;
    const dy = e.touches[0].clientY - drag.y;
    if (drag.horizontal === null && Math.abs(dx) + Math.abs(dy) > 8) drag.horizontal = Math.abs(dx) > Math.abs(dy);
    if (!drag.horizontal) return;
    e.preventDefault();
    drag.dx = dx;
    // 더 넘길 단어가 없으면 살짝만 끌리게
    const resist = neighbor(dx < 0 ? 1 : -1) ? 1 : 0.25;
    drag.card.style.transition = "none";
    drag.card.style.transform = `translateX(${dx * resist}px) rotate(${(dx * resist) / 40}deg)`;
  }, { passive: false });

  stage.addEventListener("touchend", () => {
    if (!drag) return;
    const { dx, horizontal, card, t } = drag;
    drag = null;
    if (!horizontal) return;
    const fast = Math.abs(dx) > 30 && Date.now() - t < 250;
    if (Math.abs(dx) > 70 || fast) go(dx < 0 ? 1 : -1);
    else bounce(card);
  });
  stage.addEventListener("touchcancel", () => { if (drag) bounce(drag.card); drag = null; });

  // ---------- 카드 안 터치: 체크 / 가린 곳 보기 / 발음 ----------
  const isHidden = (el) =>
    el.classList.contains("mask") && !el.classList.contains("shown") &&
    ((state.mode === "hide-ko" && el.classList.contains("ko")) || (state.mode === "hide-zh" && el.classList.contains("zh")));

  stage.addEventListener("click", (e) => {
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

  $("#prevBtn").addEventListener("click", () => go(-1));
  $("#nextBtn").addEventListener("click", () => go(1));

  $("#modeSeg").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    state.mode = b.dataset.mode;
    store.set("mode", state.mode);
    render();
  });

  // ---------- 아래에서 올라오는 창 (구간 고르기 / 단어 찾기) ----------
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

  $("#sectionBtn").addEventListener("click", () => {
    $("#sectionGrid").innerHTML = sections.map((sec, i) => {
      const done = sec.filter((w) => roundsOf(w.no)[0]).length;
      return `
        <button class="sec${i === state.section ? " on" : ""}" data-section="${i}">
          <b>${sectionLabel(sec)}</b>
          <span class="sec-bar"><i style="width:${(done / sec.length) * 100}%"></i></span>
          <small>1회 체크 ${done} / ${sec.length}</small>
        </button>`;
    }).join("");
    openSheet($("#sectionSheet"));
  });
  $("#sectionGrid").addEventListener("click", (e) => {
    const b = e.target.closest(".sec");
    if (!b) return;
    closeSheets();
    jumpTo(+b.dataset.section, 0);
  });

  // 검색: 0 정확히 일치 / 1 표제어·뜻에 포함 / 2 짝꿍어휘에만 포함
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
    const i = +b.dataset.no - 1;
    closeSheets();
    jumpTo(Math.floor(i / SECTION_SIZE), i % SECTION_SIZE);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeSheets();
    if (e.target.tagName === "INPUT" || document.body.classList.contains("sheet-open")) return;
    if (e.key === "ArrowRight") go(1);
    if (e.key === "ArrowLeft") go(-1);
  });

  // ---------- 처음 화면(이렇게 공부해요): 첫 방문 때 보여 주고, ? 버튼으로 다시 열기 ----------
  const intro = $("#intro");
  function showIntro(open) {
    intro.hidden = !open;
    document.body.classList.toggle("intro-open", open);
    if (open) intro.scrollTop = 0;
  }
  $("#infoBtn").addEventListener("click", () => showIntro(true));
  $("#startBtn").addEventListener("click", () => {
    store.set("introSeen", true);
    showIntro(false);
  });
  showIntro(!store.get("introSeen", false));

  render();
})();
