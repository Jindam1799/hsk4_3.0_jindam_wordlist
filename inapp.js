// 카카오톡·인스타그램·네이버 앱 등 "앱 안 브라우저"에서 링크를 열면 크롬(외부 브라우저)으로 다시 열기.
// 앱 안 브라우저는 발음(TTS)이 안 나오거나 체크 기록이 지워지는 경우가 많기 때문.
(() => {
  "use strict";

  const ua = navigator.userAgent;
  const isAndroid = /Android/i.test(ua);
  const isIOS = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isKakao = /KAKAOTALK/i.test(ua);
  const isLine = /\bLine\//i.test(ua);
  const isInApp = isKakao || isLine ||
    /Instagram|FBAN|FBAV|FB_IAB|NAVER\(inapp|DaumApps|BAND\/|KAKAOSTORY|everytimeApp|Barcelona|musical_ly|Bytedance|Twitter|Snapchat|; wv\)/i.test(ua);
  if (!isInApp) return;

  const url = location.href.replace(/[?&]openExternalBrowser=1/, "");
  const noScheme = url.replace(/^https?:\/\//, "");
  const appName = isKakao ? "카카오톡" : /Instagram/i.test(ua) ? "인스타그램" : /NAVER/i.test(ua) ? "네이버 앱" : "앱";

  function openChrome() {
    if (isAndroid) {
      // 안드로이드: 크롬 앱으로 바로 열기 (크롬이 없으면 같은 주소로 돌아옴)
      location.href = `intent://${noScheme}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(url)};end`;
    } else if (isKakao) {
      // 아이폰 카카오톡: 기본 브라우저(사파리 또는 기본으로 설정한 크롬)로 열기
      location.href = `kakaotalk://web/openExternal?url=${encodeURIComponent(url)}`;
    } else if (isLine) {
      location.href = url + (url.includes("?") ? "&" : "?") + "openExternalBrowser=1";
    } else if (isIOS) {
      // 아이폰의 다른 앱: 크롬이 깔려 있으면 크롬으로
      location.href = `googlechromes://${noScheme}`;
    }
  }

  // 자동으로 한 번만 시도 (돌아왔을 때 다시 넘기지 않도록)
  let tried = false;
  try { tried = sessionStorage.getItem("hsk4:openedExternal") === "1"; sessionStorage.setItem("hsk4:openedExternal", "1"); } catch { /* 무시 */ }
  if (!tried) openChrome();

  // 자동으로 안 넘어갔을 때를 위한 안내 띠
  function showBanner() {
    const iosOther = isIOS && !isKakao && !isLine;
    const bar = document.createElement("div");
    bar.className = "inapp-bar";
    bar.innerHTML = `
      <p><b>${appName} 안에서 열렸어요.</b> 발음 듣기와 체크 저장이 잘 되도록 ${isIOS && isKakao ? "사파리·크롬" : "크롬"}에서 열어 주세요.
      ${iosOther ? "<br>안 열리면 화면의 <b>···</b> 메뉴에서 <b>‘브라우저로 열기’</b>를 눌러 주세요." : ""}</p>
      <div class="inapp-actions">
        <button type="button" data-act="open">${isIOS && isKakao ? "브라우저로 열기" : "크롬으로 열기"}</button>
        <button type="button" data-act="copy">링크 복사</button>
        <button type="button" data-act="close" aria-label="닫기">✕</button>
      </div>`;
    bar.addEventListener("click", async (e) => {
      const act = e.target.closest("button")?.dataset.act;
      if (act === "open") openChrome();
      if (act === "close") bar.remove();
      if (act === "copy") {
        try { await navigator.clipboard.writeText(url); e.target.textContent = "복사됨!"; }
        catch { prompt("아래 주소를 복사해 크롬에 붙여 넣어 주세요.", url); }
      }
    });
    document.body.appendChild(bar);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", showBanner);
  else showBanner();
})();
