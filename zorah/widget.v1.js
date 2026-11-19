/*!
 * Zorah chat widget v1 — Zero One Response Automation Hub (Zero1 Ventures)
 *
 * Embed:
 *   <script src="https://www.zero1co.com/zorah/widget.v1.js" defer
 *           data-key="zpw_..."                      (required, public widget key)
 *           data-title="HeyCrew Help"               (optional)
 *           data-subtitle="Answers from our help articles"   (optional; omit for a title-only header)
 *           data-greeting="Hi! Ask me anything about HeyCrew."
 *           data-color="#16384A"                    (header color)
 *           data-accent="#0ABFBC"                   (visitor messages and buttons; defaults to data-color)
 *           data-launcher-color="#FFD93D"           (launcher; defaults to data-accent)
 *           data-ink="#16384A"                      (dark text on light colors)
 *           data-canvas="#EEF2F1"                   (chat background)
 *           data-font="'Plus Jakarta Sans'"         (body font; must already be loaded by the page)
 *           data-heading-font="'Bricolage Grotesque'"
 *           data-label="Ask HeyCrew"                (launcher text; omit for icon-only)
 *           data-teaser="Questions? I can help."    (one-time prompt above the launcher)
 *           data-teaser-delay="5"                   (seconds)
 *           data-suggestions="Q1|Q2|Q3"             (up to 4 starter questions)
 *           data-position="right"                   (right | left)
 *           data-support-email="support@example.com"
 *           data-consent="Custom consent text"
 *           data-privacy-url="https://example.com/privacy"></script>
 *
 * JS API: window.Zorah.open(), window.Zorah.close()
 */
(function () {
  "use strict";
  if (window.Zorah && window.Zorah._loaded) return;

  var script = document.currentScript || (function () {
    var s = document.querySelectorAll("script[src*='zorah/widget']");
    return s[s.length - 1];
  })();
  var ds = (script && script.dataset) || {};
  var KEY = (ds.key || "").trim();
  if (!KEY) { console.warn("[Zorah] missing data-key"); return; }

  var hex = function (v, d) { return /^#[0-9a-f]{3,8}$/i.test(v || "") ? v : d; };
  var font = function (v) { return (v || "").replace(/[^\w\s,'"-]/g, "").trim(); };
  var CFG = {
    endpoint: ds.endpoint || "https://qnrhpgxndmktegittmii.supabase.co/functions/v1/ask?forceFunctionRegion=us-west-2",
    title: ds.title || "Help",
    subtitle: ds.subtitle || "",                     // optional second header line
    greeting: ds.greeting || "Hi! How can I help?",
    color: hex(ds.color, "#2563eb"),                 // header
    position: ds.position === "left" ? "left" : "right",
    supportEmail: ds.supportEmail || "",
    privacyUrl: ds.privacyUrl || "",
    consent: ds.consent || "You're chatting with an AI assistant. It answers from our help articles, can't see or change your account, and can make mistakes. Chats are recorded and may be reviewed to improve answers. Please don't share passwords, codes, payment details or other personal information.",
    label: (ds.label || "").slice(0, 40),            // launcher text; empty = icon only
    teaser: (ds.teaser || "").slice(0, 120),         // one-time prompt above the launcher
    teaserDelay: Math.max(0, Math.min(60, Number(ds.teaserDelay) || 5)) * 1000,
    suggestions: (ds.suggestions || "").split("|").map(function (x) { return x.trim(); }).filter(Boolean).slice(0, 4),
    fontBody: font(ds.font),
    fontHead: font(ds.headingFont)
  };
  CFG.accent = hex(ds.accent, CFG.color);            // visitor messages and buttons
  CFG.launcher = hex(ds.launcherColor, CFG.accent);  // launcher button
  CFG.canvas = hex(ds.canvas, "#f9fafb");            // chat background
  CFG.ink = hex(ds.ink, "#111827");                  // dark text on light colors

  var NS = "zorah_" + KEY.slice(-8);
  var store = {
    get: function (k) { try { return sessionStorage.getItem(NS + "_" + k); } catch (e) { return null; } },
    set: function (k, v) { try { v == null ? sessionStorage.removeItem(NS + "_" + k) : sessionStorage.setItem(NS + "_" + k, v); } catch (e) {} }
  };

  // Pick white or the brand's dark text color, whichever has more contrast on the background (WCAG luminance).
  function lum(hx) {
    var h = hx.replace("#", "");
    if (h.length === 3) h = h.split("").map(function (c) { return c + c; }).join("");
    return [0, 2, 4].map(function (i) {
      var c = parseInt(h.substr(i, 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    }).reduce(function (t, c, i) { return t + c * [0.2126, 0.7152, 0.0722][i]; }, 0);
  }
  function contrast(a, b) { var x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
  function onAccent(bg) { return contrast(bg, "#ffffff") >= contrast(bg, CFG.ink) ? "#ffffff" : CFG.ink; }

  var side = CFG.position;
  var BODY = (CFG.fontBody ? CFG.fontBody + "," : "") + "system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
  var HEAD = CFG.fontHead ? CFG.fontHead + "," + BODY : BODY;
  var css = [
    ":host{all:initial}",
    "[hidden]{display:none!important}",
    "*{box-sizing:border-box;font-family:" + BODY + "}",
    ".launch{position:fixed;bottom:20px;" + side + ":20px;height:56px;min-width:56px;padding:0 16px;border-radius:28px;border:0;cursor:pointer;background:var(--launch);color:var(--on-launch);box-shadow:0 8px 24px rgba(0,0,0,.22);display:flex;align-items:center;justify-content:center;gap:8px;z-index:2147483000;font:700 15px/1 " + HEAD + ";transition:transform .15s}",
    ".launch:hover{transform:translateY(-2px)}",
    ".launch.icon{width:56px;padding:0}",
    "@media (prefers-reduced-motion:no-preference){.launch.nudge{animation:zbounce 1.2s ease 2}}",
    "@keyframes zbounce{0%,100%{transform:translateY(0)}30%{transform:translateY(-8px)}60%{transform:translateY(0)}}",
    ".launch:focus-visible,button:focus-visible,textarea:focus-visible{outline:3px solid var(--launch);outline-offset:2px}",
    ".teaser{position:fixed;bottom:88px;" + side + ":20px;max-width:260px;background:#fff;color:#1f2937;border-radius:12px;padding:12px 34px 12px 14px;box-shadow:0 10px 30px rgba(0,0,0,.18);font-size:14px;line-height:1.4;cursor:pointer;z-index:2147483000}",
    ".teaser:after{content:'';position:absolute;bottom:-7px;" + side + ":26px;width:14px;height:14px;background:#fff;transform:rotate(45deg)}",
    ".teaser .tx{position:absolute;top:4px;right:4px;background:transparent;border:0;color:#6b7280;font-size:18px;line-height:1;padding:4px 6px;cursor:pointer;border-radius:6px}",
    ".panel{position:fixed;bottom:88px;" + side + ":20px;width:380px;max-width:calc(100vw - 24px);height:560px;max-height:calc(100vh - 110px);background:#fff;color:#1f2937;border:1px solid rgba(0,0,0,.08);border-radius:16px;box-shadow:0 16px 48px rgba(0,0,0,.24);display:none;flex-direction:column;overflow:hidden;z-index:2147483001;font-size:14.5px;line-height:1.5}",
    ".panel.open{display:flex}",
    "@media (max-width:480px){.panel{inset:0;width:100%;height:100%;max-width:none;max-height:none;border-radius:0;bottom:0}.launch.hide,.teaser.hide{display:none}.launch{bottom:16px;" + side + ":16px}.teaser{bottom:82px;" + side + ":16px}}",
    ".head{background:var(--brand);color:var(--on-brand);padding:14px 16px;display:flex;align-items:flex-start;justify-content:space-between;gap:8px}",
    ".head b{display:block;font:700 17px/1.2 " + HEAD + "}.head span{display:block;margin-top:2px;font-size:12.5px;opacity:.85}",
    ".head.solo{align-items:center}",
    ".x{background:transparent;border:0;color:inherit;cursor:pointer;font-size:24px;line-height:1;padding:2px 6px;border-radius:6px}",
    ".log{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px;background:var(--canvas)}",
    ".m{max-width:88%;padding:10px 13px;border-radius:12px;word-wrap:break-word}",
    ".m.u{align-self:flex-end;background:var(--accent);color:var(--on-accent);white-space:pre-wrap;border-bottom-right-radius:4px}",
    ".m.b{align-self:flex-start;background:#fff;border:1px solid rgba(0,0,0,.06);border-bottom-left-radius:4px}",
    ".m.e{align-self:flex-start;background:#fef2f2;border:1px solid #fecaca;color:#991b1b}",
    ".m p{margin:0 0 6px}.m p:last-child{margin:0}.m ul,.m ol{margin:4px 0 6px;padding-left:18px}",
    ".m code{background:#f3f4f6;padding:1px 4px;border-radius:4px;font-size:13px}",
    ".m a{color:inherit}",
    ".cite{font-size:10.5px;vertical-align:super;opacity:.7}",
    ".gen{margin-top:6px;padding:6px 8px;background:#f3f4f6;border-radius:6px;font-size:13.5px}",
    ".src{margin-top:8px;padding-top:6px;border-top:1px solid #f3f4f6;font-size:12px;color:#6b7280}",
    ".typing{align-self:flex-start;color:#6b7280;font-size:13px}",
    ".sugg{display:flex;flex-direction:column;align-items:flex-start;gap:6px}",
    ".sugg button{background:#fff;color:var(--brand);border:1.5px solid var(--accent);border-radius:12px;padding:8px 12px;font-size:13.5px;font-weight:600;cursor:pointer;text-align:left}",
    ".sugg button:hover{background:var(--accent);color:var(--on-accent)}",
    ".consent{padding:18px 16px;display:flex;flex-direction:column;gap:14px;font-size:13.5px;color:#374151;background:#fff;flex:1;overflow-y:auto}",
    ".consent .go{background:var(--accent);color:var(--on-accent);border:0;border-radius:12px;padding:12px 18px;font:700 15px/1 " + HEAD + ";cursor:pointer;align-self:flex-start}",
    ".consent a{color:var(--brand);font-weight:600}",
    "form{display:flex;gap:8px;padding:10px;border-top:1px solid #e5e7eb;background:#fff}",
    "textarea{flex:1;resize:none;border:1.5px solid #d1d5db;border-radius:12px;padding:9px 11px;font-size:14px;min-height:42px;max-height:120px;color:#1f2937}",
    "textarea:focus{border-color:var(--accent);outline:none}",
    ".send{background:var(--accent);color:var(--on-accent);border:0;border-radius:12px;padding:0 16px;cursor:pointer;font:700 14px/1 " + HEAD + "}",
    ".send:disabled{opacity:.5;cursor:default}",
    ".foot{font-size:11px;color:#9ca3af;text-align:center;padding:0 0 8px;background:#fff}"
  ].join("");

  var host = document.createElement("div");
  host.setAttribute("data-zorah", "");
  [["--brand", CFG.color], ["--accent", CFG.accent], ["--launch", CFG.launcher]].forEach(function (v) {
    host.style.setProperty(v[0], v[1]);
    host.style.setProperty(v[0] === "--brand" ? "--on-brand" : v[0] === "--accent" ? "--on-accent" : "--on-launch", onAccent(v[1]));
  });
  host.style.setProperty("--canvas", CFG.canvas);
  var root = host.attachShadow({ mode: "open" });
  var ICON = "<svg width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true'><path d='M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z'/></svg>";
  root.innerHTML =
    "<style>" + css + "</style>" +
    (CFG.teaser ? "<div class='teaser' role='button' tabindex='0' hidden>" + esc(CFG.teaser) + "<button class='tx' type='button' aria-label='Dismiss'>&times;</button></div>" : "") +
    "<button class='launch" + (CFG.label ? "" : " icon") + "' type='button' aria-label='" + esc(CFG.label || "Open chat") + "' aria-expanded='false'>" + ICON +
      (CFG.label ? "<span>" + esc(CFG.label) + "</span>" : "") + "</button>" +
    "<section class='panel' role='dialog' aria-label='" + esc(CFG.title) + " chat'>" +
      "<div class='head" + (CFG.subtitle ? "" : " solo") + "'><div><b>" + esc(CFG.title) + "</b>" + (CFG.subtitle ? "<span>" + esc(CFG.subtitle) + "</span>" : "") + "</div>" +
        "<button class='x' type='button' aria-label='Close chat'>&times;</button></div>" +
      "<div class='consent'></div>" +
      "<div class='log' aria-live='polite' hidden></div>" +
      "<form hidden><textarea rows='1' maxlength='1000' placeholder='Ask a question' aria-label='Your question'></textarea>" +
        "<button class='send' type='submit'>Send</button></form>" +
      "<div class='foot'>Powered by Zorah · Zero1</div>" +
    "</section>";

  var $ = function (s) { return root.querySelector(s); };
  var launch = $(".launch"), panel = $(".panel"), log = $(".log"), form = $("form"), ta = $("textarea"), send = $(".send"), consentBox = $(".consent");
  var busy = false;
  var showSources = true;   // the server can turn citations off per client (tenant setting show_sources)
  var strip = function (t) { return showSources ? t : t.replace(/ ?(\[\d+\])+/g, "").replace(/ ?\[\d*$/, ""); };  // also hides a half-streamed "[1"
  var conversationId = store.get("conv");
  var consented = store.get("consent") === "1";

  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;"); }
  function inline(s) {
    return s.replace(/`([^`]+)`/g, "<code>$1</code>")
            .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
            .replace(/\[(\d+)\]/g, "<span class='cite'>[$1]</span>")
            .replace(/\b(https:\/\/[^\s<)]+[^\s<).,])/g, "<a href='$1' target='_blank' rel='noopener noreferrer'>$1</a>")
            .replace(/\b([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})\b/gi, "<a href='mailto:$1'>$1</a>");
  }
  function render(md) {
    var lines = esc(md).split("\n"), out = [], list = null, para = [];
    function fp() { if (para.length) { var t = para.join("<br>"); out.push(/^General information:/.test(t) ? "<div class='gen'>" + inline(t) + "</div>" : "<p>" + inline(t) + "</p>"); para = []; } }
    function fl() { if (list) { out.push("<" + list.t + ">" + list.i.map(function (x) { return "<li>" + inline(x) + "</li>"; }).join("") + "</" + list.t + ">"); list = null; } }
    lines.forEach(function (l) {
      var ul = /^\s*[-*]\s+(.*)$/.exec(l), ol = /^\s*\d+\.\s+(.*)$/.exec(l);
      if (ul || ol) { fp(); var t = ul ? "ul" : "ol"; if (!list || list.t !== t) { fl(); list = { t: t, i: [] }; } list.i.push((ul || ol)[1]); }
      else if (!l.trim()) { fp(); fl(); }
      else { fl(); para.push(l); }
    });
    fp(); fl();
    return out.join("");
  }
  function add(cls, html) {
    var d = document.createElement("div");
    d.className = cls; d.innerHTML = html;
    log.appendChild(d); log.scrollTop = log.scrollHeight;
    return d;
  }
  function sources(cites) {
    if (!cites || !cites.length) return "";
    var seen = {}, names = [];
    cites.forEach(function (c) { var n = c.title || "Help article"; if (!seen[n]) { seen[n] = 1; names.push(esc(n)); } });
    return "<div class='src'>Sources: " + names.join(" · ") + "</div>";
  }
  function supportLine(email) {
    var e = email || CFG.supportEmail;
    return e ? " You can also email <a href='mailto:" + esc(e) + "'>" + esc(e) + "</a>." : "";
  }

  function showConsent() {
    consentBox.hidden = false; log.hidden = true; form.hidden = true;
    consentBox.innerHTML = "<div>" + esc(CFG.consent) + (CFG.privacyUrl ? " <a href='" + esc(CFG.privacyUrl) + "' target='_blank' rel='noopener noreferrer'>Privacy Policy</a>" : "") + "</div>" +
      "<button class='go' type='button'>Start chat</button>";
    consentBox.querySelector(".go").addEventListener("click", function () {
      consented = true; store.set("consent", "1"); showChat();
    });
  }
  function showChat() {
    consentBox.hidden = true; log.hidden = false; form.hidden = false;
    if (!log.children.length) {
      add("m b", "<p>" + esc(CFG.greeting) + "</p>");
      if (CFG.suggestions.length && !conversationId) {
        var box = add("sugg", CFG.suggestions.map(function (q) { return "<button type='button'>" + esc(q) + "</button>"; }).join(""));
        box.querySelectorAll("button").forEach(function (b) {
          b.addEventListener("click", function () { if (busy) return; box.remove(); ask(b.textContent); });
        });
      }
    }
    setTimeout(function () { ta.focus(); }, 0);
  }

  function open() {
    panel.classList.add("open"); launch.setAttribute("aria-expanded", "true"); launch.classList.add("hide");
    hideTeaser(true);
    consented ? showChat() : showConsent();
  }
  function close() {
    panel.classList.remove("open"); launch.setAttribute("aria-expanded", "false"); launch.classList.remove("hide"); launch.focus();
  }
  launch.addEventListener("click", function () { panel.classList.contains("open") ? close() : open(); });
  $(".x").addEventListener("click", close);
  root.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });

  async function ask(text, retried) {
    busy = true; send.disabled = true;
    if (!retried) add("m u", esc(text));
    var typing = add("typing", "Looking that up…");
    var body = { question: text, stream: true };
    if (conversationId) body.conversation_id = conversationId;
    else { body.consent = true; body.consent_text = CFG.consent; }
    var bubble = null;
    try {
      var res = await fetch(CFG.endpoint, { method: "POST", headers: { "Content-Type": "application/json", "x-api-key": KEY }, body: JSON.stringify(body) });
      var streamed = (res.headers.get("content-type") || "").indexOf("text/event-stream") === 0;
      if (!streamed) {
        // Errors before the answer starts come back as JSON with a status code.
        var data = await res.json().catch(function () { return {}; });
        typing.remove();
        if (res.status === 428) { consented = false; store.set("consent", null); showConsent(); return; }
        if (res.status === 404 && conversationId && !retried) { conversationId = null; store.set("conv", null); return ask(text, true); }
        if (res.status === 429) { add("m e", "You're sending messages quickly. Please wait a minute and try again." + supportLine(data.support_email)); return; }
        if (!res.ok || typeof data.answer !== "string") { add("m e", "Sorry, something went wrong." + supportLine(data.support_email)); return; }
        if (data.conversation_id) { conversationId = data.conversation_id; store.set("conv", conversationId); }
        if (data.show_sources === false) showSources = false;
        add("m b", render(strip(data.answer)) + (showSources ? sources(data.citations) : ""));
        return;
      }
      // Streaming: text appears as it is written; sources are added when it finishes.
      var reader = res.body.getReader(), dec = new TextDecoder(), buf = "", answer = "", tail = "", finished = false, pending = false;
      function paint() {
        pending = false;
        if (!bubble) { typing.remove(); bubble = add("m b", ""); }
        var nearBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 60;
        bubble.innerHTML = render(strip(answer)) + tail;
        if (nearBottom) log.scrollTop = log.scrollHeight;
      }
      function handle(event, d) {
        if (event === "meta") {
          if (d.show_sources === false) showSources = false;
          if (d.conversation_id) { conversationId = d.conversation_id; store.set("conv", conversationId); }
        }
        else if (event === "delta") { answer += d.t || ""; if (!pending) { pending = true; setTimeout(paint, 30); } }
        else if (event === "done") { finished = true; tail = showSources ? sources(d.citations) : ""; paint(); log.scrollTop = log.scrollHeight; }
        else if (event === "error") {
          finished = true; typing.remove();
          if (bubble && !answer) bubble.remove();
          add("m e", "Sorry, something went wrong." + supportLine(d.support_email));
        }
      }
      for (;;) {
        var r = await reader.read();
        if (r.done) break;
        buf += dec.decode(r.value, { stream: true });
        var i;
        while ((i = buf.indexOf("\n\n")) >= 0) {
          var chunk = buf.slice(0, i); buf = buf.slice(i + 2);
          var ev = "message", dl = [];
          chunk.split("\n").forEach(function (l) { if (l.indexOf("event:") === 0) ev = l.slice(6).trim(); else if (l.indexOf("data:") === 0) dl.push(l.slice(5).trim()); });
          if (!dl.length) continue;
          try { handle(ev, JSON.parse(dl.join(""))); } catch (e) {}
        }
      }
      if (!finished) {
        typing.remove();
        add("m e", (answer ? "The answer was cut off." : "Sorry, something went wrong.") + supportLine());
      }
    } catch (err) {
      typing.remove();
      add("m e", (bubble ? "The connection dropped before the answer finished." : "Couldn't connect. Check your connection and try again.") + supportLine());
    } finally {
      busy = false; send.disabled = false; ta.focus();
    }
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var t = ta.value.trim();
    if (!t || busy) return;
    ta.value = ""; ta.style.height = "";
    var sg = log.querySelector(".sugg"); if (sg) sg.remove();
    ask(t);
  });
  ta.addEventListener("keydown", function (e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); form.requestSubmit(); } });
  ta.addEventListener("input", function () { ta.style.height = "auto"; ta.style.height = Math.min(ta.scrollHeight, 120) + "px"; });

  // One-time prompt so visitors notice they can ask. Shown once per browser session, never while the chat is open.
  var teaser = $(".teaser");
  function hideTeaser(remember) {
    if (teaser) teaser.hidden = true;
    if (remember) store.set("teased", "1");
  }
  if (teaser) {
    teaser.addEventListener("click", function (e) { if (e.target.closest(".tx")) return; open(); });
    teaser.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } });
    teaser.querySelector(".tx").addEventListener("click", function (e) { e.stopPropagation(); hideTeaser(true); });
    if (store.get("teased") !== "1" && store.get("consent") !== "1") {
      setTimeout(function () {
        if (panel.classList.contains("open") || store.get("teased") === "1") return;
        teaser.hidden = false; launch.classList.add("nudge");
      }, CFG.teaserDelay);
    }
  }

  function mount() { document.body.appendChild(host); }
  document.body ? mount() : document.addEventListener("DOMContentLoaded", mount);

  window.Zorah = { _loaded: true, open: open, close: close };
})();
