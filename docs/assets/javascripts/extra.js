/* ============================================================
 * 个人知识库 · 交互动画脚本（原生 JS，无依赖，离线可用）
 *   1. data-section 分区标记
 *   2. 顶部阅读进度条
 *   3. 页面转场（旧页淡出、新页上浮，兼容 Material instant）
 *   4. 内容区块滚动渐显
 *   5. 卡片级联上浮
 *   6. 右侧目录：多级手风琴，只展开当前阅读链，滑走自动收回（任意层级）
 *      —— 点击目录时立即展开目标并在平滑滚动期间“冻结”，不沿途开合
 *   7. 左上角常驻“返回上一层级”（fixed，样式见 extra.css）
 *   8. 点目录跳转：标题停在视口中上、到位后只闪一次橙色高亮
 *   9. 背景氛围光斑（缓慢漂移，只动 transform）
 * 设计原则：只改 transform/opacity；滚动里只在 active 真正变化时才动 DOM。
 * ============================================================ */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reduceMotion) document.documentElement.classList.add("has-anim");

  var lastContent = null;
  var ambientBuilt = false;

  var CHEVRON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">' +
    '<polyline points="6 9 12 15 18 9"></polyline></svg>';
  var ARROW_LEFT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">' +
    '<polyline points="15 18 9 12 15 6"></polyline></svg>';

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

  /* ---------- 2. 进度条 + 目录手风琴 ---------- */
  var ticking = false;
  var tocLocked = false;          // 点击目录后的平滑滚动期间为 true，冻结手风琴
  var tocMaxTimer = null, tocEndTimer = null, flashTimer = null;

  function updateProgress() {
    var doc = document.documentElement;
    var max = doc.scrollHeight - doc.clientHeight;
    var ratio = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 1;
    document.body.style.setProperty("--scroll", ratio.toFixed(4));
  }

  // 在一份侧栏里，按“目标链接”展开它的全部祖先 li，其余收起
  function renderAccordion(sec, preferred) {
    var target = preferred || sec.querySelector(".md-nav__link--active");
    var parents = sec.querySelectorAll("li.toc-parent");
    for (var i = 0; i < parents.length; i++) {
      var p = parents[i];
      if (target && p.contains(target)) p.classList.add("toc-open");
      else p.classList.remove("toc-open");
    }
  }

  // 普通滚动时跟随阅读位置；active 没变就完全不碰 DOM（避免掉帧/闪烁）
  function syncTocAccordion() {
    if (tocLocked) return;
    var secs = document.querySelectorAll(".md-nav--secondary");
    for (var i = 0; i < secs.length; i++) {
      var sec = secs[i];
      var a = sec.querySelector(".md-nav__link--active");
      var key = a ? a.getAttribute("href") : "__none__";
      if (sec._lastKey === key) continue;
      sec._lastKey = key;
      renderAccordion(sec);
    }
  }

  function linkForId(id) {
    try { return document.querySelectorAll('.md-nav--secondary a[href="#' + id + '"]'); }
    catch (e) { return []; }
  }

  // 点击目录：立即按目标展开（不等滚动），并在滚动到位前冻结跟随
  function expandToId(id) {
    var links = linkForId(id);
    document.querySelectorAll(".md-nav--secondary").forEach(function (sec) {
      var target = sec.querySelector('a[href="#' + id + '"]');
      renderAccordion(sec, target);
    });
    return links;
  }

  function unlockToc() {
    tocLocked = false;
    clearTimeout(tocMaxTimer); clearTimeout(tocEndTimer);
    document.querySelectorAll(".md-nav--secondary").forEach(function (sec) {
      sec._lastKey = null;
      renderAccordion(sec);   // 到位后与最终 active 对齐一次
    });
    flashCurrentHeading();  // 到位后只闪这一次
  }

  function lockTocBriefly() {
    tocLocked = true;
    clearTimeout(tocMaxTimer); clearTimeout(tocEndTimer);
    tocMaxTimer = window.setTimeout(unlockToc, 1300); // 兜底，防止滚动事件丢失
  }

  function onScroll() {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(function () {
        updateProgress();
        if (tocLocked) {
          // 滚动中保持冻结；连续 110ms 没有新滚动即认为到位
          clearTimeout(tocEndTimer);
          tocEndTimer = window.setTimeout(unlockToc, 110);
        } else {
          syncTocAccordion();
        }
        ticking = false;
      });
    }
  }

  // 让目标标题停在视口中上（约 26% 处），而不是贴着顶部
  function headingTop(id) {
    var el = document.getElementById(id);
    if (!el) return null;
    var top = el.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.26;
    return { el: el, top: Math.max(top, 0) };
  }
  function scrollToId(id, smooth) {
    var pos = headingTop(id);
    if (!pos) return false;
    window.scrollTo({ top: pos.top, behavior: reduceMotion ? "auto" : (smooth ? "smooth" : "auto") });
    return true;
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
    window.setTimeout(function () { main.classList.add("enter-done"); }, 700);
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
    ".md-content h2", ".md-content h3", ".md-content h4", ".md-content .admonition",
    ".md-content details", ".md-content .tabbed-set", ".md-content .grid",
    ".md-content table", ".md-content blockquote", ".md-content .figure-svg"
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
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.04 });
    nodes.forEach(function (n) {
      if (n.tagName === "H2") group = 0;
      var delay = Math.min(group * 45, 180);
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

  /* ---------- 6. 多级手风琴目录 ---------- */
  function setupToc() {
    document.querySelectorAll(".md-nav--secondary").forEach(function (sec) {
      sec.querySelectorAll("li").forEach(function (li) {
        var sub = li.querySelector(":scope > nav.md-nav");
        var link = li.querySelector(":scope > .md-nav__link");
        if (!sub || !link) return;
        li.classList.add("toc-parent");
        if (!link.querySelector(".toc-toggle")) {
          var btn = document.createElement("button");
          btn.className = "toc-toggle";
          btn.setAttribute("aria-label", "展开或收起本节目录");
          btn.innerHTML = CHEVRON;
          btn.addEventListener("click", function (e) {
            e.preventDefault();
            e.stopPropagation();
            li.classList.toggle("toc-open");
          });
          link.appendChild(btn);
        }
      });
    });
    syncTocAccordion();
    // 页面顶部还没有 active 时，默认展开第一个顶层条目
    document.querySelectorAll(".md-nav--secondary").forEach(function (sec) {
      if (!sec.querySelector("li.toc-open")) {
        var first = sec.querySelector(":scope > .md-nav__list > li.toc-parent");
        if (first) first.classList.add("toc-open");
      }
    });
  }

  // 统一接管“右侧/内嵌目录里的页内锚点点击”
  function setupTocJump() {
    document.addEventListener("click", function (e) {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      var a = e.target.closest && e.target.closest(".md-nav--secondary a[href^='#']");
      if (!a) return;
      var id = a.getAttribute("href").slice(1);
      if (!document.getElementById(id)) return; // 找不到就交回浏览器默认行为
      e.preventDefault();
      try { history.replaceState(null, "", "#" + id); } catch (err) { location.hash = id; }
      expandToId(id);        // 立即展开目标祖先链
      lockTocBriefly();      // 平滑滚动期间冻结跟随，避免沿途开合
      scrollToId(id, true);  // 平滑滚到视口中上
    }, true);
  }

  /* ---------- 7. 左上角“返回上一层级”（fixed 常驻） ---------- */
  function pathSegments() {
    return decodeURIComponent(location.pathname || "").split("/").filter(Boolean);
  }
  function topTabName() {
    var t = document.querySelector(".md-tabs__item--active .md-tabs__link");
    return t ? t.textContent.trim() : "";
  }
  function setupCrumb() {
    var old = document.querySelector(".up-crumb");
    if (old) old.remove();
    var inner = document.querySelector(".md-content__inner");
    if (!inner) return;
    var seg = pathSegments();
    var isHome = seg.length === 0 ||
      (seg.length === 1 && /index\.html?$/.test(seg[0]));
    if (isHome) { document.body.classList.remove("has-upcrumb"); return; }
    document.body.classList.add("has-upcrumb");

    var href, label;
    if (seg.length <= 2) { href = "/"; label = "首页"; }
    else { href = "/" + seg[0] + "/" + seg[1] + "/"; label = topTabName() || seg[1]; }

    var a = document.createElement("a");
    a.className = "up-crumb";
    a.setAttribute("href", href);
    a.innerHTML = ARROW_LEFT + "<span>返回" + label + "</span>";
    inner.insertBefore(a, inner.firstChild);
  }

  /* ---------- 8. 目标标题橙色高亮（只闪一次） ---------- */
  function flashCurrentHeading() {
    if (!location.hash) return;
    var id = decodeURIComponent(location.hash.slice(1));
    var el = null;
    try { el = document.getElementById(id); } catch (e) { return; }
    if (!el || !/^H[2-6]$/.test(el.tagName)) return;
    el.classList.remove("toc-flash");
    void el.offsetWidth;
    el.classList.add("toc-flash");
    window.clearTimeout(flashTimer);
    flashTimer = window.setTimeout(function () { el.classList.remove("toc-flash"); }, 1700);
  }

  /* ---------- 9. 背景氛围层 ---------- */
  function setupAmbient() {
    if (ambientBuilt) return;
    var wrap = document.createElement("div");
    wrap.className = "ambient-bg";
    wrap.setAttribute("aria-hidden", "true");
    wrap.innerHTML = '<span class="ambient-blob blob-a"></span>' +
      '<span class="ambient-blob blob-b"></span>' +
      '<span class="ambient-blob blob-c"></span>';
    document.body.appendChild(wrap);
    ambientBuilt = true;
  }

  /* ---------- 初始化 ---------- */
  function init() {
    detectSection();
    setupAmbient();
    playEnter();
    setupReveal();
    setupCards();
    setupToc();
    setupCrumb();
    updateProgress();
    // 带锚点进入（刷新/跨页#锚点）：直接定位到视口中上，再闪一次
    window.requestAnimationFrame(function () {
      if (location.hash) {
        var id = decodeURIComponent(location.hash.slice(1));
        if (document.getElementById(id)) scrollToId(id, false);
      }
      window.setTimeout(flashCurrentHeading, 80);
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    lastContent = currentContent();
    init();
    setupTocJump();
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("click", onLinkClick, true);
    // 浏览器原生 hashchange（极少触发）兜底高亮一次
    window.addEventListener("hashchange", function () {
      if (!tocLocked) flashCurrentHeading();
    });

    if ("MutationObserver" in window) {
      var mo = new MutationObserver(function () {
        var c = currentContent();
        if (c && c !== lastContent) {
          lastContent = c;
          tocLocked = false;
          if (location.hash) {
            window.requestAnimationFrame(function () {
              var id = decodeURIComponent(location.hash.slice(1));
              if (document.getElementById(id)) scrollToId(id, false);
            });
          } else {
            window.scrollTo(0, 0);
          }
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
