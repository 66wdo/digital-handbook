/* ============================================================
 * 个人知识库 · 交互动画脚本（原生 JS，无任何依赖，离线可用）
 * 功能：
 *   1. 分区标记 data-section —— 不同分区可挂不同动画主题
 *   2. 顶部阅读进度条
 *   3. App 式页面进入转场（兼容 Material 的 instant 无刷新切换）
 *   4. 内容区块滚动渐显（轻微 stagger，克制不花哨）
 *   5. 首页分类卡片级联上浮
 * 无障碍：尊重系统「减少动态效果」设置，开启后全部动画一次性呈现
 * ============================================================ */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // 只有 JS 可用且不需要减少动画时才隐藏待动画元素，保证无 JS / 降级时内容直接可见
  if (!reduceMotion) document.documentElement.classList.add("has-anim");

  /* ---------- 1. 根据 URL 给 body 打分区标记，用于分区差异化动画 ---------- */
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

  /* ---------- 3. App 式页面进入转场 ---------- */
  function playEnter() {
    var main = document.querySelector(".md-content");
    if (!main) return;
    if (reduceMotion) { main.classList.add("enter-done"); return; }
    main.classList.remove("enter-done");
    main.classList.remove("is-entering");
    // 强制 reflow，保证 instant 切换时动画能重新触发
    void main.offsetWidth;
    main.classList.add("is-entering");
    window.setTimeout(function () {
      main.classList.add("enter-done");
    }, 620);
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

    nodes.forEach(function (n, idx) {
      // 同一屏内的区块做轻微级联，封顶延迟，避免越往下越慢
      if (n.tagName === "H2") group = 0;
      var delay = Math.min(group * 55, 220);
      if (delay) n.style.transitionDelay = delay + "ms";
      n.classList.add("reveal");
      group++;
      io.observe(n);
    });
  }

  /* ---------- 5. 首页 / 分类卡片级联上浮 ---------- */
  function setupCards() {
    var cards = document.querySelectorAll(".md-content .grid.cards > ul > li");
    cards.forEach(function (card, idx) {
      card.classList.add("card-rise");
      if (!reduceMotion) card.style.animationDelay = (idx * 70) + "ms";
      else card.classList.add("card-rise-done");
    });
  }

  /* ---------- 初始化（每次页面/instant 切换都会调用） ---------- */
  function init() {
    detectSection();
    playEnter();
    setupReveal();
    setupCards();
    updateProgress();
  }

  document.addEventListener("DOMContentLoaded", function () {
    init();
    window.addEventListener("scroll", onScroll, { passive: true });
    // Material instant 无刷新切换完成后会派发 locationchange
    window.addEventListener("locationchange", init);
    window.addEventListener("pageshow", init);
  });
})();
