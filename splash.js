// 시작화면: 오늘의 짝꿍 — 하루 첫 방문에만 보이고, '시작하기'를 누르면 오늘의 단어를 읽어 준 뒤 홈으로
// © 2026 진담중국어(진심을 담은 중국어). All rights reserved.
(function () {
  const el = document.getElementById("splash");
  if (!el || document.documentElement.classList.contains("no-splash") || typeof WORDS === "undefined") { el?.remove(); return; }

  const today = new Date().toLocaleDateString("sv-SE");
  // 날짜마다 다른 단어 (37은 1000과 서로소라 1000일 동안 겹치지 않고 한 바퀴)
  const day = Math.floor(new Date(today + "T00:00:00").getTime() / 864e5);
  const w = WORDS[((day * 37) % WORDS.length + WORDS.length) % WORDS.length];

  const $ = (s) => el.querySelector(s);
  const word = $(".sp-word");
  word.textContent = w.word;
  const n = [...w.word].length;
  word.style.fontSize = n <= 1 ? "clamp(46px, 7.6dvh, 66px)" : n === 2 ? "clamp(36px, 5.8dvh, 50px)" : n === 3 ? "clamp(26px, 4.2dvh, 36px)" : "clamp(20px, 3.3dvh, 28px)";
  $(".sp-py").textContent = w.pinyin;
  $(".sp-mean").textContent = w.meaning;
  const d = new Date();
  $(".sp-date").textContent = `${d.getMonth() + 1}월 ${d.getDate()}일 · No.${String(w.no).padStart(4, "0")}`;
  const marks = ["①", "②", "③"];
  $(".sp-buddies").innerHTML = w.pairs.map((p, i) => `
    <div class="sp-buddy">
      <div class="sp-face"><svg viewBox="0 0 30 30" aria-hidden="true">
        <circle cx="10.5" cy="10" r="1.6" fill="#3a2a28"/><circle cx="19.5" cy="10" r="1.6" fill="#3a2a28"/>
        <ellipse cx="6.5" cy="13.5" rx="2.4" ry="1.3" fill="#f2a79d"/><ellipse cx="23.5" cy="13.5" rx="2.4" ry="1.3" fill="#f2a79d"/>
        <path d="M13 13 Q15 15 17 13" stroke="#3a2a28" stroke-width="1" fill="none" stroke-linecap="round"/></svg>
        <span>${marks[i]}</span></div>
      <div class="sp-pair" lang="zh-CN"></div>
      <div class="sp-pko"></div>
    </div>`).join("");
  el.querySelectorAll(".sp-buddy").forEach((b, i) => {
    b.querySelector(".sp-pair").textContent = w.pairs[i][0];
    b.querySelector(".sp-pko").textContent = w.pairs[i][2];
  });

  let closed = false;
  function close() {
    if (closed) return;
    closed = true;
    try { localStorage.setItem("hsk4:splashDay", JSON.stringify(today)); } catch { /* 무시 */ }
    // 휴대폰은 사용자가 누른 순간에만 소리를 낼 수 있어서, 버튼을 누를 때 오늘의 단어를 읽어 줌
    if (typeof window.jindamSpeak === "function") window.jindamSpeak(w.word);
    el.classList.add("go");
    setTimeout(() => el.classList.add("out"), 380);
    setTimeout(() => el.remove(), 900);
  }
  $(".sp-start").addEventListener("click", close);
})();
