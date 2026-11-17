// Demo passcode gate (soft lock). Loaded in <head> on every page.
(function () {
  document.documentElement.classList.add("js");
  const KEY = "dhi_pass";
  async function sha(s) {
    const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
    return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
  }
  async function check(pass) {
    return pass && (await sha(pass)) === window.DHI.passHash;
  }
  function unlock() {
    document.body.classList.remove("locked");
    const g = document.getElementById("gate");
    if (g) g.remove();
  }
  document.addEventListener("DOMContentLoaded", async () => {
    document.body.classList.add("locked");
    let stored = null;
    try { stored = sessionStorage.getItem(KEY); } catch (e) {}
    if (await check(stored)) return unlock();
    const g = document.createElement("div");
    g.id = "gate";
    g.innerHTML =
      '<form><h2>Concept preview</h2><p>This is a private concept demo by Zero1 Ventures. Enter the passcode to continue.</p>' +
      '<label class="field"><span>Passcode</span><input type="password" autocomplete="off" required></label>' +
      '<p class="err" aria-live="polite"></p><button class="btn btn-primary" type="submit">Open preview</button></form>';
    document.body.prepend(g);
    const input = g.querySelector("input");
    input.focus();
    g.querySelector("form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const v = input.value.trim();
      if (await check(v)) {
        try { sessionStorage.setItem(KEY, v); } catch (e) {}
        unlock();
      } else {
        g.querySelector(".err").textContent = "That passcode didn't match.";
        input.select();
      }
    });
  });
  window.dhiPass = function () {
    try { return sessionStorage.getItem(KEY) || ""; } catch (e) { return ""; }
  };
})();
