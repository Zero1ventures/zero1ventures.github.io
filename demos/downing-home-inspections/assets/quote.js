// Instant quote + booking request (Downing Home Inspections concept)
(function () {
  const P = window.DHI.pricing;
  const ORDER = ["general", "warranty11", "wind", "fourpoint", "wdo", "pool", "sewer", "hud"];
  const NAMES = {
    general: P.general.label, warranty11: P.warranty11.label, wind: P.wind.label, fourpoint: P.fourpoint.label,
    wdo: P.wdo.label, pool: P.pool.label, sewer: P.sewer.label, hud: P.hud.label
  };

  function sizePrice(cfg, sqft) {
    sqft = Math.max(400, Number(sqft) || 2000);
    for (const [max, price] of cfg.tiers) if (sqft <= max) return price;
    const [lastMax, lastPrice] = cfg.tiers[cfg.tiers.length - 1];
    return Math.round((lastPrice + (sqft - lastMax) * cfg.over) / 5) * 5;
  }

  // Returns { lines:[{key,label,price,note}], total, saved }
  function estimate(sel, prop) {
    const s = new Set(sel);
    if (s.has("general") && s.has("warranty11")) s.delete("warranty11");
    const lines = [];
    let saved = 0;
    const primary = s.has("general") ? "general" : s.has("warranty11") ? "warranty11" : null;
    const year = Number(prop.year) || 0;
    const age = year ? new Date().getFullYear() - year : 0;

    if (primary) {
      const cfg = P[primary];
      let price = sizePrice(cfg, prop.sqft);
      let note = (Number(prop.sqft) || 2000).toLocaleString() + " sq ft";
      if (cfg.ageOver40 && age > 40) { price += cfg.ageOver40; note += ", built " + year; }
      if (prop.type === "condo") { price -= 25; note += ", condo"; }
      lines.push({ key: primary, label: cfg.label, price, note });
    }
    const wantWind = s.has("wind"), want4 = s.has("fourpoint");
    if (!primary && wantWind && want4) {
      const sep = P.wind.standalone + P.fourpoint.standalone;
      lines.push({ key: "windfour", label: "Wind mitigation + 4-point bundle", price: P.windFourBundle, note: "insurance bundle" });
      saved += sep - P.windFourBundle;
    } else {
      for (const k of ["wind", "fourpoint"]) if (s.has(k)) {
        const price = primary ? P[k].addon : P[k].standalone;
        if (primary) saved += P[k].standalone - P[k].addon;
        lines.push({ key: k, label: P[k].label, price, note: primary ? "add-on rate" : "" });
      }
    }
    let first = !primary && !(wantWind || want4);
    for (const k of ["wdo", "pool", "sewer", "hud"]) if (s.has(k)) {
      const addon = !first;
      const price = addon ? P[k].addon : P[k].standalone;
      if (addon) saved += P[k].standalone - P[k].addon;
      lines.push({ key: k, label: P[k].label, price, note: addon ? "add-on rate" : "" });
      first = false;
    }
    const total = lines.reduce((a, l) => a + l.price, 0);
    return { lines, total, saved };
  }
  window.dhiEstimate = estimate;

  const $ = (q, el = document) => el.querySelector(q);
  const $$ = (q, el = document) => [...el.querySelectorAll(q)];
  const money = (n) => "$" + n.toLocaleString();

  // ---------- hero quick quote ----------
  const qq = $("#qq");
  if (qq) {
    const upd = () => {
      const svc = $("#qq-svc").value;
      const sel = svc === "insurance" ? ["wind", "fourpoint"] : [svc];
      const e = estimate(sel, { sqft: $("#qq-sqft").value, year: $("#qq-year").value });
      $("#qq-total").textContent = money(e.total);
      $("#qq-go").href = qq.dataset.quote + "?s=" + sel.join(",") + "&sqft=" + encodeURIComponent($("#qq-sqft").value) + "&year=" + encodeURIComponent($("#qq-year").value);
    };
    $$("select,input", qq).forEach((el) => el.addEventListener("input", upd));
    upd();
  }

  // ---------- wizard ----------
  const wiz = $("#wizard");
  if (!wiz) return;
  const state = { step: 0, mode: "booking" };
  const panes = $$(".pane", wiz);
  const bars = $$(".progress i", wiz);
  const params = new URLSearchParams(location.search);

  (params.get("s") || "").split(",").forEach((k) => { const cb = $(`input[name=svc][value="${k}"]`, wiz); if (cb) cb.checked = true; });
  if (params.get("sqft")) $("#sqft").value = params.get("sqft");
  if (params.get("year")) $("#year").value = params.get("year");

  const PRESETS = { buying: ["general", "wdo", "wind", "fourpoint"], insurance: ["wind", "fourpoint"], newbuild: ["warranty11"], other: [] };
  $$("input[name=reason]", wiz).forEach((r) => r.addEventListener("change", () => {
    $$("input[name=svc]", wiz).forEach((cb) => (cb.checked = PRESETS[r.value].includes(cb.value)));
  }));

  function selected() { return $$("input[name=svc]:checked", wiz).map((c) => c.value); }
  function prop() {
    return { sqft: $("#sqft").value, year: $("#year").value, type: $("#htype").value, address: $("#addr").value.trim() };
  }

  function show(i) {
    state.step = i;
    panes.forEach((p, n) => p.classList.toggle("on", n === i));
    bars.forEach((b, n) => b.classList.toggle("on", n <= i));
    wiz.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function renderEstimate() {
    const e = estimate(selected(), prop());
    const rows = e.lines.map((l) => `<tr><td>${l.label}${l.note ? `<br><small class="fine">${l.note}</small>` : ""}</td><td>${money(l.price)}</td></tr>`).join("");
    $("#est").innerHTML = `<table>${rows}<tr class="total"><td>Estimated total</td><td>${money(e.total)}</td></tr></table>` +
      (e.saved > 0 ? `<p class="save-note">You save ${money(e.saved)} by bundling.</p>` : "") +
      `<p class="fine">Estimate based on what you entered. Neil confirms the final price before your inspection; nothing is charged online.</p>`;
    state.est = e;
  }

  wiz.addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-go]");
    if (!b) return;
    ev.preventDefault();
    const to = b.dataset.go;
    const err = $(".err", panes[state.step]);
    if (err) err.textContent = "";
    if (to === "next") {
      if (state.step === 0 && !selected().length) { err.textContent = "Pick at least one inspection."; return; }
      if (state.step === 1) {
        if (!$("#addr").value.trim()) { err.textContent = "Enter the property address."; return; }
        renderEstimate();
      }
      show(state.step + 1);
    } else if (to === "back") show(state.step - 1);
    else if (to === "book" || to === "quote") {
      state.mode = to === "book" ? "booking" : "quote";
      $$(".book-only", wiz).forEach((el) => (el.hidden = state.mode !== "booking"));
      $("#submit-btn").textContent = state.mode === "booking" ? "Request this inspection" : "Send me this quote";
      show(3);
    }
  });

  // ---------- address suggest (Esri) ----------
  const addr = $("#addr"), list = $("#addr-list");
  let t, act = -1;
  addr.addEventListener("input", () => {
    clearTimeout(t);
    const q = addr.value.trim();
    if (q.length < 4) { list.innerHTML = ""; return; }
    t = setTimeout(async () => {
      try {
        const u = "https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/suggest?f=json&countryCode=USA&maxSuggestions=5&category=Address&location=-81.38,28.45&text=" + encodeURIComponent(q);
        const r = await fetch(u); const j = await r.json();
        act = -1;
        list.innerHTML = (j.suggestions || []).map((s) => `<li>${s.text.replace(/</g, "&lt;")}</li>`).join("");
      } catch (e) { list.innerHTML = ""; }
    }, 220);
  });
  list.addEventListener("mousedown", (e) => { const li = e.target.closest("li"); if (li) { addr.value = li.textContent; list.innerHTML = ""; } });
  addr.addEventListener("keydown", (e) => {
    const items = $$("li", list); if (!items.length) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault(); act = (act + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
      items.forEach((li, i) => li.classList.toggle("act", i === act));
    } else if (e.key === "Enter" && act >= 0) { e.preventDefault(); addr.value = items[act].textContent; list.innerHTML = ""; }
  });
  addr.addEventListener("blur", () => setTimeout(() => (list.innerHTML = ""), 150));

  // ---------- submit ----------
  function redact(s) {
    return (s || "")
      .replace(/\b\d{3}-?\d{2}-?\d{4}\b/g, "[redacted]")
      .replace(/\b(?:\d[ -]?){13,19}\b/g, (m) => (luhn(m.replace(/\D/g, "")) ? "[redacted]" : m));
  }
  function luhn(n) {
    let sum = 0, alt = false;
    for (let i = n.length - 1; i >= 0; i--) { let d = +n[i]; if (alt) { d *= 2; if (d > 9) d -= 9; } sum += d; alt = !alt; }
    return n.length >= 13 && sum % 10 === 0;
  }

  // ---------- phone + date rules ----------
  const cform = $("#contact-form");
  const digits = (v) => v.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
  const fmtPhone = (d) => d.length < 4 ? d : d.length < 7 ? `(${d.slice(0, 3)}) ${d.slice(3)}` : `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6, 10)}`;
  // US numbers: 10 digits, area code and exchange can't start with 0 or 1
  const validPhone = (d) => /^[2-9]\d{2}[2-9]\d{6}$/.test(d);
  cform.phone.setAttribute("inputmode", "tel");
  cform.phone.setAttribute("maxlength", "14");
  cform.phone.setAttribute("placeholder", "(407) 555-0123");
  cform.phone.addEventListener("input", (e) => {
    let d = e.target.value.replace(/\D/g, "");
    if (d.length === 11 && d[0] === "1") d = d.slice(1);
    e.target.value = fmtPhone(d.slice(0, 10));
  });
  const iso = (dt) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
  const today = iso(new Date());
  const maxDay = iso(new Date(Date.now() + 180 * 864e5));
  cform.pdate.min = today;
  cform.pdate.max = maxDay;

  cform.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const f = ev.target, err = $(".err", f), btn = $("#submit-btn");
    err.textContent = "";
    const name = f.name.value.trim(), email = f.email.value.trim();
    const pd = digits(f.phone.value);
    if (!name || (!pd && !email)) { err.textContent = "Add your name and a phone number or email."; return; }
    if (pd && !validPhone(pd)) { err.textContent = "Enter a full 10-digit phone number, like (407) 555-0123."; f.phone.focus(); return; }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { err.textContent = "Check the email address."; f.email.focus(); return; }
    const phone = pd ? fmtPhone(pd) : "";
    if (state.mode === "booking" && f.pdate.value) {
      if (f.pdate.value < today) { err.textContent = "Pick today or a future date."; f.pdate.focus(); return; }
      if (f.pdate.value > maxDay) { err.textContent = "Pick a date within the next 6 months, or call Neil for later dates."; f.pdate.focus(); return; }
    }
    if (!f.consent.checked) { err.textContent = "Please check the consent box so Neil can contact you."; return; }
    const p = prop();
    const body = {
      lead_type: state.mode,
      services: selected(),
      reason: ($("input[name=reason]:checked", wiz) || {}).value || null,
      address: p.address, sqft: Number(p.sqft) || null, year_built: Number(p.year) || null, home_type: p.type,
      estimate_total: state.est.total, estimate_lines: state.est.lines,
      name, phone, email, role: f.role.value,
      preferred_date: state.mode === "booking" ? f.pdate.value || null : null,
      time_window: state.mode === "booking" ? f.window.value : null,
      agent_name: f.agent.value.trim() || null,
      notes: redact(f.notes.value.trim()),
      consent_text: $("#consent-text").textContent.trim(),
      source_page: location.pathname,
      referrer: document.referrer || null
    };
    btn.disabled = true; btn.textContent = "Sending…";
    try {
      const r = await fetch(window.DHI.functionsUrl + "/dhi-leads", {
        method: "POST", headers: { "content-type": "application/json", "x-demo-pass": window.dhiPass() }, body: JSON.stringify(body)
      });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || r.status);
      $("#done-title").textContent = state.mode === "booking" ? "Request received" : "Quote sent";
      $("#done-msg").textContent = state.mode === "booking"
        ? `Thanks, ${name.split(" ")[0]}. Neil will call or text to confirm your date and time.`
        : `Thanks, ${name.split(" ")[0]}. Your ${money(state.est.total)} estimate is saved and Neil will follow up.`;
      show(4);
    } catch (e) {
      err.textContent = "Something went wrong sending that. Please call " + window.DHI.phone + ".";
      btn.disabled = false; btn.textContent = state.mode === "booking" ? "Request this inspection" : "Send me this quote";
    }
  });
})();
