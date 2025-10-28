(function () {
  if (window.__mmd_loader_installed__) return;
  window.__mmd_loader_installed__ = true;

  var CDN_LIST = [
    "https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js",
    "https://unpkg.com/mermaid@10/dist/mermaid.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/mermaid/10.9.1/mermaid.min.js"
  ];

  function log(){ try{ console.log.apply(console, arguments); }catch(e){} }

  async function initMermaid() {
    if (!window.mermaid) return;
    if (!window.__mmd_inited__) {
      mermaid.initialize({
        startOnLoad: false,
        theme: "default",
        securityLevel: "loose"
      });
      window.__mmd_inited__ = true;
      log("[mermaidc] initialized (v10)");
    }
  }

  async function renderAll() {
    if (!window.mermaid) return;
    await initMermaid();

    const nodes = document.querySelectorAll("div.mermaid");
    let idx = 0;
    for (const el of nodes) {
      if (el.getAttribute("data-processed") === "true") continue;
      const code = (el.textContent || "").trim();
      if (!code) continue;
      const id = el.id || ("mmd-auto-" + (idx++));

      try {
        // ✅ v10 API: returns { svg, bindFunctions }
        const { svg, bindFunctions } = await mermaid.render("svg-" + id, code, el);
        el.innerHTML = svg;
        el.setAttribute("data-processed", "true");
        if (typeof bindFunctions === "function") bindFunctions(el);
        //log("[mermaidc] rendered:", id);
      } catch (e) {
        console.error("[mermaidc] render error:", e);
      }
    }
  }

  function loadMermaid(cdnIndex) {
    if (window.mermaid) { renderAll(); return; }
    if (cdnIndex >= CDN_LIST.length) { console.error("[mermaidc] all CDNs failed"); return; }
    const s = document.createElement("script");
    s.src = CDN_LIST[cdnIndex];
    s.defer = true; s.async = true;
    s.onload = function(){ log("[mermaidc] loaded:", s.src); renderAll(); };
    s.onerror = function(){ console.warn("[mermaidc] failed:", s.src); loadMermaid(cdnIndex + 1); };
    document.head.appendChild(s);
  }

  function start() {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", function(){ loadMermaid(0); });
    } else {
      loadMermaid(0);
    }
  }

  // 首次
  start();
  // 兼容常见的前端路由事件
  window.addEventListener("pjax:complete", renderAll);
  window.addEventListener("astro:after-swap", renderAll);
})();
