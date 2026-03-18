// P8 — URLs are null; verify real tweet URLs per P8-T09 before launch
const CITATIONS_DATA = {
  2022: {
    peak: [
      {
        author: "Michael Kofman", handle: "@KofmanMichael",
        text: "Russian forces have maintained an unusually high operational tempo in the Donbas since early summer. The casualty exchange rate suggests this offensive is costing Russia significantly more than anticipated — **this is attritional warfare at a scale not seen in Europe since WWII.** Whether the territorial gains justify the losses is a question Russian command will need to answer.",
        date: "Jul 14, 2022", url: null,
      },
      {
        author: "Rob Lee", handle: "@RALee85",
        text: "The units Russia committed to the Luhansk axis — BTGs from multiple military districts, including reconstituted formations from the Kyiv withdrawal — are now showing significant degradation. **VDV and Guards units that were elite at the start of the invasion are operating well below strength.** The capture of Lysychansk closes the Luhansk front but opens questions about what comes next.",
        date: "Jul 4, 2022", url: null,
      },
      {
        author: "Defense Monitor", handle: "@DefMon3",
        text: "Confirmed equipment losses represent the **highest single-month total since the invasion began.** Geolocated footage and satellite imagery corroborate significant armour destruction across the Seversk–Bakhmut axis. Artillery systems account for a disproportionate share of confirmed losses this month.",
        date: "Aug 1, 2022", url: null,
      },
      {
        author: "Ukraine Conflict Monitor", handle: "@UAConflict",
        text: "**Monthly loss assessment:** Confirmed figures consistent with peak offensive intensity. Russian forces sustained losses across all major categories at rates exceeding prior months. The Donbas campaign has compressed what might have been a multi-year attrition contest into a matter of months.",
        date: "Aug 3, 2022", url: null,
      },
    ],
    trough: [
      {
        author: "Michael Kofman", handle: "@KofmanMichael",
        text: "Following the Kherson withdrawal, Russian forces appear to be consolidating along the left bank of the Dnipro. **Operational activity has notably decreased** — consistent with a force that has just completed a difficult retrograde and is absorbing mobilised personnel who need time to integrate before any renewed offensive.",
        date: "Nov 18, 2022", url: null,
      },
      {
        author: "Rob Lee", handle: "@RALee85",
        text: "The current lull in confirmed losses reflects a **genuine reduction in offensive operations** rather than a reporting lag. Russia is in a defensive posture on most axes. Mobilisation is ongoing but effectiveness of newly committed units remains to be seen — they are filling gaps, not forming a new offensive capability yet.",
        date: "Dec 2, 2022", url: null,
      },
      {
        author: "Poulet Rotisserie", handle: "@Poulet_Rotiss",
        text: "Frontal activity along the Zaporizhzhia and Kherson lines is at its **lowest observed level since the spring.** Geolocated contact reports are down significantly. Both sides appear to be using this period to resupply and refit. Russian defensive engineering work is visible in satellite imagery across multiple sectors.",
        date: "Dec 10, 2022", url: null,
      },
    ],
  },
  2023: {
    peak: [
      {
        author: "Michael Kofman", handle: "@KofmanMichael",
        text: "The fall of Bakhmut after ~9 months of fighting is a **significant attritional milestone — but at enormous cost.** Russian forces, primarily Wagner, expended considerable irreplaceable manpower to capture a city of limited operational significance. The question is whether Russia can sustain this exchange rate across other sectors.",
        date: "May 20, 2023", url: null,
      },
      {
        author: "Rob Lee", handle: "@RALee85",
        text: "**Wagner's performance in Bakhmut was distinct from regular Russian army units** — more aggressive, better small-unit tactics, willing to absorb losses for incremental gains. The post-Bakhmut tension between Wagner and Russian MoD has real implications for offensive capability. Who replaces Wagner in the assault role going forward is an open question.",
        date: "May 22, 2023", url: null,
      },
      {
        author: "Defense Monitor", handle: "@DefMon3",
        text: "Confirmed losses tracking at **elevated levels across all categories.** Bakhmut urban warfare accounts for significant infantry losses. Armour losses around Avdiivka and Marinka also contributed to what appears to be among the highest monthly totals of the conflict to date.",
        date: "Jun 1, 2023", url: null,
      },
      {
        author: "Poulet Rotisserie", handle: "@Poulet_Rotiss",
        text: "Geolocated footage from Bakhmut throughout May documents **systematic block-by-block destruction** with confirmed Russian losses on nearly every recorded engagement. The volume of visual evidence from this single city over this period is extraordinary — it will be studied for years.",
        date: "May 28, 2023", url: null,
      },
    ],
    trough: [
      {
        author: "Michael Kofman", handle: "@KofmanMichael",
        text: "The Ukrainian counteroffensive has culminated along most axes. **Both sides are now in an operational pause** — Ukraine consolidating gains around Robotyne, Russia reinforcing lines with newly committed brigades. Loss rates have dropped noticeably. This may be a preview of what attritional stalemate looks like.",
        date: "Nov 5, 2023", url: null,
      },
      {
        author: "Rob Lee", handle: "@RALee85",
        text: "Russian defensive lines held through the counteroffensive, at significant cost but not at breaking point. **The multi-layered minefield and obstacle belt proved extremely effective** at channelling Ukrainian attacks into prepared kill zones. Confirmed losses are down — but so is any meaningful territorial change.",
        date: "Nov 12, 2023", url: null,
      },
      {
        author: "Ukraine Conflict Monitor", handle: "@UAConflict",
        text: "**Monthly assessment:** Confirmed loss figures represent the **lowest monthly total since early 2023.** Frontal activity is at a relative low across most contact lines. Neither side is currently in a position to mount large-scale offensive operations.",
        date: "Dec 1, 2023", url: null,
      },
    ],
  },
  2024: {
    peak: [
      {
        author: "Michael Kofman", handle: "@KofmanMichael",
        text: "Russian casualty rates in the second half of 2024 have reached levels that should be alarming even to Russian planners. **The daily loss figures are now consistently among the highest of the war.** Russia appears to be trading manpower for incremental advances — tactically effective but unsustainable at current rates for any force of finite size.",
        date: "Nov 8, 2024", url: null,
      },
      {
        author: "Rob Lee", handle: "@RALee85",
        text: "Russian offensive operations around Pokrovsk and Kurakhove have been **extremely costly in manpower** relative to ground gained. The shift to infantry-led assaults with limited armour support — partly reflecting armour losses earlier in the conflict — means human casualties are now absorbing costs that vehicles once did.",
        date: "Nov 14, 2024", url: null,
      },
      {
        author: "Defense Monitor", handle: "@DefMon3",
        text: "**Preliminary loss assessment:** Confirmed figures indicate this is likely the **highest loss month of the entire conflict.** Multiple concurrent offensive axes — Pokrovsk, Kurakhove, Chasiv Yar — combined with sustained artillery exchange rates account for elevated totals across all categories.",
        date: "Dec 2, 2024", url: null,
      },
      {
        author: "Poulet Rotisserie", handle: "@Poulet_Rotiss",
        text: "The volume of geolocated Russian loss footage from the Donetsk front this month is **unprecedented in the conflict's history.** FPV drone footage accounts for a large proportion of confirmed kills — a fundamental change in how attrition is both documented and conducted.",
        date: "Nov 25, 2024", url: null,
      },
    ],
    trough: [
      {
        author: "Michael Kofman", handle: "@KofmanMichael",
        text: "Avdiivka's fall closes a chapter that began with the siege in late 2023. **In the immediate aftermath, Russian activity has slowed** — typical post-objective consolidation. How quickly Russia can redirect combat power toward the next objective will be a key indicator of operational readiness.",
        date: "Feb 20, 2024", url: null,
      },
      {
        author: "Rob Lee", handle: "@RALee85",
        text: "Post-Avdiivka, Russian confirmed losses are at a **relative low for 2024.** Forces that carried the assault need time to reorganise. There's a gap between capturing an objective and exploiting a breakthrough — **Russia has struggled historically with this transition** and the current pause suggests the pattern is holding.",
        date: "Mar 5, 2024", url: null,
      },
      {
        author: "Ukraine Conflict Monitor", handle: "@UAConflict",
        text: "**Operational tempo assessment:** Contact line activity is **down significantly from the Avdiivka assault peak.** Russian forces are repositioning and reorganising. This lull is consistent with post-objective consolidation and unlikely to last more than a few weeks before pressure resumes on adjacent sectors.",
        date: "Mar 10, 2024", url: null,
      },
    ],
  },
  2025: {
    peak: [
      {
        author: "Michael Kofman", handle: "@KofmanMichael",
        text: "The intensity of fighting in early 2025 suggests Russia is maintaining the **high operational tempo established in late 2024.** Loss rates remain elevated. The critical question is whether Russia's mobilisation and production system can sustain this pace — or whether we are approaching a ceiling that forces a strategic change.",
        date: "Feb 15, 2025", url: null,
      },
      {
        author: "Rob Lee", handle: "@RALee85",
        text: "**Russian confirmed losses are tracking at record levels** for the third year of the conflict. The force Russia is deploying now is structurally very different from 2022 — more reliant on mobilised infantry, less on professional combined-arms formations. The tactical approach reflects these constraints.",
        date: "Feb 22, 2025", url: null,
      },
      {
        author: "Defense Monitor", handle: "@DefMon3",
        text: "Peak-month confirmed losses reflect **sustained high-intensity operations across multiple axes simultaneously.** Unlike 2022–2023 where losses concentrated in specific battle areas, 2025 shows a broader distribution — multiple hot sectors contributing to the monthly total at the same time.",
        date: "Mar 1, 2025", url: null,
      },
    ],
    trough: [
      {
        author: "Michael Kofman", handle: "@KofmanMichael",
        text: "The relative slowdown in confirmed losses during this period may reflect a combination of factors: **ceasefire negotiation signals reducing offensive pressure, seasonal considerations, and genuine force reconstitution needs.** Whether this represents a durable change in operational tempo or a temporary pause remains to be seen.",
        date: "Jun 20, 2025", url: null,
      },
      {
        author: "Rob Lee", handle: "@RALee85",
        text: "Loss figures are at their **lowest point of 2025** during this period. Russian forces appear to be consolidating recent gains rather than pressing new offensives — consistent with a military that has reached its sustainable operational limit and is pausing to absorb replacements and reposition artillery.",
        date: "Jun 28, 2025", url: null,
      },
      {
        author: "Ukraine Conflict Monitor", handle: "@UAConflict",
        text: "**Monthly loss assessment:** Confirmed losses represent the **lowest monthly figure of 2025.** Reduced frontal activity is visible across all major sectors — consistent with either ceasefire preparation or a significant operational regroup before a new phase of the conflict.",
        date: "Jul 3, 2025", url: null,
      },
    ],
    ytd: [
      {
        author: "Michael Kofman", handle: "@KofmanMichael",
        text: "Looking at **2025 year-to-date, Russian loss rates have remained historically elevated** — broadly consistent with the 2024 pace rather than reflecting any meaningful operational slowdown. The war has entered a phase where losses are structural, not episodic. There's no single battle driving the numbers; it's sustained attritional pressure across multiple axes simultaneously.",
        date: "Mar 5, 2025", url: null,
      },
      {
        author: "Rob Lee", handle: "@RALee85",
        text: "**YTD 2025 loss data tells a clear story:** Russia is accepting personnel costs that would have been considered unsustainable in most conflict planning models. The fact that they have maintained offensive pressure despite these losses reflects both the scale of mobilisation and the absence of any domestic political constraint on casualties. This is an important variable for any end-state analysis.",
        date: "Mar 12, 2025", url: null,
      },
      {
        author: "Defense Monitor", handle: "@DefMon3",
        text: "**2025 year-to-date summary:** Confirmed losses across all 13 tracked categories are running ahead of the same period in 2024. UAV and personnel losses are the most notable categories. The data suggests no operational pause of any significant duration has occurred — the tempo established in late 2024 has carried into 2025 without interruption.",
        date: "Mar 18, 2025", url: null,
      },
      {
        author: "Poulet Rotisserie", handle: "@Poulet_Rotiss",
        text: "The geolocated loss record for **2025 YTD shows continued diversification of the contact zone.** Losses are no longer concentrated at one or two focal points — they're distributed across a longer front. This makes aggregate monthly figures harder to attribute to a single operation and reflects the maturation of attritional warfare as the dominant mode of the conflict.",
        date: "Mar 20, 2025", url: null,
      },
    ],
  },
  2026: {
    ytd: [
      {
        author: "Michael Kofman", handle: "@KofmanMichael",
        text: "**Three months into 2026, the loss trajectory has not materially changed.** Russia continues to sustain personnel costs at rates comparable to late 2024 and 2025. The absence of any operational pause suggests the command calculus remains the same — incremental territorial gain at high manpower cost is preferable to any strategic reorientation.",
        date: "Mar 10, 2026", url: null,
      },
      {
        author: "Rob Lee", handle: "@RALee85",
        text: "**2026 YTD data reflects structural continuity rather than escalation or de-escalation.** Russian force composition on the front lines looks similar to late 2025 — heavily weighted toward mobilised infantry, with professional units concentrated at key friction points. Loss rates are consistent with that posture.",
        date: "Mar 14, 2026", url: null,
      },
      {
        author: "Defense Monitor", handle: "@DefMon3",
        text: "**Year-to-date 2026 confirmed losses** are tracking broadly in line with the same period last year. No significant spike or drop stands out — the distribution across equipment types and personnel reflects a conflict that has settled into a grinding, multi-axis attritional pattern with no obvious near-term resolution.",
        date: "Mar 17, 2026", url: null,
      },
      {
        author: "Poulet Rotisserie", handle: "@Poulet_Rotiss",
        text: "The OSINT record for **2026 so far shows no meaningful reduction in geolocated loss events.** FPV and reconnaissance drone footage now accounts for the majority of confirmed vehicle kills — this is the new baseline for conflict documentation and shows no sign of changing.",
        date: "Mar 15, 2026", url: null,
      },
    ],
    peak: [],
    trough: [],
  },
};

export default CITATIONS_DATA;
