/* ============================================================
 * 个人知识库 · 交互动画脚本（原生 JS，无依赖，离线可用）
 *   1. data-section 分区标记（用于分区差异化动画）
 *   2. 顶部阅读进度条
 *   3. 页面转场：旧页淡出、新页上浮（兼容 Material instant 无刷新）
 *   4. 内容区块滚动渐显
 *   5. 卡片级联上浮
 *   6. 右侧目录默认折叠到“部件层”，点击展开其下问题，当前章节自动展开
 *   7. 返回上一页悬浮按钮
 * ============================================================ */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reduceMotion) document.documentElement.classList.add("has-anim");

  var lastContent = null;
  var backBtn = null;

  var CHEVRON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">' +
    '<polyline points="6 9 12 15 18 9"></polyline></svg>';
  var ARROW_LEFT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">' +
    '<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>';

  /* ---------- 1. 分区标记 ---------- */
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

  /* ---------- 2. 阅读进度条 ---------- */
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
      window.requestAnimationFrame(function () {
        updateProgress();
        syncTocActive();
      });
    }
  }

  /* ---------- 3. 页面转场 ---------- */
  function currentContent() { return document.querySelector(".md-content"); }

  function playEnter() {
    var main = currentContent();
    if (!main) return;
    document.body.classList.remove("is-leaving");
    if (reduceMotion) { main.classList.add("enter-done"); return; }
    main.classList.remove("enter-done", "is-entering");
    void main.offsetWidth;
    main.classList.add("is-entering");
    window.setTimeout(function () { main.classList.add("enter-done"); }, 640);
  }

  function isInternalNav(anchor) {
    if (!anchor || !anchor.href) return false;
    if (anchor.target && anchor.target !== "_self") return false;
    if (anchor.hasAttribute("download")) return false;
    var h = anchor.getAttribute("href");
    if (h && h.charAt(0) === "#") return false;
    var url;
    try { url = new URL(anchor.href, location.href); } catch (e) { return false; }
    if (url.origin !== location.origin) return false;
    if (url.pathname === location.pathname) return false;
    var ext = url.pathname.split(".").pop().toLowerCase();
    if (["zip","pdf","png","jpg","jpeg","gif","svg","mp4"].indexOf(ext) !== -1) return false;
    return true;
  }

  function onLinkClick(e) {
    if (reduceMotion || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    var a = e.target.closest ? e.target.closest("a") : null;
    if (!isInternalNav(a)) return;
    document.body.classList.add("is-leaving");
    window.setTimeout(function () { document.body.classList.remove("is-leaving"); }, 320);
  }

  /* ---------- 4. 滚动渐显 ---------- */
  var io = null;
  var REVEAL_SEL = [
    ".md-content h2", ".md-content h3", ".md-content .admonition",
    ".md-content details", ".md-content .tabbed-set", ".md-content .grid",
    ".md-content table", ".md-content blockquote"
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

  /* ---------- 5. 卡片级联 ---------- */
  function setupCards() {
    document.querySelectorAll(".md-content .grid.cards > ul > li").forEach(function (card, idx) {
      card.classList.add("card-rise");
      if (!reduceMotion) card.style.animationDelay = (idx * 70) + "ms";
      else card.classList.add("card-rise-done");
    });
  }

  /* ---------- 6. 右侧目录：默认折叠到部件层，点击展开 ---------- */
  function syncTocActive() {
    // 页面里可能有多份二级目录（左侧主导航内嵌一份、右侧侧栏一份），都要同步
    document.querySelectorAll(".md-nav--secondary").forEach(function (sec) {
      var active = sec.querySelector(".md-nav__link--active");
      sec.querySelectorAll("li.toc-parent").forEach(function (p) {
        // 用户手动收/放过后不再自动干预
        if (p.getAttribute("data-manual") === "1") return;
        if (active && p.contains(active)) p.classList.add("toc-open");
      });
    });
  }

  function setupToc() {
    // 同时处理左侧内嵌与右侧可见的两份二级目录
    document.querySelectorAll(".md-nav--secondary").forEach(function (sec) {
      var tops = sec.querySelectorAll(":scope > .md-nav__list > li");
      tops.forEach(function (li) {
        var sub = li.querySelector(":scope > nav.md-nav");
        var link = li.querySelector(":scope > .md-nav__link");
        if (!sub || !link) return;
        li.classList.add("toc-parent");
        if (!link.querySelector(".toc-toggle")) {
          var btn = document.createElement("button");
          btn.className = "toc-toggle";
          btn.setAttribute("aria-label", "展开或收起本节目录");
          btn.innerHTML = CHEVRON;
          // 点小三角：只展开/收起，不跳转
          btn.addEventListener("click", function (e) {
            e.preventDefault();
            e.stopPropagation();
            li.setAttribute("data-manual", "1");
            li.classList.toggle("toc-open");
          });
          link.appendChild(btn);
        }
        // 点部件标题：正常跳转锚点，同时展开它
        link.addEventListener("click", function () {
          li.setAttribute("data-manual", "1");
          li.classList.add("toc-open");
        });
      });
      // 刚进入页面还没滚动定位 active 时，默认展开第一个部件，其余收起
      if (!sec.querySelector("li.toc-parent.toc-open")) {
        var first = sec.querySelector("li.toc-parent");
        if (first) first.classList.add("toc-open");
      }
    });
    syncTocActive();
  }

  /* ---------- 7. 返回上一页 ---------- */
  function pathSegments() {
    return decodeURIComponent(location.pathname || "").split("/").filter(Boolean);
  }

  function fallbackUrl(seg) {
    // 目录型 URL：数码/分类/文章 → 回分类首页；分类首页 → 回站点首页
    if (seg.length <= 2) return "/";
    return "/" + seg[0] + "/" + seg[1] + "/";
  }

  function sameOrigin(ref) {
    try { return new URL(ref).origin === location.origin; } catch (e) { return false; }
  }

  function setupBack() {
    var seg = pathSegments();
    // 站点首页不显示返回
    var isHome = seg.length === 0 ||
      (seg.length === 1 && /index\.html?$/.test(seg[0]));
    if (!backBtn) {
      backBtn = document.createElement("a");
      backBtn.className = "back-fab";
      backBtn.innerHTML = ARROW_LEFT + "<span>返回</span>";
      backBtn.addEventListener("click", function (e) {
        if (window.history.length > 1 && document.referrer && sameOrigin(document.referrer)) {
          e.preventDefault();
          window.history.back();
        }
        // 否则按 href 回退到上级页面
      });
      document.body.appendChild(backBtn);
    }
    backBtn.setAttribute("href", fallbackUrl(seg));
    backBtn.style.display = isHome ? "none" : "";
    if (!isHome && !reduceMotion) {
      backBtn.classList.remove("back-show");
      void backBtn.offsetWidth;
      backBtn.classList.add("back-show");
    } else if (!isHome) {
      backBtn.classList.add("back-show");
    }
  }

  /* ---------- 初始化 ---------- */
  function init() {
    detectSection();
    playEnter();
    setupReveal();
    setupCards();
    setupToc();
    setupBack();
    updateProgress();
  }

  document.addEventListener("DOMContentLoaded", function () {
    lastContent = currentContent();
    init();
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("click", onLinkClick, true);

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

    window.addEventListener("locationchange", init);
    window.addEventListener("pageshow", init);
    window.addEventListener("popstate", init);
  });
})();
