// Central Florida permit search directory (Downing Home Inspections concept)
(function () {
  const D = window.DHI_PERMITS;
  if (!D) return;
  const $ = (q) => document.querySelector(q);
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const norm = (s) => String(s || "").toLowerCase().replace(/^(city|town) of /, "").replace(/[^a-z0-9 ]/g, "").replace(/\bsaint\b/g, "st").replace(/\s+/g, " ").trim();
  const countyName = Object.fromEntries(D.counties.map((c) => [c.id, c.name]));
  let county = "";
  const reportHref = (e) => {
    const body = `Hi Neil,\n\nA permit search link for ${e.name} isn't working.\n\nLinks on the card:\n${e.links.map((l) => `- ${l.label}: ${l.url}`).join("\n")}\n\nWhat happened (optional):\n`;
    return `mailto:${D.email}?subject=${encodeURIComponent(`Broken permit link: ${e.name}`)}&body=${encodeURIComponent(body)}`;
  };

  function card(e, extra) {
    const links = e.links.map((l, i) =>
      `<a class="btn ${i === 0 ? "btn-primary" : "btn-ghost"} btn-sm" href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)}</a>`).join("");
    const notes = (e.notes || []).map((n) => `<li>${esc(n)}</li>`).join("");
    const phone = e.phone ? `<p class="pc-phone"><a href="tel:+1${e.phone.replace(/\D/g, "")}">${esc(e.phone)}</a>${e.phone_label ? ` <span>${esc(e.phone_label)}</span>` : ""}</p>` : "";
    return `<article class="pcard">
      <div class="pc-head"><h3>${esc(e.name)}</h3><span class="pc-tag">${e.kind === "county" ? "County · outside city limits" : "City · inside city limits"}</span></div>
      ${extra ? `<p class="pc-extra">${extra}</p>` : ""}
      <div class="pc-links">${links}</div>
      ${notes ? `<ul class="pc-notes">${notes}</ul>` : ""}
      ${phone}
      <p class="pc-ver"><a href="${reportHref(e)}">Report a broken link</a></p>
    </article>`;
  }

  function pendingCard(name, cid) {
    return `<article class="pcard pending">
      <div class="pc-head"><h3>${esc(name)}</h3><span class="pc-tag">City · inside city limits</span></div>
      <p>${esc(name)} handles permits inside its own limits, not ${esc(countyName[cid])}. We're still verifying its permit search link. Until then, call ${esc(name)}'s building department, or ask Neil to pull the history during your inspection.</p>
    </article>`;
  }

  function render() {
    const q = norm($("#ps-q").value);
    const out = [];
    let shown = 0;
    for (const c of D.counties) {
      if (county && c.id !== county) continue;
      const entries = D.entries.filter((e) => e.county === c.id);
      let cards = [];
      for (const e of entries) {
        if (!q || norm(e.name).includes(q) || norm(c.name).includes(q) || (e.keywords || []).some((k) => norm(k).includes(q))) { cards.push(card(e)); continue; }
        const hit = (e.aliases || []).find((a) => norm(a).includes(q));
        if (hit) cards.push(card(e, `${esc(hit)} is an unincorporated community, so permits there are usually handled by ${esc(c.name)}. Confirm on the property appraiser record, since some edges have been annexed into nearby cities.`));
      }
      const pend = c.pending.filter((p) => !q || norm(p).includes(q) || norm(c.name).includes(q));
      if (q) cards = cards.concat(pend.map((p) => pendingCard(p, c.id)));
      if (!cards.length && !(!q && pend.length)) continue;
      shown += cards.length;
      const pendNote = !q && pend.length
        ? `<p class="pc-pending">Also issue their own permits (links being verified): ${pend.map(esc).join(", ")}.</p>` : "";
      out.push(`<section class="pcounty"><h2>${esc(c.name)}</h2><div class="pgrid">${cards.join("")}</div>${pendNote}</section>`);
    }
    $("#ps-results").innerHTML = out.join("") ||
      `<div class="pcard pending"><h3>No match yet</h3><p>We cover Orange, Osceola, Seminole, Lake and Polk counties. Try the county name, or call Neil and he'll point you to the right office.</p></div>`;
    $("#ps-count").textContent = q ? `${shown} result${shown === 1 ? "" : "s"} for "${$("#ps-q").value.trim()}"` : "";
  }

  $("#ps-q").addEventListener("input", render);
  $("#ps-counties").addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    county = b.dataset.county;
    document.querySelectorAll("#ps-counties button").forEach((x) => x.classList.toggle("on", x === b));
    render();
  });
  const pre = new URLSearchParams(location.search).get("q");
  if (pre) $("#ps-q").value = pre;
  render();
})();
