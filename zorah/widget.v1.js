/*!
 * Zorah chat widget v1 — Zero One Response Automation Hub (Zero1 Ventures)
 *
 * Embed:
 *   <script src="https://www.zero1co.com/zorah/widget.v1.js" defer
 *           data-key="zpw_..."                      (required, public widget key)
 *           data-title="HeyCrew Help"               (optional)
 *           data-subtitle="Answers from our help articles"
 *           data-greeting="Hi! Ask me anything about HeyCrew."
 *           data-color="#4f46e5"                    (accent color)
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

  var CFG = {
    endpoint: ds.endpoint || "https://qnrhpgxndmktegittmii.supabase.co/functions/v1/ask",
    title: ds.title || "Help",
    subtitle: ds.subtitle || "Answers from our help articles",
    greeting: ds.greeting || "Hi! How can I help?",
    color: /^#[0-9a-f]{3,8}$/i.test(ds.color || "") ? ds.color : "#2563eb",
    position: ds.position === "left" ? "left" : "right",
    supportEmail: ds.supportEmail || "",
    privacyUrl: ds.privacyUrl || "",
    consent: ds.consent || "This chat is recorded and may be reviewed to improve our answers. Please don't share passwords, codes, payment details or other personal information. Answers come from our help articles and can't see your account."
  };

  var NS = "zorah_" + KEY.slice(-8);
  var store = {
    get: function (k) { try { return sessionStorage.getItem(NS + "_" + k); } catch (e) { return null; } },
    set: function (k, v) { try { v == null ? sessionStorage.removeItem(NS + "_" + k) : sessionStorage.setItem(NS + "_" + k, v); } catch (e) {} }
  };

  // Pick readable text for the accent color.
  function onAccent(hex) {
    var h = hex.replace("#", "");
    if (h.length === 3) h = h.split("").map(function (c) { return c + c; }).join("");
    var r = parseInt(h.substr(0, 2), 16), g = parseInt(h.substr(2, 2), 16), b = parseInt(h.substr(4, 2), 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) > 165 ? "#111827" : "#ffffff";
  }

  var side = CFG.position;
  var css = [
    ":host{all:initial}",
    "[hidden]{display:none!important}",
    "*{box-sizing:border-box;font-family:system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif}",
    ".launch{position:fixed;bottom:20px;" + side + ":20px;width:56px;height:56px;border-radius:50%;border:0;cursor:pointer;background:var(--accent);color:var(--on);box-shadow:0 6px 20px rgba(0,0,0,.18);display:flex;align-items:center;justify-content:center;z-index:2147483000}",
    ".launch:focus-visible,button:focus-visible,textarea:focus-visible{outline:3px solid #93c5fd;outline-offset:2px}",
    ".panel{position:fixed;bottom:88px;" + side + ":20px;width:380px;max-width:calc(100vw - 24px);height:560px;max-height:calc(100vh - 110px);background:#fff;color:#111827;border:1px solid #e5e7eb;border-radius:12px;box-shadow:0 12px 40px rgba(0,0,0,.2);display:none;flex-direction:column;overflow:hidden;z-index:2147483001;font-size:14.5px;line-height:1.5}",
    ".panel.open{display:flex}",
    "@media (max-width:480px){.panel{inset:0;width:100%;height:100%;max-width:none;max-height:none;border-radius:0;bottom:0}.launch.hide{display:none}}",
    ".head{background:var(--accent);color:var(--on);padding:12px 14px;display:flex;align-items:flex-start;justify-content:space-between;gap:8px}",
    ".head b{display:block;font-size:15px}.head span{font-size:12.5px;opacity:.9}",
    ".x{background:transparent;border:0;color:inherit;cursor:pointer;font-size:22px;line-height:1;padding:2px 6px;border-radius:6px}",
    ".log{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px;background:#f9fafb}",
    ".m{max-width:88%;padding:9px 12px;border-radius:10px;word-wrap:break-word}",
    ".m.u{align-self:flex-end;background:var(--accent);color:var(--on);white-space:pre-wrap}",
    ".m.b{align-self:flex-start;background:#fff;border:1px solid #e5e7eb}",
    ".m.e{align-self:flex-start;background:#fef2f2;border:1px solid #fecaca;color:#991b1b}",
    ".m p{margin:0 0 6px}.m p:last-child{margin:0}.m ul,.m ol{margin:4px 0 6px;padding-left:18px}",
    ".m code{background:#f3f4f6;padding:1px 4px;border-radius:4px;font-size:13px}",
    ".m a{color:inherit}",
    ".cite{font-size:10.5px;vertical-align:super;opacity:.7}",
    ".gen{margin-top:6px;padding:6px 8px;background:#f3f4f6;border-radius:6px;font-size:13.5px}",
    ".src{margin-top:8px;padding-top:6px;border-top:1px solid #f3f4f6;font-size:12px;color:#6b7280}",
    ".typing{align-self:flex-start;color:#6b7280;font-size:13px}",
    ".consent{padding:16px;display:flex;flex-direction:column;gap:12px;font-size:13.5px;color:#374151;background:#fff;flex:1;overflow-y:auto}",
    ".consent .go{background:var(--accent);color:var(--on);border:0;border-radius:8px;padding:10px 14px;font-size:14px;cursor:pointer;align-self:flex-start}",
    ".consent a{color:#2563eb}",
    "form{display:flex;gap:8px;padding:10px;border-top:1px solid #e5e7eb;background:#fff}",
    "textarea{flex:1;resize:none;border:1px solid #d1d5db;border-radius:8px;padding:9px 10px;font-size:14px;min-height:40px;max-height:120px;color:#111827}",
    ".send{background:var(--accent);color:var(--on);border:0;border-radius:8px;padding:0 14px;cursor:pointer;font-size:14px}",
    ".send:disabled{opacity:.5;cursor:default}",
    ".foot{font-size:11px;color:#9ca3af;text-align:center;padding:0 0 8px;background:#fff}"
  ].join("");

  var host = document.createElement("div");
  host.setAttribute("data-zorah", "");
  host.style.setProperty("--accent", CFG.color);
  host.style.setProperty("--on", onAccent(CFG.color));
  var root = host.attachShadow({ mode: "open" });
  root.innerHTML =
    "<style>" + css + "</style>" +
    "<button class='launch' type='button' aria-label='Open chat' aria-expanded='false'>" +
      "<svg width='26' height='26' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true'><path d='M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z'/></svg>" +
    "</button>" +
    "<section class='panel' role='dialog' aria-label='" + esc(CFG.title) + " chat'>" +
      "<div class='head'><div><b>" + esc(CFG.title) + "</b><span>" + esc(CFG.subtitle) + "</span></div>" +
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
    if (!log.children.length) add("m b", "<p>" + esc(CFG.greeting) + "</p>");
    setTimeout(function () { ta.focus(); }, 0);
  }

  function open() {
    panel.classList.add("open"); launch.setAttribute("aria-expanded", "true"); launch.classList.add("hide");
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
        add("m b", render(data.answer) + sources(data.citations));
        return;
      }
      // Streaming: text appears as it is written; sources are added when it finishes.
      var reader = res.body.getReader(), dec = new TextDecoder(), buf = "", answer = "", tail = "", finished = false, pending = false;
      function paint() {
        pending = false;
        if (!bubble) { typing.remove(); bubble = add("m b", ""); }
        var nearBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 60;
        bubble.innerHTML = render(answer) + tail;
        if (nearBottom) log.scrollTop = log.scrollHeight;
      }
      function handle(event, d) {
        if (event === "meta" && d.conversation_id) { conversationId = d.conversation_id; store.set("conv", conversationId); }
        else if (event === "delta") { answer += d.t || ""; if (!pending) { pending = true; requestAnimationFrame(paint); } }
        else if (event === "done") { finished = true; tail = sources(d.citations); paint(); log.scrollTop = log.scrollHeight; }
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
    ask(t);
  });
  ta.addEventListener("keydown", function (e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); form.requestSubmit(); } });
  ta.addEventListener("input", function () { ta.style.height = "auto"; ta.style.height = Math.min(ta.scrollHeight, 120) + "px"; });

  function mount() { document.body.appendChild(host); }
  document.body ? mount() : document.addEventListener("DOMContentLoaded", mount);

  window.Zorah = { _loaded: true, open: open, close: close };
})();
