/*! HSK 4급 진담 짝꿍어휘 단어장 · © 2026 진담중국어(진심을 담은 중국어). All rights reserved. */
(() => {
  "use strict";

  const SECTION_SIZE = 50;
  const PER_PAGE = 2; // 한 화면에 단어 2개
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
  const pageStart = (i) => Math.floor(i / PER_PAGE) * PER_PAGE;
  const state = {
    section: clampSection(store.get("section", 0)),
    idx: store.get("idx", 0), // 구간 안에서 화면 첫 단어의 위치 (마지막으로 본 곳에서 이어서 시작)
    mode: store.get("mode", "all"),
    rounds: store.get("rounds", {}), // { 단어번호: [bool, bool, bool] }
  };
  state.idx = pageStart(Math.max(0, Math.min(state.idx, sections[state.section].length - 1)));

  const $ = (sel) => document.querySelector(sel);
  const stage = $("#stage");

  // ---------- 유틸 ----------
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fold = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, "").toLowerCase();
  const highlight = (text, word) => esc(text).split(esc(word)).join(`<span class="hl">${esc(word)}</span>`);
  const roundsOf = (no) => state.rounds[no] || [false, false, false];
  const pageWords = () => sections[state.section].slice(state.idx, state.idx + PER_PAGE);
  const sectionLabel = (sec) => `${pad(sec[0].no)} – ${pad(sec[sec.length - 1].no)}`;

  function saveSpot() {
    store.set("section", state.section);
    store.set("idx", state.idx);
  }

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
  function speak(text, btn) {
    if (!("speechSynthesis" in window)) return;
    pickVoice(); // 음성 목록이 늦게 들어오는 브라우저 대비: 말할 때마다 다시 확인
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = zhVoice ? zhVoice.lang : "zh-CN";
    if (zhVoice) u.voice = zhVoice;
    u.rate = 0.85;
    if (btn) {
      btn.classList.add("playing");
      u.onend = u.onerror = () => btn.classList.remove("playing");
    }
    speechSynthesis.speak(u);
  }

  const SPEAKER = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9v6h4l5 4V5L7 9H3zm13.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z"/></svg>';

  // ---------- 캐릭터 (표지의 짝꿍이) ----------
  // 캐릭터 그림은 진담중국어 단어장 표지 원본에서 오려 낸 것 (img/char.png, img/mini.png). 몸의 글자는 앱이 올림
  const CHAR_IMG = '<img src="img/char.png" alt="" draggable="false">';
  const MINI_IMG = '<img src="img/mini.png" alt="" draggable="false">';

  // 짝꿍어휘에서 표제어를 빼고 남은 "짝꿍" 부분 (예: 按时完成 → 完成)
  function partner(pair, word) {
    const rest = pair.replace(word, "").replace(/[，,。！？…\s]/g, "");
    return rest && rest.length <= 4 ? rest : null;
  }

  function renderHero() {
    const w = WORDS[sections[state.section][state.idx].no - 1];
    const zs = { 1: 0.27, 2: 0.2, 3: 0.155, 4: 0.12 }[w.word.length] || 0.12;
    $("#hero").innerHTML = `
      <div class="char" id="heroChar" role="button" aria-label="${esc(w.word)} 발음 듣기" style="--zs:${zs}">
        ${CHAR_IMG}
        <div class="char-text"><b>${esc(w.word)}</b><small>${esc(w.pinyin)} · ${esc(w.meaning.split(/[;,]/)[0])}</small></div>
      </div>
      <span class="bubble">우리는 짝꿍!</span>
      <div class="minis">
        ${w.pairs.map((p, i) => `
          <div class="mini-wrap">
            <div class="mini len-${Math.max(2, (partner(p[0], w.word) || "").length)}">${MINI_IMG}<span>${esc(partner(p[0], w.word) || CIRCLED[i])}</span></div>
            <div class="mini-label">${CIRCLED[i]} ${esc(p[0])}<small>${esc(p[2])}</small></div>
          </div>`).join("")}
      </div>`;
    const started = Object.keys(state.rounds).length > 0 || state.section > 0 || state.idx > 0;
    $("#continueTitle").textContent = started ? "이어서 공부하기" : "공부 시작하기";
    $("#continueSub").textContent = `${pad(w.no)} ${w.word}부터 · 구간 ${sectionLabel(sections[state.section])}`;
  }

  // ---------- 단어 카드 ----------
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
            <button class="hz zh mask" data-say="${esc(w.word)}" lang="zh-CN">${esc(w.word)}</button>
            <span class="py zh mask">${esc(w.pinyin)}</span>
            <button class="speak" data-say="${esc(w.word)}" aria-label="발음 듣기">${SPEAKER}</button>
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

  // 화면 크기에 맞춰 글자 크기 배율(--k)을 정하고, 넘치는 카드가 있으면 조금씩 줄임
  function fitPage(page) {
    const h = stage.clientHeight;
    let k = Math.max(0.8, Math.min(1.35, h / 470));
    const overflowing = () => [...page.querySelectorAll(".word")].some((w) => w.scrollHeight > w.clientHeight + 1);
    page.style.setProperty("--k", k.toFixed(2));
    for (let i = 0; i < 12 && overflowing() && k > 0.62; i++) {
      k -= 0.05;
      page.style.setProperty("--k", k.toFixed(2));
    }
  }

  function renderPage(flashNo) {
    stage.innerHTML = `<div class="page">${pageWords().map(wordHTML).join("")}</div>`;
    const page = stage.firstElementChild;
    fitPage(page);
    if (flashNo) page.querySelector(`.word[data-no="${flashNo}"]`)?.classList.add("flash");
  }

  function renderChrome() {
    const sec = sections[state.section];
    $("#bandTitle").textContent = `구간 ${sectionLabel(sec)}`;
    ["all", "hide-ko", "hide-zh"].forEach((m) => document.body.classList.toggle("mode-" + m, m === state.mode));
    document.querySelectorAll("#modeSeg button").forEach((b) => b.classList.toggle("on", b.dataset.mode === state.mode));
    $("#prevBtn").disabled = state.section === 0 && state.idx === 0;
    $("#nextBtn").disabled = state.section === sections.length - 1 && state.idx + PER_PAGE >= sec.length;
    renderProgress();
  }

  function renderProgress() {
    const sec = sections[state.section];
    const words = pageWords();
    const counts = [0, 1, 2].map((i) => sec.filter((w) => roundsOf(w.no)[i]).length);
    const end = state.idx + words.length;
    $("#progress").innerHTML = `
      <div class="label"><span><b>${state.idx + 1}${words.length > 1 ? `–${end}` : ""}</b> / ${sec.length}</span><span>${counts.map((c, i) => `${i + 1}회 <b>${c}</b>`).join(" · ")}</span></div>
      <div class="track"><i style="width:${(end / sec.length) * 100}%"></i></div>`;
  }

  function render(flashNo) {
    renderChrome();
    renderPage(flashNo);
  }

  // ---------- 홈 ↔ 공부 화면 ----------
  function showStudy(push = true) {
    $("#home").hidden = true;
    $("#study").hidden = false;
    render();
    if (push && history.state?.screen !== "study") history.pushState({ screen: "study" }, "");
  }
  function showHome() {
    $("#study").hidden = true;
    $("#home").hidden = false;
    renderHero();
  }
  // 휴대폰 '뒤로 가기'를 누르면 홈으로
  window.addEventListener("popstate", () => { closeSheets(); showHome(); });
  $("#homeBtn").addEventListener("click", () => {
    if (history.state?.screen === "study") history.back();
    else showHome();
  });
  $("#continueBtn").addEventListener("click", () => showStudy());
  $("#home").addEventListener("click", (e) => {
    if (e.target.closest("#heroChar")) speak(WORDS[sections[state.section][state.idx].no - 1].word);
  });

  // ---------- 넘기기 (애니메이션) ----------
  function neighbor(dir) {
    let section = state.section, idx = state.idx + dir * PER_PAGE;
    if (idx < 0) {
      if (section === 0) return null;
      section -= 1; idx = pageStart(sections[section].length - 1);
    } else if (idx >= sections[section].length) {
      if (section === sections.length - 1) return null;
      section += 1; idx = 0;
    }
    return { section, idx };
  }

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let busy = false;

  function bounce(el) {
    el.style.transition = "transform .2s ease-out";
    el.style.transform = "";
  }

  function go(dir) {
    if (busy) return;
    const next = neighbor(dir);
    const page = stage.querySelector(".page");
    if (!next) { if (page) bounce(page); return; }

    const apply = () => {
      Object.assign(state, next);
      saveSpot();
      render();
    };
    if (reduceMotion || !page) { apply(); return; }

    busy = true;
    page.style.transition = "transform .16s ease-in, opacity .16s ease-in";
    page.style.transform = `translateX(${-dir * 110}%)`;
    page.style.opacity = "0";
    setTimeout(() => {
      apply();
      const incoming = stage.querySelector(".page");
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

  function jumpTo(section, idx, flashNo) {
    state.section = clampSection(section);
    state.idx = pageStart(Math.max(0, Math.min(idx, sections[state.section].length - 1)));
    saveSpot();
    if ($("#study").hidden) showStudy();
    render(flashNo);
  }

  // ---------- 손가락으로 밀어 넘기기 ----------
  let drag = null;
  stage.addEventListener("touchstart", (e) => {
    const page = stage.querySelector(".page");
    if (!page || busy || e.touches.length > 1) return;
    drag = { x: e.touches[0].clientX, y: e.touches[0].clientY, dx: 0, horizontal: null, page, t: Date.now() };
  }, { passive: true });

  stage.addEventListener("touchmove", (e) => {
    if (!drag) return;
    const dx = e.touches[0].clientX - drag.x;
    const dy = e.touches[0].clientY - drag.y;
    if (drag.horizontal === null && Math.abs(dx) + Math.abs(dy) > 8) drag.horizontal = Math.abs(dx) > Math.abs(dy);
    if (!drag.horizontal) return;
    e.preventDefault();
    drag.dx = dx;
    const resist = neighbor(dx < 0 ? 1 : -1) ? 1 : 0.25; // 더 넘길 곳이 없으면 살짝만 끌림
    drag.page.style.transition = "none";
    drag.page.style.transform = `translateX(${dx * resist}px) rotate(${(dx * resist) / 50}deg)`;
  }, { passive: false });

  stage.addEventListener("touchend", () => {
    if (!drag) return;
    const { dx, horizontal, page, t } = drag;
    drag = null;
    if (!horizontal) return;
    const fast = Math.abs(dx) > 30 && Date.now() - t < 250;
    if (Math.abs(dx) > 70 || fast) go(dx < 0 ? 1 : -1);
    else bounce(page);
  });
  stage.addEventListener("touchcancel", () => { if (drag) bounce(drag.page); drag = null; });

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

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { const p = stage.querySelector(".page"); if (p && !$("#study").hidden) fitPage(p); }, 100);
  });

  // ---------- 아래에서 올라오는 창 (구간 고르기 / 단어 찾기 / 공부 방법) ----------
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

  function openSections() {
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
  }
  $("#sectionBtn").addEventListener("click", openSections);
  $("#homeSectionBtn").addEventListener("click", openSections);
  $("#sectionGrid").addEventListener("click", (e) => {
    const b = e.target.closest(".sec");
    if (!b) return;
    closeSheets();
    jumpTo(+b.dataset.section, 0);
  });
  $("#guideBtn").addEventListener("click", () => { pickVoice(); openSheet($("#guideSheet")); });

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
    const no = +b.dataset.no, i = no - 1;
    closeSheets();
    jumpTo(Math.floor(i / SECTION_SIZE), i % SECTION_SIZE, no);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeSheets();
    if (e.target.tagName === "INPUT" || document.body.classList.contains("sheet-open") || $("#study").hidden) return;
    if (e.key === "ArrowRight") go(1);
    if (e.key === "ArrowLeft") go(-1);
  });

  // 첫 화면은 홈(표지). 처음 온 사람에게는 '공부 방법'을 한 번 보여 줌
  history.replaceState({ screen: "home" }, "");
  showHome();
  if (!store.get("introSeen", false)) {
    store.set("introSeen", true);
    openSheet($("#guideSheet"));
  }
})();
