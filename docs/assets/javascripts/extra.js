/* ============================================================
 * 个人知识库 · 交互动画脚本（原生 JS，无任何依赖，离线可用）
 * 功能：
 *   1. 分区标记 data-section —— 不同分区可挂不同动画主题
 *   2. 顶部阅读进度条
 *   3. 页面转场：点击内部链接旧页柔和淡出，新页上浮淡入
 *      （同时兼容整页加载与 Material 的 instant 无刷新切换）
 *   4. 内容区块滚动渐显（轻微 stagger，克制不花哨）
 *   5. 首页 / 分类卡片级联上浮
 * 无障碍：尊重系统「减少动态效果」设置，开启后不做位移动画。
 * ============================================================ */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // 只有 JS 可用且不需要减少动画时才隐藏待动画元素，保证降级时内容直接可见
  if (!reduceMotion) document.documentElement.classList.add("has-anim");

  var lastContent = null; // 记录当前 .md-content，用于识别 instant 切换后的新页面

  /* ---------- 1. 根据 URL 给 body 打分区标记 ---------- */
  function detectSection() {
    var path = decodeURIComponent(location.pathname || "");
    var map = [
      ["pc",        ["装机"]],
      ["phone",     ["手机"]],
      ["peripheral",["外设"]],
      ["audio",     ["音频", "HiFi", "hifi"]],
      ["game",      ["游戏"]]
    ];
    var section = "home";
    for (var i = 0; i < map.length; i++) {
      for (var j = 0; j < map[i][1].length; j++) {
        if (path.indexOf(map[i][1][j]) !== -1) { section = map[i][0]; break; }
      }
      if (section !== "home") break;
    }
    document.body.setAttribute("data-section", section);
  }

  /* ---------- 2. 顶部阅读进度条（rAF 节流） ---------- */
  var ticking = false;
  function updateProgress() {
    var doc = document.documentElement;
    var max = doc.scrollHeight - doc.clientHeight;
    var ratio = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 1;
    document.body.style.setProperty("--scroll", ratio.toFixed(4));
    ticking = false;
  }
  function onScroll() {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(updateProgress);
    }
  }

  /* ---------- 3. 页面转场 ---------- */
  function currentContent() {
    return document.querySelector(".md-content");
  }

  // 新页面进入：重播上浮淡入
  function playEnter() {
    var main = currentContent();
    if (!main) return;
    document.body.classList.remove("is-leaving");
    if (reduceMotion) { main.classList.add("enter-done"); return; }
    main.classList.remove("enter-done", "is-entering");
    void main.offsetWidth; // 强制 reflow，保证动画重新触发
    main.classList.add("is-entering");
    window.setTimeout(function () { main.classList.add("enter-done"); }, 640);
  }

  // 判断一个链接是否属于“站内页面跳转”（这些才做退场，外链/下载/同页锚点不做）
  function isInternalNav(anchor) {
    if (!anchor || !anchor.href) return false;
    if (anchor.target && anchor.target !== "_self") return false;
    if (anchor.hasAttribute("download")) return false;
    if (anchor.getAttribute("href") && anchor.getAttribute("href").charAt(0) === "#") return false;
    var url;
    try { url = new URL(anchor.href, location.href); } catch (e) { return false; }
    if (url.origin !== location.origin) return false;
    if (url.pathname === location.pathname) return false; // 同页只换 hash
    var ext = url.pathname.split(".").pop().toLowerCase();
    if (["zip", "pdf", "png", "jpg", "jpeg", "gif", "svg", "mp4"].indexOf(ext) !== -1) return false;
    return true;
  }

  // 点击站内链接：旧页先柔和淡出下沉，instant 会紧接着替换为新页
  function onLinkClick(e) {
    if (reduceMotion || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    var a = e.target.closest ? e.target.closest("a") : null;
    if (!isInternalNav(a)) return;
    document.body.classList.add("is-leaving");
    // 兜底：若跳转被取消（例如 instant 判定不外跳），300ms 后一定复位，避免卡在退场态
    window.setTimeout(function () {
      document.body.classList.remove("is-leaving");
    }, 320);
  }

  /* ---------- 4. 内容区块滚动渐显 ---------- */
  var io = null;
  var REVEAL_SEL = [
    ".md-content h2",
    ".md-content h3",
    ".md-content .admonition",
    ".md-content details",
    ".md-content .tabbed-set",
    ".md-content .grid",
    ".md-content table",
    ".md-content blockquote"
  ].join(",");

  function setupReveal() {
    if (io) { io.disconnect(); io = null; }
    var nodes = document.querySelectorAll(REVEAL_SEL);
    if (reduceMotion || !("IntersectionObserver" in window)) {
      nodes.forEach(function (n) { n.classList.add("reveal-visible"); });
      return;
    }
    var group = 0;
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("reveal-visible");
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });

    nodes.forEach(function (n) {
      if (n.tagName === "H2") group = 0;
      var delay = Math.min(group * 50, 200);
      if (delay) n.style.transitionDelay = delay + "ms";
      n.classList.add("reveal");
      group++;
      io.observe(n);
    });
  }

  /* ---------- 5. 卡片级联上浮 ---------- */
  function setupCards() {
    var cards = document.querySelectorAll(".md-content .grid.cards > ul > li");
    cards.forEach(function (card, idx) {
      card.classList.add("card-rise");
      if (!reduceMotion) card.style.animationDelay = (idx * 70) + "ms";
      else card.classList.add("card-rise-done");
    });
  }

  /* ---------- 初始化（首次加载与每次 instant 切换都会调用） ---------- */
  function init() {
    detectSection();
    playEnter();
    setupReveal();
    setupCards();
    updateProgress();
  }

  document.addEventListener("DOMContentLoaded", function () {
    lastContent = currentContent();
    init();

    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("click", onLinkClick, true); // 捕获阶段，先于 instant 处理

    // Material instant 无刷新切换：用 MutationObserver 感知 .md-content 被替换
    if ("MutationObserver" in window) {
      var mo = new MutationObserver(function () {
        var c = currentContent();
        if (c && c !== lastContent) {
          lastContent = c;
          window.scrollTo(0, 0);
          init();
        }
      });
      mo.observe(document.body, { childList: true, subtree: true });
    }

    // 多重兜底：instant 的 locationchange、bfcache pageshow、前进后退
    window.addEventListener("locationchange", init);
    window.addEventListener("pageshow", init);
    window.addEventListener("popstate", init);
  });
})();
