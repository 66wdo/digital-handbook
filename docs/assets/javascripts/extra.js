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
  var tocMaxTimer = null, tocEndTimer = null, flashTimer = null, tocJumpTimer = null;
  var pinId = null;               // 点击目录后锁定的目标：停在它附近时，手风琴以它为准（不盲信滚动监听）
  var lastFlashAt = 0;            // 上次高亮时间，防止同标题短时间重播（“又闪一下”）
  var followWrap = null, followTop = null;  // 锁定期间固定右侧目录自身的滚动位置，不让它沿途跟随
  // 用户手动点小箭头收起的目录项：滚动跟随不得把它又自动展开（WeakSet 随 DOM 重建自然失效）
  var userCollapsed = new WeakSet();

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
      // 用户亲手收起的分支：即使包含当前阅读项，也保持收起，不被滚动跟随弹开
      if (userCollapsed.has(p)) { p.classList.remove("toc-open"); continue; }
      if (target && p.contains(target)) p.classList.add("toc-open");
      else p.classList.remove("toc-open");
    }
  }

  // 点击跳转后，只要目标标题还停在视口中上区域，目录就以它为准；
  // 真正滚出这个区段才解除，交回滚动跟随。解决“点主板还停在上一分区”。
  function pinnedAnchor(sec) {
    if (!pinId) return null;
    var el = document.getElementById(pinId);
    if (!el) { pinId = null; return null; }
    var top = el.getBoundingClientRect().top;
    var vh = window.innerHeight;
    if (top < vh * 0.62 && top > -vh * 0.6) {
      return tocLinkById(sec, pinId);
    }
    pinId = null;  // 目标已明显离开当前视口区段
    return null;
  }

  function desiredTarget(sec) {
    return pinnedAnchor(sec) || sec.querySelector(".md-nav__link--active");
  }

  // 普通滚动时跟随阅读位置；目标没变就完全不碰 DOM（避免掉帧/闪烁）
  function syncTocAccordion() {
    if (tocLocked) return;
    var secs = document.querySelectorAll(".md-nav--secondary");
    for (var i = 0; i < secs.length; i++) {
      var sec = secs[i];
      var t = desiredTarget(sec);
      var key = t ? t.getAttribute("href") : "__none__";
      if (sec._lastKey === key) continue;
      sec._lastKey = key;
      renderAccordion(sec, t);
    }
  }

  // Material 生成的目录 href 是「当前页路径#锚点」的完整/相对形式，且中文会被编码，
  // 不能用 a[href="#id"] 精确匹配；统一用解码后的 a.hash 比较。
  function hashOf(a) {
    try { return (a.hash && a.hash.charAt(0) === "#") ? decodeURIComponent(a.hash.slice(1)) : null; }
    catch (e) { return null; }
  }
  function tocLinkById(scope, id) {
    var as = scope.querySelectorAll("a[href]");
    for (var i = 0; i < as.length; i++) { if (hashOf(as[i]) === id) return as[i]; }
    return null;
  }
  function linkForId(id) {
    var out = [];
    document.querySelectorAll(".md-nav--secondary").forEach(function (sec) {
      var t = tocLinkById(sec, id); if (t) out.push(t);
    });
    return out;
  }

  // 点击目录：立即按目标展开（不等滚动），并在滚动到位前冻结跟随
  function expandToId(id) {
    var links = linkForId(id);
    document.querySelectorAll(".md-nav--secondary").forEach(function (sec) {
      var target = tocLinkById(sec, id);
      // 主动点链接跳转：目标所在的祖先链应正常展开，清掉它们此前的手动收起标记
      sec.querySelectorAll("li.toc-parent").forEach(function (p) {
        if (target && p.contains(target)) userCollapsed.delete(p);
      });
      renderAccordion(sec, target);
      if (target) sec._lastKey = target.getAttribute("href");
    });
    return links;
  }

  // 让目标成为侧栏里唯一的高亮项（锁定期间防止 Material 沿途改 active）
  function forceTocActive(id) {
    document.querySelectorAll(".md-nav--secondary").forEach(function (sec) {
      sec.querySelectorAll(".md-nav__link--active").forEach(function (a) {
        a.classList.remove("md-nav__link--active");
      });
      sec.querySelectorAll(".md-nav__item--active").forEach(function (li) {
        li.classList.remove("md-nav__item--active");
      });
      var t = tocLinkById(sec, id);
      if (t) {
        t.classList.add("md-nav__link--active");
        var li = t.parentElement;
        while (li && li !== sec) { if (li.classList) li.classList.add("md-nav__item--active"); li = li.parentElement; }
      }
    });
  }

  // 点击瞬间：目录直接“弹”到目标——展开、高亮、并让目标在目录框内瞬间就位（无滑动）
  function snapTocTo(id) {
    expandToId(id);
    forceTocActive(id);
    followWrap = null; followTop = null;
    document.querySelectorAll(".md-sidebar--secondary .md-sidebar__scrollwrap").forEach(function (w) {
      var t = tocLinkById(w, id);
      if (t) {
        t.scrollIntoView({ block: "nearest", behavior: "auto" });  // 瞬间，不做平滑
        followWrap = w; followTop = w.scrollTop;                     // 记下就位位置，锁定期间保持
      }
    });
  }

  // 锁定期间：把目录框滚动位置拉回就位值，抵消 Material 的沿途跟随
  function holdTocFollow() {
    if (followWrap && followTop !== null) followWrap.scrollTop = followTop;
  }

  function unlockToc() {
    tocLocked = false;
    followWrap = null; followTop = null;   // 释放目录框滚动锁定
    clearTimeout(tocMaxTimer); clearTimeout(tocEndTimer);
    document.querySelectorAll(".md-nav--secondary").forEach(function (sec) {
      var t = desiredTarget(sec);   // 优先保持点击目标，而不是被旧滚动监听拉走
      sec._lastKey = t ? t.getAttribute("href") : null;
      renderAccordion(sec, t);
    });
    if (pinId) forceTocActive(pinId);
    flashCurrentHeading();  // 到位后只高亮这一次
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
          // 正文平滑滚动期间，目录保持“点击瞬间的目标状态”，不沿途展开/跟随
          if (pinId) forceTocActive(pinId);
          holdTocFollow();
          clearTimeout(tocEndTimer);
          tocEndTimer = window.setTimeout(unlockToc, 110); // 连续 110ms 无滚动即到位
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
        // 把链接文字包进 .toc-label，让小箭头成为独立 flex 列固定在最右：
        // 无论层级多深、标题是否换行，箭头都不压字，也不会被后面的章节盖住
        if (!link.querySelector(".toc-label")) {
          var lab = document.createElement("span");
          lab.className = "toc-label";
          [].slice.call(link.childNodes).forEach(function (node) {
            if (node.nodeType === 3 ||
                (node.nodeType === 1 && !node.classList.contains("toc-toggle"))) {
              lab.appendChild(node);
            }
          });
          link.insertBefore(lab, link.firstChild);
        }
        if (!link.querySelector(".toc-toggle")) {
          var btn = document.createElement("button");
          btn.className = "toc-toggle";
          btn.setAttribute("aria-label", "展开或收起本节目录");
          btn.innerHTML = CHEVRON;
          btn.addEventListener("click", function (e) {
            e.preventDefault();
            e.stopPropagation();
            // 记录用户的手动折叠意图：收起则记住（滚动跟随不得弹回），展开则解除
            if (li.classList.contains("toc-open")) {
              li.classList.remove("toc-open");
              userCollapsed.add(li);
            } else {
              li.classList.add("toc-open");
              userCollapsed.delete(li);
            }
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
      // 点的是折叠小箭头：只做折叠/展开（按钮自己的 handler 处理），不触发跳转
      if (e.target.closest && e.target.closest(".toc-toggle")) return;
      var a = e.target.closest && e.target.closest(".md-nav--secondary a[href]");
      if (!a || !a.hash || a.hash.charAt(0) !== "#") return; // 只接管本页锚点
      var id = decodeURIComponent(a.hash.slice(1));
      if (!document.getElementById(id)) return; // 找不到就交回浏览器默认行为
      e.preventDefault();
      pinId = id;            // 记住点击目标：停在它附近时目录始终展开它
      try { history.replaceState(null, "", "#" + id); } catch (err) { location.hash = id; }
      // 关键：定位前先关掉手风琴展开过渡，让子目录这一帧就处于“最终展开高度”，
      // 否则 scrollIntoView 会按折叠态的旧坐标定位并锁定，动画结束后上方第一个子项被吞/位移异常
      document.body.classList.add("toc-jumping");
      snapTocTo(id);         // 目录瞬间“弹”到目标（展开+高亮+框内就位），不沿途滑
      lockTocBriefly();      // 平滑滚动期间冻结目录跟随
      scrollToId(id, true);  // 正文平滑滚到视口中上（只有正文动，目录不动）
      window.clearTimeout(tocJumpTimer);
      tocJumpTimer = window.setTimeout(function () {
        document.body.classList.remove("toc-jumping");
      }, 360);
    }, true);
  }

  /* ---------- 7. “返回上一层级”：桌面端放在右侧目录底部，窄屏回退右下角悬浮 ---------- */
  function pathSegments() {
    return decodeURIComponent(location.pathname || "").split("/").filter(Boolean);
  }
  function topTabName() {
    var t = document.querySelector(".md-tabs__item--active .md-tabs__link");
    return t ? t.textContent.trim() : "";
  }
  var mqWide = window.matchMedia("(min-width: 1220px)");
  function setupCrumb() {
    var old = document.querySelector(".up-crumb");
    if (old) old.remove();
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
    // 桌面：钉在右侧目录栏底部；窄屏：目录收进带 transform 的抽屉，挂 body 才能 fixed 可见
    var sideInner = document.querySelector(".md-sidebar--secondary .md-sidebar__inner");
    if (mqWide.matches && sideInner) {
      sideInner.appendChild(a); a.classList.add("in-side");
    } else {
      document.body.appendChild(a); a.classList.add("in-float");
    }
  }
  function onMqChange() { setupCrumb(); }
  if (mqWide.addEventListener) mqWide.addEventListener("change", onMqChange);
  else if (mqWide.addListener) mqWide.addListener(onMqChange);

  /* ---------- 8. 目标标题橙色高亮（只闪一次） ---------- */
  function flashCurrentHeading() {
    var id = pinId || (location.hash ? decodeURIComponent(location.hash.slice(1)) : null);
    if (!id) return;
    var el = null;
    try { el = document.getElementById(id); } catch (e) { return; }
    if (!el || !/^H[2-6]$/.test(el.tagName)) return;
    var now = (window.performance ? performance.now() : Date.now());
    // 已经在播放同一标题的高亮，就不重播（避免“到位后又忽然闪一下”）
    if (el.classList.contains("toc-flash") && now - lastFlashAt < 900) return;
    el.classList.remove("toc-flash");
    void el.offsetWidth;
    lastFlashAt = now;
    el.classList.add("toc-flash");
    window.clearTimeout(flashTimer);
    flashTimer = window.setTimeout(function () { el.classList.remove("toc-flash"); }, 1050);
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
    userCollapsed = new WeakSet();   // instant 切页后目录是新 DOM，清空上一页的手动折叠记忆
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
          pinId = null;
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
