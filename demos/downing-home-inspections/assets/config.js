// Downing Home Inspections concept — shared config
window.DHI = {
  functionsUrl: "https://zcbhcaqqreakfajvmpod.supabase.co/functions/v1",
  passHash: "a7e5f99378a481a04a9147e4e3ee27dbd14c77b52f86ae1abe1ceb054ce9df67",
  phone: "727-243-4158",
  phoneHref: "tel:+17272434158",
  email: "neil.downing@outlook.com",

  // PLACEHOLDER PRICING — replace with Neil's real prices before launch.
  pricing: {
    general: { label: "General home inspection", tiers: [[1500, 325], [2500, 375], [3500, 450], [5000, 550]], over: 0.12, ageOver40: 50 },
    warranty11: { label: "11-month builder warranty inspection", tiers: [[1500, 300], [2500, 350], [3500, 425], [5000, 525]], over: 0.11, ageOver40: 0 },
    wind: { label: "Wind mitigation", standalone: 100, addon: 75 },
    fourpoint: { label: "4-point inspection", standalone: 100, addon: 75 },
    windFourBundle: 150, // wind + 4-point together, without a general inspection
    pool: { label: "Pool & spa", standalone: 150, addon: 100 },
    wdo: { label: "WDO / termite report", standalone: 125, addon: 95 },
    sewer: { label: "Sewer camera inspection", standalone: 225, addon: 175 },
    hud: { label: "Manufactured home (HUD) certification", standalone: 250, addon: 200 }
  }
};
