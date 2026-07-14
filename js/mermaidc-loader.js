(function () {
  if (window.__mmd_loader_installed__) return;
  window.__mmd_loader_installed__ = true;

  var CDN_LIST = [
    "https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js",
    "https://unpkg.com/mermaid@10/dist/mermaid.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/mermaid/10.9.1/mermaid.min.js"
  ];

  function log() {
    try { console.log.apply(console, arguments); } catch (e) {}
  }

  function isGameThemed() {
    var b = document.body;
    if (!b) return false;
    if (b.classList.contains("game-themed")) return true;
    return /(?:throng|tulips|sf|star|ruri|lastrip|xenia)-page/.test(b.className);
  }

  function themeVariablesForPage() {
    var b = document.body;
    var vars = {
      darkMode: true,
      background: "#0b1220",
      primaryColor: "#152848",
      primaryTextColor: "#eaf2ff",
      primaryBorderColor: "#7be0c3",
      secondaryColor: "#101a2c",
      tertiaryColor: "#0a101c",
      lineColor: "#7be0c3",
      textColor: "#eaf2ff",
      mainBkg: "#152848",
      nodeBorder: "#7be0c3",
      clusterBkg: "#101a2c",
      clusterBorder: "#7be0c3",
      titleColor: "#eaf2ff",
      edgeLabelBackground: "#101a2c",
      actorBkg: "#152848",
      actorBorder: "#7be0c3",
      actorTextColor: "#eaf2ff",
      labelBoxBkgColor: "#101a2c",
      labelTextColor: "#eaf2ff",
      signalColor: "#7be0c3",
      signalTextColor: "#eaf2ff",
      fontFamily: "Segoe UI, Noto Sans SC, system-ui, sans-serif",
      fontSize: "15px"
    };

    if (!b) return vars;

    if (b.classList.contains("throng-page")) {
      Object.assign(vars, {
        background: "#0b1f1b",
        primaryColor: "#14352f",
        primaryTextColor: "#eaf8ff",
        primaryBorderColor: "#7be0c3",
        secondaryColor: "#0e1f24",
        tertiaryColor: "#081418",
        lineColor: "#52c7ea",
        textColor: "#eaf8ff",
        mainBkg: "#14352f",
        nodeBorder: "#7be0c3",
        clusterBkg: "#0e1f24",
        clusterBorder: "#7be0c3",
        edgeLabelBackground: "#0e1f24",
        labelBoxBkgColor: "#0e1f24",
        labelTextColor: "#eaf8ff",
        signalColor: "#52c7ea",
        signalTextColor: "#eaf8ff"
      });
    } else if (b.classList.contains("tulips-page")) {
      Object.assign(vars, {
        background: "#1B1512",
        primaryColor: "#2a221c",
        primaryTextColor: "#F4EDE4",
        primaryBorderColor: "#C98A4B",
        secondaryColor: "#211a16",
        tertiaryColor: "#15100e",
        lineColor: "#C98A4B",
        textColor: "#F4EDE4",
        mainBkg: "#2a221c",
        nodeBorder: "#C98A4B",
        clusterBkg: "#211a16",
        clusterBorder: "#C98A4B",
        edgeLabelBackground: "#1B1512",
        labelBoxBkgColor: "#1B1512",
        labelTextColor: "#F4EDE4",
        signalColor: "#C98A4B",
        signalTextColor: "#F4EDE4"
      });
    } else if (b.classList.contains("sf-page")) {
      Object.assign(vars, {
        background: "#1a1210",
        primaryColor: "#241816",
        primaryTextColor: "#e8c978",
        primaryBorderColor: "#c9a227",
        secondaryColor: "#160f0d",
        tertiaryColor: "#100b09",
        lineColor: "#b33a3a",
        textColor: "#e8c978",
        mainBkg: "#241816",
        nodeBorder: "#c9a227",
        clusterBkg: "#160f0d",
        clusterBorder: "#c9a227",
        edgeLabelBackground: "#160f0d",
        labelBoxBkgColor: "#160f0d",
        labelTextColor: "#e8c978",
        signalColor: "#b33a3a",
        signalTextColor: "#e8c978"
      });
    } else if (b.classList.contains("star-page")) {
      Object.assign(vars, {
        background: "#0b1020",
        primaryColor: "#121a2e",
        primaryTextColor: "#e8f5ff",
        primaryBorderColor: "#68f0c6",
        secondaryColor: "#0e1220",
        tertiaryColor: "#07090f",
        lineColor: "#4bd7ff",
        textColor: "#e8f5ff",
        mainBkg: "#121a2e",
        nodeBorder: "#68f0c6",
        clusterBkg: "#0e1220",
        clusterBorder: "#68f0c6",
        edgeLabelBackground: "#0e1220",
        labelBoxBkgColor: "#0e1220",
        labelTextColor: "#e8f5ff",
        signalColor: "#4bd7ff",
        signalTextColor: "#e8f5ff"
      });
    }

    return vars;
  }

  function buildConfig() {
    if (isGameThemed()) {
      return {
        startOnLoad: false,
        theme: "base",
        themeVariables: themeVariablesForPage(),
        securityLevel: "loose",
        flowchart: { htmlLabels: true, curve: "basis" }
      };
    }
    return {
      startOnLoad: false,
      theme: "base",
      themeVariables: {
        darkMode: false,
        background: "#ffffff",
        primaryColor: "#f3e8ff",
        primaryTextColor: "#2a1a33",
        primaryBorderColor: "#8b5cf6",
        secondaryColor: "#fff7fa",
        tertiaryColor: "#ffe4ec",
        lineColor: "#7a5a68",
        textColor: "#3b2436",
        mainBkg: "#f3e8ff",
        nodeBorder: "#8b5cf6",
        clusterBkg: "#fff0f4",
        clusterBorder: "#d4537e",
        titleColor: "#3b2436",
        edgeLabelBackground: "#ffffff",
        labelTextColor: "#3b2436",
        fontSize: "15px"
      },
      securityLevel: "loose",
      flowchart: { htmlLabels: true, curve: "basis" }
    };
  }

  async function initMermaid() {
    if (!window.mermaid) return;
    if (!window.__mmd_inited__) {
      mermaid.initialize(buildConfig());
      window.__mmd_inited__ = true;
      log("[mermaidc] initialized", isGameThemed() ? "(game dark)" : "(cafe light)");
    }
  }

  async function renderAll() {
    if (!window.mermaid) return;
    await initMermaid();

    var nodes = document.querySelectorAll("div.mermaid");
    var idx = 0;
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (el.getAttribute("data-processed") === "true") continue;
      var code = (el.textContent || "").trim();
      if (!code) continue;
      var id = el.id || ("mmd-auto-" + (idx++));

      try {
        var result = await mermaid.render("svg-" + id, code, el);
        el.innerHTML = result.svg;
        el.setAttribute("data-processed", "true");
        if (typeof result.bindFunctions === "function") result.bindFunctions(el);
      } catch (e) {
        console.error("[mermaidc] render error:", e);
      }
    }
  }

  function loadMermaid(cdnIndex) {
    if (window.mermaid) {
      renderAll();
      return;
    }
    if (cdnIndex >= CDN_LIST.length) {
      console.error("[mermaidc] all CDNs failed");
      return;
    }
    var s = document.createElement("script");
    s.src = CDN_LIST[cdnIndex];
    s.defer = true;
    s.async = true;
    s.onload = function () {
      log("[mermaidc] loaded:", s.src);
      renderAll();
    };
    s.onerror = function () {
      console.warn("[mermaidc] failed:", s.src);
      loadMermaid(cdnIndex + 1);
    };
    document.head.appendChild(s);
  }

  function start() {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", function () {
        loadMermaid(0);
      });
    } else {
      loadMermaid(0);
    }
  }

  start();
  window.addEventListener("pjax:complete", renderAll);
  window.addEventListener("astro:after-swap", renderAll);
})();
