/* ============================================================
 * 交互式视图图（interactive diagram）· 可复用组件，原生 JS 无依赖
 *   用法：在 markdown 中放一个 .idg 容器，内含
 *     - .idg-controls 里的 [data-set-mode] 状态切换按钮（可选）
 *     - .idg-stage 里的 SVG，节点 .idg-node / 线路 .idg-link 带 data-key
 *     - .idg-panel 信息面板（title / body）
 *     - <script type="application/json" class="idg-data"> 数据，
 *       key 与 data-key 对应；__intro / __route / __bridge 为特殊面板
 *   兼容 Material instant：locationchange / pageshow / MutationObserver 兜底
 * ============================================================ */
(function () {
  "use strict";

  function initAll(root) {
    (root || document).querySelectorAll(".idg:not([data-idg-ready])").forEach(setup);
  }

  function setup(box) {
    box.setAttribute("data-idg-ready", "1");
    var dataEl = box.querySelector(".idg-data");
    var data = {};
    try { data = JSON.parse(dataEl ? (dataEl.textContent || "{}") : "{}"); }
    catch (e) { data = {}; }

    var panel = box.querySelector(".idg-panel");
    var panelTitle = box.querySelector(".idg-panel-title");
    var panelBody = box.querySelector(".idg-panel-body");
    var current = null;

    function showPanel(d, animate) {
      if (!d) return;
      if (d.title) panelTitle.innerHTML = d.title;
      var bodyHtml = d.body || "";
      if (d.link) bodyHtml += '<a class="idg-go" href="' + d.link.href + '">' + d.link.text + "<span aria-hidden=\"true\">→</span></a>";
      if (bodyHtml) panelBody.innerHTML = bodyHtml;
      if (animate !== false) {
        panel.classList.remove("idg-panel-in");
        void panel.offsetWidth;
        panel.classList.add("idg-panel-in");
      }
    }

    function select(key, el) {
      if (current) {
        current.classList.remove("is-selected");
        current.removeAttribute("aria-selected");
      }
      current = el;
      el.classList.add("is-selected");
      el.setAttribute("aria-selected", "true");
      showPanel(data[key], true);
    }

    // 节点 / 线路：点击 + 键盘
    box.querySelectorAll("[data-key]").forEach(function (el) {
      var key = el.getAttribute("data-key");
      if (!data[key]) return;
      el.setAttribute("tabindex", "0");
      el.setAttribute("role", "button");
      el.addEventListener("click", function (e) { e.preventDefault(); select(key, el); });
      el.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
          e.preventDefault();
          select(key, el);
        }
      });
    });

    // 状态 / 模式切换
    box.querySelectorAll("[data-set-mode]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var mode = btn.getAttribute("data-set-mode");
        box.setAttribute("data-mode", mode);
        box.querySelectorAll("[data-set-mode]").forEach(function (b) {
          var on = b === btn;
          b.classList.toggle("is-active", on);
          b.setAttribute("aria-selected", on ? "true" : "false");
        });
        showPanel(data[mode === "bridge" ? "__bridge" : "__route"], true);
      });
    });

    // 初始引导面板
    if (data.__intro) showPanel(data.__intro, false);
    else panel.classList.add("idg-panel-in");
  }

  document.addEventListener("DOMContentLoaded", function () { initAll(document); });
  document.addEventListener("locationchange", function () {
    window.setTimeout(function () { initAll(document); }, 60);
  });
  window.addEventListener("pageshow", function () { initAll(document); });

  if ("MutationObserver" in window) {
    document.addEventListener("DOMContentLoaded", function () {
      var c = document.querySelector(".md-content");
      if (!c) return;
      var mo = new MutationObserver(function () { initAll(document); });
      mo.observe(c, { childList: true, subtree: false });
    });
  }
})();
