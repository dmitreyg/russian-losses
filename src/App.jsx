import { useState, useEffect, useRef, createContext, useContext, useMemo } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine, Area, AreaChart, ComposedChart } from "recharts";
import T from "./data/translations.js";
import { THEMES, CATEGORY_KEYS, CAT_COLORS, MONTH_NAMES_EN, MONTH_NAMES_UK } from "./data/themes.js";
import Icons from "./data/icons.jsx";
import MILESTONES from "./data/milestones.js";
import CITATIONS_DATA from "./data/citations.js";

// ─────────────────────────────────────────────────────────────────────────────
// CONTEXTS
// ─────────────────────────────────────────────────────────────────────────────
const ThemeCtx = createContext("dark");
const LangCtx = createContext("en");
const useTheme = () => useContext(ThemeCtx);
const useLang = () => useContext(LangCtx);
const useT = () => { const l = useLang(); return T[l]; };

// ─────────────────────────────────────────────────────────────────────────────
// THEME TOKENS
// ─────────────────────────────────────────────────────────────────────────────
// DATA UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

function getYear(d) { return parseInt(d.split(".")[0]); }
function getMonth(d) { return parseInt(d.split(".")[1]); }
function parseDate(s) { const [y,m,d] = s.split(".").map(Number); return new Date(y,m-1,d); }
function findMissingDates(data) {
  const keys = Object.keys(data).sort();
  if (!keys.length) return [];
  const first = parseDate(keys[0]);
  const last = parseDate(keys[keys.length - 1]);
  const existing = new Set(keys);  
  const missing = [];
  for (let d = new Date(first); d <= last; d.setDate(d.getDate() + 1)) {
    const key = `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,"0")}.${String(d.getDate()).padStart(2,"0")}`;
    if (!existing.has(key)) missing.push(key);
  }
  return missing;
}
function formatNum(n) {
  if (!n) return "0";
  if (n >= 1000000) return (n/1000000).toFixed(1)+"M";
  if (n >= 1000) return (n/1000).toFixed(0)+"K";
  return n.toLocaleString();
}
function fmtFull(n) { return (n||0).toLocaleString(); }

function buildAggregates(data) {
  const byYear = {}, byYearMonth = {};
  Object.entries(data).forEach(([date, vals]) => {
    const y = getYear(date), m = getMonth(date);
    if (!byYear[y]) byYear[y] = {};
    if (!byYearMonth[y]) byYearMonth[y] = {};
    if (!byYearMonth[y][m]) byYearMonth[y][m] = {};
    CATEGORY_KEYS.forEach(k => {
      byYear[y][k] = (byYear[y][k]||0) + (vals[k]||0);
      byYearMonth[y][m][k] = (byYearMonth[y][m][k]||0) + (vals[k]||0);
    });
  });
  const cumulative = {};
  CATEGORY_KEYS.forEach(k => {
    cumulative[k] = Object.values(data).reduce((s,d) => s+(d[k]||0), 0);
  });
  return { byYear, byYearMonth, cumulative };
}

function linearRegression(ys) {
  const n = ys.length;
  if (n < 2) return { m: 0, b: ys[0]||0 };
  const xs = ys.map((_,i) => i);
  const mx = xs.reduce((a,b)=>a+b,0)/n;
  const my = ys.reduce((a,b)=>a+b,0)/n;
  const num = xs.reduce((s,x,i) => s+(x-mx)*(ys[i]-my), 0);
  const den = xs.reduce((s,x) => s+(x-mx)**2, 0);
  const m = den ? num/den : 0;
  return { m, b: my - m*mx };
}

function buildForecast(byYearMonth, fromMonth, fromYear, toMonth, toYear) {
  const allYears = Object.keys(byYearMonth).map(Number).sort();
  const history = [];
  allYears.forEach(y => {
    for (let m = 1; m <= 12; m++) {
      if (byYearMonth[y]?.[m]) history.push({ y, m, ...byYearMonth[y][m] });
    }
  });
  const trailing = history.slice(-24);

  const forecast = [];
  let cur = { y: fromYear, m: fromMonth };
  while (cur.y < toYear || (cur.y === toYear && cur.m <= toMonth)) {
    const point = { year: cur.y, month: cur.m, forecast: true };
    CATEGORY_KEYS.forEach(k => {
      const vals = trailing.map(h => h[k] || 0);
      const overallAvg = vals.reduce((a, b) => a + b, 0) / (vals.length || 1);

      // seasonal index: for each calendar month, avg ratio to overall mean
      const seasonalIndex = {};
      for (let mo = 1; mo <= 12; mo++) {
        const monthVals = trailing.filter(h => h.m === mo).map(h => h[k] || 0);
        seasonalIndex[mo] = monthVals.length
          ? (monthVals.reduce((a, b) => a + b, 0) / monthVals.length) / (overallAvg || 1)
          : 1;
      }

      // deseasonalize history, fit trend on deseasonalized values
      const deseason = vals.map((v, i) => v / (seasonalIndex[trailing[i].m] || 1));
      const { m: slope, b: intercept } = linearRegression(deseason);
      const idx = trailing.length + forecast.length;
      const trendVal = Math.max(0, slope * idx + intercept);

      // reapply seasonal multiplier for the forecast month
      const val = Math.max(0, Math.round(trendVal * (seasonalIndex[cur.m] || 1)));

      // confidence band: use std dev of this calendar month's historical values
      const monthHistorical = trailing.filter(h => h.m === cur.m).map(h => h[k] || 0);
      let band = val * 0.15;
      if (monthHistorical.length > 1) {
        const avg = monthHistorical.reduce((a, b) => a + b, 0) / monthHistorical.length;
        const variance = monthHistorical.reduce((s, v) => s + (v - avg) ** 2, 0) / monthHistorical.length;
        band = Math.sqrt(variance);
      }

      point[k] = val;
      point[k + "_lo"] = Math.max(0, Math.round(val - band));
      point[k + "_hi"] = Math.round(val + band);
    });
    forecast.push(point);
    cur.m++;
    if (cur.m > 12) { cur.m = 1; cur.y++; }
  }
  return forecast;
}

// ─────────────────────────────────────────────────────────────────────────────
// HOOKS
// ─────────────────────────────────────────────────────────────────────────────
function useCountUp(target, duration=1600) {
  const [val, setVal] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    if (!target) return;
    cancelAnimationFrame(ref.current);
    const start = performance.now();
    const tick = now => {
      const t = Math.min((now-start)/duration, 1);
      const ease = 1 - Math.pow(1-t, 4);
      setVal(Math.floor(ease * target));
      if (t < 1) ref.current = requestAnimationFrame(tick);
    };
    ref.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(ref.current);
  }, [target]);
  return val;
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────
function AnimNum({ v }) { const n = useCountUp(v||0); return <span>{n.toLocaleString()}</span>; }

function SectionLabel({ children }) {
  const th = THEMES[useTheme()];
  return (
    <div style={{ fontSize:10, letterSpacing:4, textTransform:"uppercase", color:th.dim,
      marginBottom:18, display:"flex", alignItems:"center", gap:12 }}>
      {children}
      <div style={{ flex:1, height:1, background:th.border }} />
    </div>
  );
}

function Panel({ children, style={} }) {
  const th = THEMES[useTheme()];
  return <div style={{ background:th.panel, border:`1px solid ${th.border}`, borderRadius:12, padding:"24px", ...style }}>{children}</div>;
}

function DarkTooltip({ active, payload, label }) {
  const th = THEMES[useTheme()];
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:th.panel, border:`1px solid ${th.border}`, padding:"10px 14px", borderRadius:8, fontFamily:"'Inter',sans-serif", fontSize:12 }}>
      <div style={{ color:th.text, fontWeight:700, marginBottom:4 }}>{label}</div>
      {payload.map((p,i) => <div key={i} style={{ color:p.color||th.accent }}>{p.name}: {(p.value||0).toLocaleString()}</div>)}
    </div>
  );
}

function CitationCard({ author, handle, text, date, url }) {
  const th = THEMES[useTheme()];
  return (
    <div style={{ background:th.panel, border:`1px solid ${th.border}`, borderRadius:10,
      padding:"16px 18px", position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", top:0, left:0, right:0, height:2,
        background:`linear-gradient(90deg, ${th.accent}, transparent)` }} />
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
        <div style={{ width:32, height:32, borderRadius:"50%",
          background:`linear-gradient(135deg, ${th.panel2}, ${th.border})`,
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:11, fontWeight:700, color:th.accent, flexShrink:0 }}>
          {author.split(" ").map(w=>w[0]).join("").slice(0,2)}
        </div>
        <div>
          <div style={{ fontSize:12, fontWeight:700, color:th.text }}>{author}</div>
          <div style={{ fontSize:10, color:th.dim }}>{handle}</div>
        </div>
      </div>
      <div style={{ fontSize:12, color:th.dim, lineHeight:1.7, marginBottom:10 }}
        dangerouslySetInnerHTML={{ __html: text.replace(/\*\*(.*?)\*\*/g, `<span style="color:${th.text};font-weight:600">$1</span>`) }} />
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div style={{ fontSize:10, color:th.muted, fontFamily:"'JetBrains Mono',monospace" }}>{date}</div>
        {url && <a href={url} target="_blank" rel="noopener noreferrer"
          style={{ fontSize:10, color:th.dim, textDecoration:"none" }}>𝕏 View →</a>}
      </div>
    </div>
  );
}

function PlaceholderCitations({ label }) {
  const th = THEMES[useTheme()];
  const t = useT();
  return (
    <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
      {[1,2,3].map(i => (
        <div key={i} style={{ background:th.panel, border:`1px dashed ${th.border}`,
          borderRadius:10, padding:"20px", textAlign:"center" }}>
          <div style={{ fontSize:9, letterSpacing:2, textTransform:"uppercase",
            color:th.gold, marginBottom:8 }}>⏳ {t.citationPlaceholder}</div>
          <div style={{ fontSize:11, color:th.dim }}>{label}</div>
        </div>
      ))}
    </div>
  );
}

function CitationsGrid({ citations, label }) {
  if (!citations || citations.length === 0) return <PlaceholderCitations label={label} />;
  return (
    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:12 }}>
      {citations.map((c, i) => <CitationCard key={i} {...c} />)}
    </div>
  );
}

function MiniBarChart({ monthlyData, peakMonth, troughMonth, catKey, lang }) {
  const th = THEMES[useTheme()];
  const months = Array.from({length:12},(_,i)=>i+1);
  const vals = months.map(m => monthlyData[m]?.[catKey]||0);
  const max = Math.max(...vals, 1);
  const mnames = lang==="ua" ? MONTH_NAMES_UK : MONTH_NAMES_EN;
  return (
    <div style={{ display:"flex", alignItems:"flex-end", gap:3, height:52, marginTop:16 }}>
      {months.map(m => {
        const h = (vals[m-1]/max)*100;
        const isPeak = m === peakMonth;
        const isTrough = m === troughMonth;
        const color = isPeak ? th.spike : isTrough ? th.trough : th.muted;
        return (
          <div key={m} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:2 }}>
            <div style={{ width:"100%", height:`${Math.max(h,3)}%`, background:color,
              borderRadius:"2px 2px 0 0", minHeight:3,
              boxShadow: isPeak ? `0 0 8px ${th.spike}66` : isTrough ? `0 0 8px ${th.trough}44` : "none" }} />
            <div style={{ fontSize:7, color: isPeak||isTrough ? color : th.muted }}>
              {mnames[m-1]}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MilestoneTimeline({ events }) {
  const th = THEMES[useTheme()];
  const t = useT();
  return (
    <div style={{ position:"relative", padding:"32px 0 8px" }}>
      <div className="milestone-list-line" style={{ position:"absolute", left:0, right:0, top:"50%", height:1,
        background:th.border, transform:"translateY(-50%)" }} />
      <div className="milestone-list" style={{ position:"relative" }}>
        {events.map((ev, i) => (
          <div key={i} className="milestone-item" style={{ flex:1, display:"flex", flexDirection:"column",
            alignItems:"center", gap:8, ...(i%2===0 ? {} : {flexDirection:"column-reverse"}) }}>
            {i%2===0 ? (
              <>
                <div style={{ background:th.panel, border:`1px solid ${th.border}`,
                  borderRadius:8, padding:"10px 12px", textAlign:"center" }}>
                  <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9,
                    color:ev.red ? th.spike : th.accent, marginBottom:4 }}>
                    {t.warDay} {ev.day}
                  </div>
                  <div style={{ fontSize:10, color:th.dim, lineHeight:1.4 }}>{ev.event}</div>
                </div>
                <div className="milestone-dot" style={{ width:10, height:10, borderRadius:"50%",
                  background: ev.red ? th.spike : th.accent,
                  border:`2px solid ${th.bg}`, flexShrink:0, zIndex:1 }} />
                <div className="milestone-spacer" style={{ height:24 }} />
              </>
            ) : (
              <>
                <div className="milestone-spacer" style={{ height:24 }} />
                <div className="milestone-dot" style={{ width:10, height:10, borderRadius:"50%",
                  background: ev.red ? th.spike : th.accent,
                  border:`2px solid ${th.bg}`, flexShrink:0, zIndex:1 }} />
                <div style={{ background:th.panel, border:`1px solid ${th.border}`,
                  borderRadius:8, padding:"10px 12px", textAlign:"center" }}>
                  <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9,
                    color:ev.red ? th.spike : th.accent, marginBottom:4 }}>
                    {t.warDay} {ev.day}
                  </div>
                  <div style={{ fontSize:10, color:th.dim, lineHeight:1.4 }}>{ev.event}</div>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// HOMEPAGE
// ─────────────────────────────────────────────────────────────────────────────
function HomePage({ rawData, agg, years, setPage }) {
  const th = THEMES[useTheme()];
  const lang = useLang();
  const t = useT();
  const allDates = Object.keys(rawData).sort();
  const lastDate = parseDate(allDates[allDates.length-1]);
  const firstDate = parseDate(allDates[0]);
  //const warDays_old = Math.floor((lastDate-firstDate)/86400000)+1; //  
  const warStart = new Date(2022, 1, 24); // Feb 24, 2022
  const warDays = Math.floor((Date.now()-warStart)/86400000)+1;
  const warDaysCount = useCountUp(warDays, 2000);
  const personnelCount = useCountUp(agg.cumulative.personnel, 1800);
  const mnames = lang==="ua" ? MONTH_NAMES_UK : MONTH_NAMES_EN;

  const yoyData = years.map(y => ({
    year: String(y), personnel: agg.byYear[y]?.personnel||0,
  }));

  const monthlyTrend = [];
  years.forEach(y => {
    for (let m=1; m<=12; m++) {
      if (agg.byYearMonth[y]?.[m]) {
        monthlyTrend.push({
          label:`${mnames[m-1]} ${y}`,
          personnel: agg.byYearMonth[y][m].personnel||0,
          uav: agg.byYearMonth[y][m].uav||0,
        });
      }
    }
  });
  const trendSlice = monthlyTrend.slice(-24);
  const maxCat = Math.max(...CATEGORY_KEYS.map(k => agg.cumulative[k]||0));

  return (
    <div style={{ animation:"fadeIn 0.5s ease both" }}>
      {/* Hero */}
      <div style={{ padding:"72px 36px 52px", borderBottom:`1px solid ${th.border}`, position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", inset:0, background:`radial-gradient(ellipse 60% 50% at 10% 50%, ${th.accent}08, transparent), radial-gradient(ellipse 40% 60% at 90% 20%, ${th.spike}05, transparent)`, pointerEvents:"none" }} />
        <div style={{ position:"absolute", right:-30, top:-30, fontSize:200, fontWeight:800, color:th.grain, fontFamily:"'Inter',sans-serif", pointerEvents:"none", userSelect:"none", lineHeight:1 }}>RU</div>
        <div style={{ maxWidth:1100, margin:"0 auto", position:"relative" }}>
          <div style={{ fontSize:10, letterSpacing:4, color:th.dim, textTransform:"uppercase", marginBottom:20 }}>
            {t.pageTitle.toLocaleString()}            
          </div>
          <div className="hero-grid">
            <div>
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:"clamp(52px,8vw,96px)", fontWeight:800, lineHeight:.88, letterSpacing:-3, color:th.text, marginBottom:10 }}>
                {personnelCount.toLocaleString()}
              </div>
              <div style={{ fontSize:11, letterSpacing:3, textTransform:"uppercase", color:th.dim, marginBottom:24 }}>{t.personnelLosses}</div>
              <div style={{ fontSize:13, color:th.dim, lineHeight:1.8 }}>
                {t.comprehensiveText}<br/>
                {t.dataSourcedText} 
                <span style={{ color:th.accent }}>{t.dateRangeText}</span>
              </div>
              <div className="daw-mobile">
                <div style={{ fontSize:10, letterSpacing:3, color:th.dim, textTransform:"uppercase", marginBottom:6 }}>{t.daysOfWar}</div>
                <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:36, fontWeight:600, color:th.spike, lineHeight:1 }}>
                  {warDaysCount.toLocaleString()}
                </div>
              </div>
            </div>
            <div className="daw-desktop" style={{ textAlign:"right" }}>
              <div style={{ fontSize:10, letterSpacing:3, color:th.dim, textTransform:"uppercase", marginBottom:8 }}>{t.daysOfWar}</div>
              <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:52, fontWeight:600, color:th.spike, lineHeight:1 }}>
                {warDaysCount.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth:1100, margin:"0 auto", padding:"44px 36px 80px" }}>
        {/* Cumulative grid */}
        <SectionLabel>{t.allTimeCumulative}</SectionLabel>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))", gap:10, marginBottom:52 }}>
          {CATEGORY_KEYS.filter(k => agg.cumulative[k]>0).map((k,i) => {
            const Icon = Icons[k];
            const catLabel = t[k] || k;
            return (
              <div key={k} style={{ background:th.panel, border:`1px solid ${th.border}`, borderRadius:10, padding:"16px 16px" }}>
                <div style={{ color:CAT_COLORS[i%CAT_COLORS.length], marginBottom:8, opacity:.8 }}>
                  <Icon s={18} c={CAT_COLORS[i%CAT_COLORS.length]} />
                </div>
                <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:22, fontWeight:600, color:th.text, lineHeight:1, marginBottom:4 }}>
                  {formatNum(agg.cumulative[k])}
                </div>
                <div style={{ fontSize:9, color:th.dim, letterSpacing:1, textTransform:"uppercase" }}>{catLabel}</div>
              </div>
            );
          })}
        </div>

        {/* Latest daily report */}
        {(() => {
          const lastDay = rawData[allDates[allDates.length-1]];
          const dateLabel = lastDate.toLocaleDateString(lang==="ua" ? "uk-UA" : "en-US", { day:"numeric", month:"long", year:"numeric" });
          const hasAny = CATEGORY_KEYS.some(k => lastDay[k] > 0);
          if (!hasAny) return null;
          return (
            <>
              <SectionLabel>
                {t.latestDaily}
                <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10, color:th.accent, letterSpacing:1, textTransform:"none" }}>{dateLabel}</span>
              </SectionLabel>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))", gap:10, marginBottom:52 }}>
                {CATEGORY_KEYS.filter(k => lastDay[k] > 0).map((k,i) => {
                  const Icon = Icons[k];
                  return (
                    <div key={k} style={{ background:th.panel, border:`1px solid ${th.border}`, borderRadius:10, padding:"16px 16px" }}>
                      <div style={{ marginBottom:8 }}>
                        <Icon s={18} c={CAT_COLORS[i%CAT_COLORS.length]} />
                      </div>
                      <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:22, fontWeight:600, color:th.text, lineHeight:1, marginBottom:4 }}>
                        +{lastDay[k].toLocaleString()}
                      </div>
                      <div style={{ fontSize:9, color:th.dim, letterSpacing:1, textTransform:"uppercase" }}>{t[k]||k}</div>
                    </div>
                  );
                })}
              </div>
            </>
          );
        })()}

        {/* Charts row */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))", gap:24, marginBottom:44 }}>
          <Panel>
            <div style={{ fontSize:10, letterSpacing:3, color:th.dim, textTransform:"uppercase", marginBottom:18 }}>{t.byYear}</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={yoyData} margin={{top:0,right:0,bottom:0,left:-20}}>
                <XAxis dataKey="year" tick={{fill:th.dim,fontSize:11,fontFamily:"'Inter',sans-serif"}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fill:th.muted,fontSize:9}} axisLine={false} tickLine={false} tickFormatter={formatNum}/>
                <Tooltip content={<DarkTooltip/>}/>
                <Bar dataKey="personnel" name={t.personnel} radius={[3,3,0,0]}>
                  {yoyData.map((_, i) => <Cell key={i} fill={i===yoyData.length-1 ? th.spike : th.accent}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Panel>
          <Panel>
            <div style={{ fontSize:10, letterSpacing:3, color:th.dim, textTransform:"uppercase", marginBottom:18 }}>{t.monthlyTrend}</div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={trendSlice} margin={{top:0,right:0,bottom:0,left:-20}}>
                <XAxis dataKey="label" tick={false} axisLine={false} tickLine={false}/>
                <YAxis tick={{fill:th.muted,fontSize:9}} axisLine={false} tickLine={false} tickFormatter={formatNum}/>
                <Tooltip content={<DarkTooltip/>}/>
                <Line type="monotone" dataKey="personnel" name={t.personnel} stroke={th.accent} strokeWidth={2} dot={false}/>
                <Line type="monotone" dataKey="uav" name={t.uav} stroke={th.spike} strokeWidth={1.5} dot={false} strokeDasharray="4 2"/>
              </LineChart>
            </ResponsiveContainer>
          </Panel>
        </div>

        {/* Category bars */}
        <Panel style={{ marginBottom:44 }}>
          <div style={{ fontSize:10, letterSpacing:3, color:th.dim, textTransform:"uppercase", marginBottom:20 }}>{t.allCategories}</div>
          <div className="cat-grid">
            {CATEGORY_KEYS.filter(k=>agg.cumulative[k]>0).map((k,i) => {
              const Icon = Icons[k];
              const pct = (agg.cumulative[k]/maxCat)*100;
              return (
                <div key={k} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                  <Icon s={16} c={th.dim}/>
                  <div style={{ color:th.dim, fontSize:10, letterSpacing:1, textTransform:"uppercase", width:110, flexShrink:0 }}>{t[k]||k}</div>
                  <div style={{ flex:1, height:3, background:th.muted+"44", borderRadius:2 }}>
                    <div style={{ width:`${pct}%`, height:"100%", background:`linear-gradient(90deg,${th.accent},${th.accent}88)`, borderRadius:2 }}/>
                  </div>
                  <div style={{ color:th.text, fontSize:11, fontFamily:"'JetBrains Mono',monospace", width:65, textAlign:"right", fontWeight:600 }}>
                    {formatNum(agg.cumulative[k])}
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        {/* Year cards */}
        <SectionLabel>{t.exploreByYear}</SectionLabel>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(190px,1fr))", gap:14 }}>
          {years.map((y,i) => {
            const total = agg.byYear[y]?.personnel||0;
            const prev = i>0 ? agg.byYear[years[i-1]]?.personnel||0 : 0;
            const delta = prev ? ((total-prev)/prev*100).toFixed(1) : null;
            const now = new Date();
            const isCurrentYear = y === now.getFullYear();
            const isForecast = y > now.getFullYear();
            return (
              <div key={y} onClick={() => setPage(String(y))}
                style={{ background:th.panel, border:`1px solid ${th.border}`, borderRadius:12,
                  padding:"24px 20px", cursor:"pointer", transition:"all 0.2s", position:"relative", overflow:"hidden" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor=th.accent+"44"; e.currentTarget.style.background=th.panel2; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor=th.border; e.currentTarget.style.background=th.panel; }}>
                <div style={{ position:"absolute", top:0, right:0, width:60, height:60,
                  background:`radial-gradient(circle at top right, ${th.accent}0a, transparent 70%)` }}/>
                <div style={{ fontSize:9, letterSpacing:3, color:th.dim, textTransform:"uppercase", marginBottom:8 }}>
                  {isForecast ? t.forecastYear : isCurrentYear ? t.partialYear : t.fullYear}
                </div>
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:34, fontWeight:800, color:th.text, lineHeight:1, marginBottom:8 }}>
                  {formatNum(total)}
                </div>
                <div style={{ color:th.dim, fontSize:10, letterSpacing:1, textTransform:"uppercase", marginBottom:10 }}>{t.personnelLosses}</div>
                {delta && (
                  <div style={{ display:"inline-flex", alignItems:"center", gap:4, fontSize:11,
                    color: parseFloat(delta)>0 ? th.spike : th.trough,
                    background: parseFloat(delta)>0 ? th.spike+"11" : th.trough+"11",
                    padding:"3px 10px", borderRadius:20, border:`1px solid ${parseFloat(delta)>0 ? th.spike+"33" : th.trough+"33"}` }}>
                    {parseFloat(delta)>0?"▲":"▼"} {Math.abs(delta)}% {t.vsYear} {y-1}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ borderTop:`1px solid ${th.border}`, padding:"20px 36px", textAlign:"center" }}>
        <div style={{ fontSize:10, color:th.muted, letterSpacing:1, fontFamily:"'JetBrains Mono',monospace" }}>{t.dataSource}</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// YEAR PAGE
// ─────────────────────────────────────────────────────────────────────────────
function YearPage({ year, agg, rawData, prevYear }) {
  const th = THEMES[useTheme()];
  const lang = useLang();
  const t = useT();
  const [activeCat, setActiveCat] = useState("personnel");
  const mnames = lang==="ua" ? MONTH_NAMES_UK : MONTH_NAMES_EN;
  const now = new Date();
  const isCurrentYear = year === now.getFullYear();
  const isForecast = year > now.getFullYear();

  const yearData = agg.byYear[year] || {};
  const prevData = prevYear ? agg.byYear[prevYear] || {} : null;
  const monthlyData = agg.byYearMonth[year] || {};

  // Find peak & trough months for activeCat
  const monthlyVals = Object.entries(monthlyData).map(([m,v]) => ({ m:parseInt(m), v:v[activeCat]||0 }));
  const peakMonth = monthlyVals.reduce((a,b) => b.v>a.v?b:a, {m:1,v:0}).m;
  const troughMonth = monthlyVals.reduce((a,b) => b.v<a.v?b:a, {m:1,v:999999}).m;

  // Personnel-based peak & trough — fixed reference for citation context
  const personnelVals = Object.entries(monthlyData).map(([m,v]) => ({ m:parseInt(m), v:v.personnel||0 }));
  const personnelPeakMonth = personnelVals.reduce((a,b) => b.v>a.v?b:a, {m:1,v:0}).m;
  const personnelTroughMonth = personnelVals.reduce((a,b) => b.v<a.v?b:a, {m:1,v:999999}).m;
  const peakVal = monthlyData[peakMonth]?.[activeCat]||0;
  const troughVal = monthlyData[troughMonth]?.[activeCat]||0;

  // Chart data
  const chartData = Array.from({length:12},(_,i)=>i+1).map(m => ({
    name: mnames[m-1],
    value: monthlyData[m]?.[activeCat]||0,
    month: m,
  })).filter(d => d.value > 0);

  // Forecast for current year remaining months
  const forecastData = useMemo(() => {
    if (!isCurrentYear) return [];
    const latestMonth = Math.max(...Object.keys(monthlyData).map(Number));
    return buildForecast(agg.byYearMonth, latestMonth+1, year, 12, year);
  }, [isCurrentYear, year, agg]);

  // YoY delta
  const delta = prevData?.personnel ? ((yearData.personnel - prevData.personnel)/prevData.personnel*100).toFixed(1) : null;

  // War days
  const allDates = Object.keys(rawData).sort();
  const firstDate = parseDate(allDates[0]);
  const yearDates = allDates.filter(d => getYear(d)===year);
  const warDayStart = yearDates.length ? Math.floor((parseDate(yearDates[0])-firstDate)/86400000)+1 : 0;
  const warDayEnd = yearDates.length ? Math.floor((parseDate(yearDates[yearDates.length-1])-firstDate)/86400000)+1 : 0;
  const yearDaysCount = warDayEnd - warDayStart + 1;
  const dailyAvg = yearDaysCount > 0 ? Math.round(yearData.personnel/yearDaysCount) : 0;

  const milestones = MILESTONES[year] || [];

  return (
    <div style={{ animation:"fadeIn 0.45s ease both" }}>
      {/* Hero */}
      <div style={{ padding:"60px 36px 44px", borderBottom:`1px solid ${th.border}`, position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", right:-20, top:-20, fontFamily:"'Inter',sans-serif",
          fontSize:220, fontWeight:800, lineHeight:1, color:th.grain, pointerEvents:"none", userSelect:"none" }}>
          {year}
        </div>
        <div style={{ position:"absolute", inset:0, background:`radial-gradient(ellipse 50% 60% at 5% 50%, ${th.accent}07, transparent)`, pointerEvents:"none" }}/>
        <div style={{ maxWidth:1100, margin:"0 auto", position:"relative" }}>
          <div style={{ fontSize:10, letterSpacing:4, color:th.dim, textTransform:"uppercase", marginBottom:16 }}>
            {isCurrentYear ? t.partialYear : isForecast ? t.forecastYear : t.fullYear} · War Days {warDayStart}–{warDayEnd}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr auto", gap:40, alignItems:"start" }}>
            <div>
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:"clamp(52px,8vw,96px)", fontWeight:800,
                lineHeight:.88, letterSpacing:-3, color:th.text, marginBottom:8 }}>{year}</div>
              <div style={{ fontSize:11, letterSpacing:3, color:th.dim, textTransform:"uppercase", marginBottom:24 }}>
                {t.pageTitle}                
              </div>
              <div style={{ display:"flex", gap:28, flexWrap:"wrap", marginBottom:16 }}>
                {[["personnel",th.spike],["tanks",th.accent],["apv",th.accent],["uav","#ffb347"]].map(([k,c]) => (
                  <div key={k}>
                    <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:26, fontWeight:600, color:c, lineHeight:1 }}>
                      {fmtFull(yearData[k]||0)}
                    </div>
                    <div style={{ fontSize:9, letterSpacing:1, color:th.dim, textTransform:"uppercase", marginTop:3 }}>{t[k]||k}</div>
                  </div>
                ))}
              </div>
              {delta && (
                <div style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"5px 14px",
                  borderRadius:20, fontSize:12,
                  background: parseFloat(delta)>0 ? th.spike+"11" : th.trough+"11",
                  color: parseFloat(delta)>0 ? th.spike : th.trough,
                  border:`1px solid ${parseFloat(delta)>0 ? th.spike+"33" : th.trough+"33"}` }}>
                  {parseFloat(delta)>0?"▲":"▼"} {Math.abs(delta)}% {t.vsYear} {prevYear}
                </div>
              )}
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              {[
                [t.warDaysCovered, yearDaysCount],
                [t.dailyAvg, dailyAvg],
                [t.peakMonth, `${mnames[peakMonth-1]} ${year}`],
              ].map(([label, val]) => (
                <div key={label} style={{ background:th.panel, border:`1px solid ${th.border}`,
                  borderRadius:10, padding:"16px 20px", minWidth:175 }}>
                  <div style={{ fontSize:9, letterSpacing:2, color:th.dim, textTransform:"uppercase", marginBottom:6 }}>{label}</div>
                  <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:typeof val==="string"?16:24,
                    fontWeight:600, color: label===t.peakMonth ? th.gold : th.text }}>{val}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth:1100, margin:"0 auto", padding:"44px 36px 80px" }}>

        {/* § Monthly Extremes */}
        <SectionLabel>{t.monthlyExtremes}</SectionLabel>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:18, marginBottom:44 }}>
          {/* Peak */}
          <div style={{ background:th.panel, border:`1px solid ${th.spike}33`, borderRadius:12,
            padding:"22px", position:"relative", overflow:"hidden" }}>
            <div style={{ position:"absolute", inset:0, background:`radial-gradient(ellipse 80% 50% at 50% 0, ${th.spike}08, transparent)`, pointerEvents:"none" }}/>
            <div style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"3px 10px",
              borderRadius:20, background:`${th.spike}11`, color:th.spike,
              fontSize:9, letterSpacing:2, textTransform:"uppercase", marginBottom:12 }}>
              {t.peakTag}
            </div>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:30, fontWeight:800, color:th.text, lineHeight:1, marginBottom:4 }}>
              {mnames[peakMonth-1]} {year}
            </div>
            <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:42, fontWeight:600, color:th.spike, lineHeight:1, marginBottom:6 }}>
              {fmtFull(peakVal)}
            </div>
            <div style={{ fontSize:9, letterSpacing:1, color:th.spike, textTransform:"uppercase", marginBottom:10 }}>
              {t[activeCat]||activeCat} losses
            </div>
            <MiniBarChart monthlyData={monthlyData} peakMonth={peakMonth} troughMonth={-1} catKey={activeCat} lang={lang}/>
          </div>
          {/* Trough */}
          <div style={{ background:th.panel, border:`1px solid ${th.trough}33`, borderRadius:12,
            padding:"22px", position:"relative", overflow:"hidden" }}>
            <div style={{ position:"absolute", inset:0, background:`radial-gradient(ellipse 80% 50% at 50% 0, ${th.trough}07, transparent)`, pointerEvents:"none" }}/>
            <div style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"3px 10px",
              borderRadius:20, background:`${th.trough}11`, color:th.trough,
              fontSize:9, letterSpacing:2, textTransform:"uppercase", marginBottom:12 }}>
              {t.troughTag}
            </div>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:30, fontWeight:800, color:th.text, lineHeight:1, marginBottom:4 }}>
              {mnames[troughMonth-1]} {year}
            </div>
            <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:42, fontWeight:600, color:th.trough, lineHeight:1, marginBottom:6 }}>
              {fmtFull(troughVal)}
            </div>
            <div style={{ fontSize:9, letterSpacing:1, color:th.trough, textTransform:"uppercase", marginBottom:10 }}>
              {t[activeCat]||activeCat} losses
            </div>
            <MiniBarChart monthlyData={monthlyData} peakMonth={-1} troughMonth={troughMonth} catKey={activeCat} lang={lang}/>
          </div>
        </div>

        {/* § Monthly Breakdown Chart */}
        <SectionLabel>{t.monthlyBreakdown}</SectionLabel>
        <Panel style={{ marginBottom:44 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20, flexWrap:"wrap", gap:12 }}>
            <div style={{ fontSize:10, letterSpacing:2, color:th.dim, textTransform:"uppercase" }}>
              {t[activeCat]||activeCat} · {year}
            </div>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              {CATEGORY_KEYS.filter(k => Object.values(monthlyData).some(m=>m[k]>0)).map(k => (
                <button key={k} onClick={() => setActiveCat(k)} style={{
                  padding:"4px 10px", borderRadius:20, fontSize:9, letterSpacing:1,
                  border:`1px solid ${activeCat===k ? th.accent+"44" : th.border}`,
                  background: activeCat===k ? th.accent+"11" : "transparent",
                  color: activeCat===k ? th.accent : th.dim,
                  cursor:"pointer", fontFamily:"'Inter',sans-serif", textTransform:"uppercase"
                }}>{t[k]||k}</button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{top:0,right:0,bottom:0,left:-20}}>
              <XAxis dataKey="name" tick={{fill:th.dim,fontSize:10,fontFamily:"'Inter',sans-serif"}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fill:th.muted,fontSize:9}} axisLine={false} tickLine={false} tickFormatter={formatNum}/>
              <Tooltip content={<DarkTooltip/>}/>
              <Bar dataKey="value" name={t[activeCat]||activeCat} radius={[3,3,0,0]}>
                {chartData.map((d,i) => <Cell key={i} fill={d.month===peakMonth ? th.spike : d.month===troughMonth ? th.trough : th.accent}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          {isCurrentYear && forecastData.length > 0 && (
            <div style={{ marginTop:16, paddingTop:16, borderTop:`1px solid ${th.border}` }}>
              <div style={{ fontSize:9, letterSpacing:2, color:th.forecast, textTransform:"uppercase", marginBottom:12 }}>
                {t.forecastSection} · {t.forecastDisclaimer}
              </div>
              <ResponsiveContainer width="100%" height={120}>
                <AreaChart data={forecastData.map(f => ({ name:`${mnames[f.month-1]}`, value:f[activeCat]||0, lo:f[activeCat+"_lo"]||0, hi:f[activeCat+"_hi"]||0 }))} margin={{top:0,right:0,bottom:0,left:-20}}>
                  <XAxis dataKey="name" tick={{fill:th.forecast,fontSize:9}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fill:th.muted,fontSize:9}} axisLine={false} tickLine={false} tickFormatter={formatNum}/>
                  <Tooltip content={<DarkTooltip/>}/>
                  <Area type="monotone" dataKey="hi" stroke="none" fill={th.forecast+"22"} name="Upper bound"/>
                  <Area type="monotone" dataKey="value" stroke={th.forecast} strokeWidth={1.5} strokeDasharray="5 3" fill={th.forecast+"11"} name={t[activeCat]||activeCat}/>
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>

        {/* § Category Composition */}
        <SectionLabel>{t.categoryComposition}</SectionLabel>
        <Panel style={{ marginBottom:44 }}>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {CATEGORY_KEYS.filter(k=>yearData[k]>0).sort((a,b)=>(yearData[b]||0)-(yearData[a]||0)).map((k,i) => {
              const maxV = Math.max(...CATEGORY_KEYS.map(kk=>yearData[kk]||0));
              const pct = ((yearData[k]||0)/maxV*100);
              return (
                <div key={k} style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <div style={{ color:CAT_COLORS[CATEGORY_KEYS.indexOf(k)], flexShrink:0 }}>
                    {(() => { const Icon=Icons[k]; return <Icon s={16} c={CAT_COLORS[CATEGORY_KEYS.indexOf(k)]}/>; })()}
                  </div>
                  <div style={{ fontSize:10, color:th.dim, width:130, letterSpacing:1, textTransform:"uppercase" }}>{t[k]||k}</div>
                  <div style={{ flex:1, height:4, background:th.muted+"33", borderRadius:2 }}>
                    <div style={{ width:`${pct}%`, height:"100%", background:CAT_COLORS[CATEGORY_KEYS.indexOf(k)], borderRadius:2 }}/>
                  </div>
                  <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:12, color:th.text, width:72, textAlign:"right" }}>
                    {fmtFull(yearData[k]||0)}
                  </div>
                  <div style={{ fontSize:10, color:th.dim, width:40, textAlign:"right" }}>
                    {((yearData[k]||0)/Math.max(1,Object.values(yearData).reduce((a,b)=>a+b,0))*100).toFixed(1)}%
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        {/* § YTD Context — current year only */}
        {isCurrentYear && (
          <>
            <SectionLabel>{t.ytdContext}</SectionLabel>
            <CitationsGrid citations={CITATIONS_DATA[year]?.ytd} label={`${year} · ${t.personnelLosses}`}/>
            <div style={{ marginBottom:44 }}/>
          </>
        )}

        {/* § Citations Peak */}
        <SectionLabel>{t.peakContext} — {mnames[personnelPeakMonth-1]} {year}</SectionLabel>
        <CitationsGrid citations={CITATIONS_DATA[year]?.peak} label={`${mnames[personnelPeakMonth-1]} ${year} · ${t.personnelLosses}`}/>
        <div style={{ marginBottom:44 }}/>

        {/* § Citations Trough */}
        <SectionLabel>{t.troughContext} — {mnames[personnelTroughMonth-1]} {year}</SectionLabel>
        <CitationsGrid citations={CITATIONS_DATA[year]?.trough} label={`${mnames[personnelTroughMonth-1]} ${year} · ${t.personnelLosses}`}/>
        <div style={{ marginBottom:44 }}/>

        {/* § Milestones */}
        {milestones.length > 0 && (
          <>
            <SectionLabel>{t.milestones}</SectionLabel>
            <Panel>
              <MilestoneTimeline events={milestones}/>
            </Panel>
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FORECAST PAGE (next year)
// ─────────────────────────────────────────────────────────────────────────────
function ForecastPage({ forecastYear, agg, lang }) {
  const th = THEMES[useTheme()];
  const t = useT();
  const mnames = lang==="ua" ? MONTH_NAMES_UK : MONTH_NAMES_EN;
  const [activeCat, setActiveCat] = useState("personnel");

  const forecast = useMemo(() =>
    buildForecast(agg.byYearMonth, 1, forecastYear, 12, forecastYear),
    [forecastYear, agg]
  );

  const chartData = forecast.map(f => ({
    name: mnames[f.month-1],
    value: f[activeCat]||0,
    lo: f[activeCat+"_lo"]||0,
    hi: f[activeCat+"_hi"]||0,
  }));

  return (
    <div style={{ animation:"fadeIn 0.45s ease both" }}>
      <div style={{ padding:"60px 36px 44px", borderBottom:`1px solid ${th.border}`, position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", right:-20, top:-20, fontFamily:"'Inter',sans-serif", fontSize:220, fontWeight:800, lineHeight:1, color:th.grain, pointerEvents:"none", userSelect:"none" }}>{forecastYear}</div>
        <div style={{ maxWidth:1100, margin:"0 auto", position:"relative" }}>
          <div style={{ fontSize:10, letterSpacing:4, color:th.forecast, textTransform:"uppercase", marginBottom:16 }}>{t.forecastYear} · {forecastYear}</div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:"clamp(52px,8vw,96px)", fontWeight:800, lineHeight:.88, letterSpacing:-3, color:th.text, marginBottom:20 }}>{forecastYear}</div>
          <div style={{ background:`${th.gold}11`, border:`1px solid ${th.gold}33`, borderRadius:8, padding:"12px 16px", display:"inline-block", marginBottom:16 }}>
            <div style={{ fontSize:11, color:th.gold }}>{t.forecastDisclaimer}</div>
          </div>
        </div>
      </div>
      <div style={{ maxWidth:1100, margin:"0 auto", padding:"44px 36px 80px" }}>
        <SectionLabel>{t.forecastSection} · {t[activeCat]||activeCat} · {forecastYear}</SectionLabel>
        <Panel style={{ marginBottom:44 }}>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:20 }}>
            {CATEGORY_KEYS.map(k => (
              <button key={k} onClick={() => setActiveCat(k)} style={{
                padding:"4px 10px", borderRadius:20, fontSize:9, letterSpacing:1,
                border:`1px solid ${activeCat===k ? th.accent+"44" : th.border}`,
                background: activeCat===k ? th.accent+"11" : "transparent",
                color: activeCat===k ? th.accent : th.dim,
                cursor:"pointer", fontFamily:"'Inter',sans-serif", textTransform:"uppercase"
              }}>{t[k]||k}</button>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={chartData} margin={{top:0,right:0,bottom:0,left:-20}}>
              <XAxis dataKey="name" tick={{fill:th.dim,fontSize:11,fontFamily:"'Inter',sans-serif"}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fill:th.muted,fontSize:9}} axisLine={false} tickLine={false} tickFormatter={formatNum}/>
              <Tooltip content={<DarkTooltip/>}/>
              <Area type="monotone" dataKey="hi" stroke="none" fill={th.forecast+"22"} name={t.confidence}/>
              <Area type="monotone" dataKey="value" stroke={th.forecast} strokeWidth={2} strokeDasharray="6 3" fill={th.forecast+"11"} name={t[activeCat]||activeCat}/>
              <Area type="monotone" dataKey="lo" stroke="none" fill="transparent" name="Lower bound"/>
            </AreaChart>
          </ResponsiveContainer>
        </Panel>

        <SectionLabel>{t.analysisYoY} · All Categories</SectionLabel>
        <Panel>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {CATEGORY_KEYS.map(k => {
              const projected = forecast.reduce((s,f) => s+(f[k]||0), 0);
              const prev = Object.values(agg.byYear).slice(-1)[0]?.[k]||0;
              const delta = prev ? ((projected-prev)/prev*100).toFixed(0) : null;
              const Icon = Icons[k];
              return (
                <div key={k} style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <Icon s={16} c={th.dim}/>
                  <div style={{ fontSize:10, color:th.dim, width:130, letterSpacing:1, textTransform:"uppercase" }}>{t[k]||k}</div>
                  <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:13, color:th.forecast, flex:1 }}>
                    ~{formatNum(projected)}
                  </div>
                  {delta && (
                    <div style={{ fontSize:11, color: parseFloat(delta)>0 ? th.spike : th.trough }}>
                      {parseFloat(delta)>0?"▲":"▼"} {Math.abs(delta)}%
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Panel>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ANALYSIS PAGE
// ─────────────────────────────────────────────────────────────────────────────
function AnalysisPage({ agg, years, lang }) {
  const th = THEMES[useTheme()];
  const t = useT();
  const [selCat, setSelCat] = useState("personnel");
  const [viewMode, setViewMode] = useState("overlay");
  const mnames = lang==="ua" ? MONTH_NAMES_UK : MONTH_NAMES_EN;
  const catIdx = CATEGORY_KEYS.indexOf(selCat);
  const catColor = CAT_COLORS[catIdx];

  // Multi-year overlay data
  const overlayData = useMemo(() => {
    const months = Array.from({length:12},(_,i)=>i+1);
    return months.map(m => {
      const d = { month: mnames[m-1] };
      years.forEach(y => { d[String(y)] = agg.byYearMonth[y]?.[m]?.[selCat]||0; });
      return d;
    });
  }, [selCat, years, agg, mnames]);

  // Sequential timeline
  const seqData = useMemo(() => {
    const pts = [];
    years.forEach(y => {
      for (let m=1; m<=12; m++) {
        if (agg.byYearMonth[y]?.[m]) {
          pts.push({ label:`${mnames[m-1].slice(0,1)} ${String(y).slice(2)}`, value:agg.byYearMonth[y][m][selCat]||0 });
        }
      }
    });
    return pts;
  }, [selCat, years, agg, mnames]);

  // YoY table
  const tableData = useMemo(() => {
    return CATEGORY_KEYS.map(k => {
      const row = { key:k };
      years.forEach((y,i) => {
        row[y] = agg.byYear[y]?.[k]||0;
        if (i>0) {
          const prev = agg.byYear[years[i-1]]?.[k]||1;
          row[`d${y}`] = ((row[y]-prev)/prev*100).toFixed(0);
        }
      });
      return row;
    });
  }, [agg, years]);

  // Heatmap
  const heatmapData = useMemo(() => {
    return CATEGORY_KEYS.map(k => {
      const vals = {};
      let max = 0;
      years.forEach(y => {
        for (let m=1; m<=12; m++) {
          const v = agg.byYearMonth[y]?.[m]?.[k]||0;
          vals[`${y}-${m}`] = v;
          if (v>max) max = v;
        }
      });
      return { key:k, vals, max };
    });
  }, [agg, years]);

  // Top 10 spikes
  const topSpikes = useMemo(() => {
    const spikes = [];
    CATEGORY_KEYS.forEach(k => {
      years.forEach(y => {
        const yearAvg = (agg.byYear[y]?.[k]||0)/12;
        for (let m=1; m<=12; m++) {
          const v = agg.byYearMonth[y]?.[m]?.[k]||0;
          if (v>0) spikes.push({ k, y, m, v, pct: yearAvg>0 ? ((v-yearAvg)/yearAvg*100).toFixed(0) : 0 });
        }
      });
    });
    return spikes.sort((a,b)=>b.v-a.v).slice(0,10);
  }, [agg, years]);

  const yearColors = ["#4a9eff","#ff6644","#44ccff","#ffb347","#aa88ff","#44ee88"];

  return (
    <div style={{ animation:"fadeIn 0.45s ease both" }}>
      <div style={{ padding:"52px 36px 36px", borderBottom:`1px solid ${th.border}` }}>
        <div style={{ maxWidth:1100, margin:"0 auto" }}>
          <div style={{ fontSize:10, letterSpacing:4, color:th.dim, textTransform:"uppercase", marginBottom:12 }}>Deep Dive</div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:48, fontWeight:800, color:th.text, letterSpacing:-2 }}>Analysis</div>
        </div>
      </div>

      <div style={{ maxWidth:1100, margin:"0 auto", padding:"40px 36px 80px" }}>

        {/* Category selector */}
        <SectionLabel>{t.analysisCatSelector}</SectionLabel>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))", gap:10, marginBottom:44 }}>
          {CATEGORY_KEYS.map((k,i) => {
            const Icon = Icons[k];
            const isActive = k===selCat;
            return (
              <div key={k} onClick={() => setSelCat(k)}
                style={{ background:isActive?th.panel2:th.panel, border:`1px solid ${isActive?th.accent+"55":th.border}`,
                  borderRadius:10, padding:"14px 14px", cursor:"pointer", transition:"all .15s" }}>
                <Icon s={18} c={isActive ? catColor : th.dim}/>
                <div style={{ fontSize:9, letterSpacing:1, textTransform:"uppercase", color:isActive?th.text:th.dim, marginTop:8, marginBottom:4 }}>{t[k]||k}</div>
                <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:14, color:isActive?catColor:th.dim }}>
                  {formatNum(agg.cumulative[k]||0)}
                </div>
              </div>
            );
          })}
        </div>

        {/* Multi-year trend */}
        <SectionLabel>{t.analysisMultiYear} · {t[selCat]||selCat}</SectionLabel>
        <Panel style={{ marginBottom:44 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
            <div style={{ fontSize:10, color:th.dim, letterSpacing:2, textTransform:"uppercase" }}>
              {viewMode==="overlay" ? t.overlayMode : t.sequentialMode}
            </div>
            <div style={{ display:"flex", gap:6 }}>
              {[["overlay",t.overlayMode],["sequential",t.sequentialMode]].map(([v,l]) => (
                <button key={v} onClick={() => setViewMode(v)} style={{
                  padding:"4px 12px", borderRadius:20, fontSize:10, cursor:"pointer",
                  border:`1px solid ${viewMode===v?th.accent+"44":th.border}`,
                  background:viewMode===v?th.accent+"11":"transparent",
                  color:viewMode===v?th.accent:th.dim, fontFamily:"'Inter',sans-serif"
                }}>{l}</button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            {viewMode==="overlay" ? (
              <LineChart data={overlayData} margin={{top:0,right:0,bottom:0,left:-20}}>
                <XAxis dataKey="month" tick={{fill:th.dim,fontSize:10}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fill:th.muted,fontSize:9}} axisLine={false} tickLine={false} tickFormatter={formatNum}/>
                <Tooltip content={<DarkTooltip/>}/>
                {years.map((y,i) => <Line key={y} type="monotone" dataKey={String(y)} stroke={yearColors[i%yearColors.length]} strokeWidth={1.5} dot={false} name={String(y)}/>)}
              </LineChart>
            ) : (
              <AreaChart data={seqData} margin={{top:0,right:0,bottom:0,left:-20}}>
                <XAxis dataKey="label" tick={{fill:th.dim,fontSize:8}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fill:th.muted,fontSize:9}} axisLine={false} tickLine={false} tickFormatter={formatNum}/>
                <Tooltip content={<DarkTooltip/>}/>
                <Area type="monotone" dataKey="value" stroke={catColor} strokeWidth={2} fill={catColor+"22"} name={t[selCat]||selCat}/>
              </AreaChart>
            )}
          </ResponsiveContainer>
          <div style={{ display:"flex", gap:16, marginTop:12, flexWrap:"wrap" }}>
            {years.map((y,i) => (
              <div key={y} style={{ display:"flex", alignItems:"center", gap:6, fontSize:10, color:th.dim }}>
                <div style={{ width:20, height:2, background:yearColors[i%yearColors.length] }}/>
                {y}
              </div>
            ))}
          </div>
        </Panel>

        {/* Rate of change table */}
        <SectionLabel>{t.analysisTable}</SectionLabel>
        <Panel style={{ marginBottom:44, overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontFamily:"'Inter',sans-serif", fontSize:11 }}>
            <thead>
              <tr>
                <th style={{ textAlign:"left", padding:"8px 12px", color:th.dim, fontWeight:600, borderBottom:`1px solid ${th.border}`, fontSize:9, letterSpacing:2, textTransform:"uppercase" }}>Category</th>
                {years.map((y,i) => (
                  <th key={y} style={{ textAlign:"right", padding:"8px 10px", color:th.dim, fontWeight:600, borderBottom:`1px solid ${th.border}`, fontSize:9, letterSpacing:1 }}>
                    {y}{i>0 && <span style={{ display:"block", fontSize:8, color:th.muted }}>Δ%</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableData.map((row,ri) => {
                const Icon = Icons[row.key];
                return (
                  <tr key={row.key} style={{ background: ri%2===0 ? th.panel : th.panel2 }}>
                    <td style={{ padding:"8px 12px", borderBottom:`1px solid ${th.border}`, display:"flex", alignItems:"center", gap:8 }}>
                      <Icon s={14} c={th.dim}/>
                      <span style={{ color:th.text, fontSize:10 }}>{t[row.key]||row.key}</span>
                    </td>
                    {years.map((y,i) => {
                      const delta = row[`d${y}`];
                      const dv = delta ? parseFloat(delta) : null;
                      return (
                        <td key={y} style={{ padding:"8px 10px", textAlign:"right", borderBottom:`1px solid ${th.border}` }}>
                          <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:11, color:th.text }}>{formatNum(row[y])}</div>
                          {i>0 && dv!==null && (
                            <div style={{ fontSize:9, color: dv>0?th.spike:th.trough }}>
                              {dv>0?"▲":"▼"}{Math.abs(dv)}%
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Panel>

        {/* Heatmap */}
        <SectionLabel>{t.analysisHeatmap}</SectionLabel>
        <Panel style={{ marginBottom:44, overflowX:"auto" }}>
          <div style={{ display:"flex", gap:4, marginBottom:10 }}>
            <div style={{ width:130 }}/>
            {Array.from({length:12},(_,i)=>i+1).map(m => (
              <div key={m} style={{ flex:1, textAlign:"center", fontSize:9, color:th.dim, minWidth:28 }}>{mnames[m-1]}</div>
            ))}
          </div>
          {heatmapData.map(({ key:k, vals, max }) => {
            const Icon = Icons[k];
            return (
              <div key={k} style={{ display:"flex", gap:4, marginBottom:4, alignItems:"center" }}>
                <div style={{ width:130, display:"flex", alignItems:"center", gap:6 }}>
                  <Icon s={13} c={th.dim}/>
                  <span style={{ fontSize:9, color:th.dim, letterSpacing:1, textTransform:"uppercase" }}>{t[k]||k}</span>
                </div>
                {Array.from({length:12},(_,i)=>i+1).map(m => {
                  const allYearsVals = years.map(y => vals[`${y}-${m}`]||0);
                  const total = allYearsVals.reduce((a,b)=>a+b,0);
                  const intensity = max>0 ? total/max/years.length : 0;
                  return (
                    <div key={m} title={`${mnames[m-1]}: ${fmtFull(total)}`}
                      style={{ flex:1, height:24, borderRadius:3, minWidth:28,
                        background: intensity>0 ? `rgba(74,158,255,${Math.min(intensity*2,0.9)})` : th.muted+"22",
                        transition:"opacity .2s", cursor:"default" }}/>
                  );
                })}
              </div>
            );
          })}
          <div style={{ marginTop:12, display:"flex", alignItems:"center", gap:8, fontSize:9, color:th.dim }}>
            <span>Low</span>
            <div style={{ display:"flex", gap:2 }}>
              {[0.1,0.25,0.5,0.75,1].map(v => (
                <div key={v} style={{ width:20, height:12, borderRadius:2, background:`rgba(74,158,255,${v*0.9})` }}/>
              ))}
            </div>
            <span>High</span>
          </div>
        </Panel>

        {/* Top 10 Spikes */}
        <SectionLabel>{t.analysisSpikes}</SectionLabel>
        <Panel>
          {topSpikes.map((sp,i) => {
            const Icon = Icons[sp.k];
            const ci = CATEGORY_KEYS.indexOf(sp.k);
            return (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:14,
                padding:"12px 0", borderBottom: i<9 ? `1px solid ${th.border}` : "none" }}>
                <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:18, fontWeight:600,
                  color:th.muted, width:28, textAlign:"center" }}>#{i+1}</div>
                <Icon s={18} c={CAT_COLORS[ci]}/>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:12, color:th.text, fontWeight:600 }}>
                    {mnames[sp.m-1]} {sp.y} · {t[sp.k]||sp.k}
                  </div>
                  <div style={{ fontSize:10, color:th.dim }}>+{sp.pct}% {t.aboveYearAverage}</div>
                </div>
                <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:18, fontWeight:600, color:CAT_COLORS[ci] }}>
                  {fmtFull(sp.v)}
                </div>
              </div>
            );
          })}
        </Panel>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT APP
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const [rawData, setRawData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState("home");
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "light");
  const [lang, setLang] = useState(() => localStorage.getItem("lang") || "en");

  useEffect(() => {
    fetch("https://russian-casualties.in.ua/api/v1/data/json/daily")
      .then(r => r.json())
      .then(json => { setRawData(json.data); setLoading(false);  }) //console.log("Missing dates:", findMissingDates(json.data));
      .catch(() => setError(T.en.failedLoad));
  }, []);

  const agg = useMemo(() => rawData ? buildAggregates(rawData) : null, [rawData]);

  const now = new Date();
  const currentYear = now.getFullYear();
  const nextYear = currentYear + 1;

  const years = useMemo(() => {
    if (!agg) return [];
    const dataYears = Object.keys(agg.byYear).map(Number).sort();
    const lastDataYear = dataYears[dataYears.length-1];
    const allYears = [...dataYears];
    if (!allYears.includes(nextYear)) allYears.push(nextYear);
    return allYears;
  }, [agg, nextYear]);

  const th = THEMES[theme];
  const t = T[lang];

  if (loading || error) return (
    <div style={{ background:THEMES.dark.bg, minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap');`}</style>
      {error
        ? <div style={{ color:THEMES.dark.spike, fontFamily:"'Inter',sans-serif" }}>{error}</div>
        : <div style={{ textAlign:"center" }}>
            <div style={{ fontFamily:"'Inter',sans-serif", color:THEMES.dark.accent, letterSpacing:4, fontSize:11, marginBottom:20, textTransform:"uppercase" }}>
              {T.en.loadingData}
            </div>
            <div style={{ display:"flex", gap:6, justifyContent:"center" }}>
              {[0,1,2].map(i => (
                <div key={i} style={{ width:6, height:6, borderRadius:"50%", background:THEMES.dark.accent,
                  animation:`pulse 1.2s ease-in-out ${i*0.2}s infinite` }}/>
              ))}
            </div>
          </div>
      }
      <style>{`@keyframes pulse{0%,100%{opacity:.2;transform:scale(.8)}50%{opacity:1;transform:scale(1.2)}}`}</style>
    </div>
  );

  const historicalYears = years.filter(y => y < nextYear);
  const navItems = [
    { id:"home", label:t.overview },
    ...historicalYears.map(y => ({ id:String(y), label:String(y) })),
    { id:String(nextYear), label:`${nextYear} ↗` },
    { id:"analysis", label:t.analysis },
  ];

  const allDates = Object.keys(rawData).sort();
  const lastDate = parseDate(allDates[allDates.length-1]);

  return (
    <ThemeCtx.Provider value={theme}>
      <LangCtx.Provider value={lang}>
        <div style={{ background:th.bg, minHeight:"100vh", color:th.text, fontFamily:"'Inter',sans-serif" }}>
          <style>{`
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap');
            *{box-sizing:border-box;margin:0;padding:0}
            button{font-family:'Inter',sans-serif}
            ::-webkit-scrollbar{width:4px}
            ::-webkit-scrollbar-track{background:${th.bg}}
            ::-webkit-scrollbar-thumb{background:${th.border};border-radius:2px}
            @keyframes fadeIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
            .cat-grid{display:grid;grid-template-columns:1fr 1fr;gap:0 40px}
            .hero-grid{display:grid;grid-template-columns:1fr auto;gap:40px;align-items:end}
            .daw-mobile{display:none}
            .milestone-list{display:flex;justify-content:space-between;position:relative;gap:8}
            @media(max-width:600px) and (orientation:portrait){.cat-grid{grid-template-columns:1fr}.hero-grid{grid-template-columns:1fr;gap:0}.daw-desktop{display:none}.daw-mobile{display:block;margin-top:20px}.milestone-list{flex-direction:column;gap:10}.milestone-list-line{display:none}.milestone-item{flex-direction:column!important;align-items:flex-start!important}.milestone-dot{display:none}.milestone-spacer{display:none}}
          `}</style>

          {/* NAV */}
          <nav style={{ position:"sticky", top:0, zIndex:100, background:th.navBg,
            backdropFilter:"blur(14px)", borderBottom:`1px solid ${th.border}`,
            display:"flex", alignItems:"center", flexWrap:"wrap", padding:"8px 24px", gap:4 }}>
            <div style={{ fontSize:13, letterSpacing:3, fontWeight:700, color:th.accent,
              textTransform:"uppercase", marginRight:28, flexShrink:0 }}>{t.brand}</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:3, flex:1 }}>
              {navItems.map(p => (
                <button key={p.id} onClick={() => setPage(p.id)} style={{
                  background: page===p.id ? th.accent+"14" : "transparent",
                  border: `1px solid ${page===p.id ? th.accent+"44" : "transparent"}`,
                  color: page===p.id ? th.accent : th.dim,
                  padding:"6px 14px", borderRadius:6, cursor:"pointer", fontSize:13,
                  letterSpacing:1, fontWeight: page===p.id ? 700 : 400,
                  transition:"all .15s", flexShrink:0,
                }}>{p.label}</button>
              ))}
            </div>
            <div style={{ display:"flex", gap:8, alignItems:"center", marginLeft:12, flexShrink:0 }}>
              {/* Language */}
              <div style={{ display:"flex", gap:2 }}>
                {["en","ua"].map(l => (
                  <button key={l} onClick={() => { setLang(l); localStorage.setItem("lang",l); }} style={{
                    padding:"4px 10px", borderRadius:4, fontSize:12, cursor:"pointer",
                    border:`1px solid ${lang===l ? th.accent+"44" : th.border}`,
                    background: lang===l ? th.accent+"11" : "transparent",
                    color: lang===l ? th.accent : th.dim,
                  }}>{l.toUpperCase()}</button>
                ))}
              </div>
              {/* Theme */}
              <button onClick={() => setTheme(t => { const next = t==="dark"?"light":"dark"; localStorage.setItem("theme",next); return next; })} style={{
                padding:"5px 12px", borderRadius:4, fontSize:14, cursor:"pointer",
                border:`1px solid ${th.border}`, background:th.panel2, color:th.dim,
              }}>{theme==="dark" ? "☀" : "☾"}</button>
              <div style={{ fontSize:12, color:th.muted, fontFamily:"'JetBrains Mono',monospace", whiteSpace:"nowrap" }}>
                {lastDate.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}
              </div>
            </div>
          </nav>

          {/* PAGE ROUTER */}
          {page === "home" && <HomePage rawData={rawData} agg={agg} years={years} setPage={setPage}/>}
          {page === "analysis" && <AnalysisPage agg={agg} years={historicalYears} lang={lang}/>}
          {page === String(nextYear) && <ForecastPage forecastYear={nextYear} agg={agg} lang={lang}/>}
          {historicalYears.map(y => page===String(y) && (
            <YearPage key={y} year={y} agg={agg} rawData={rawData}
              prevYear={historicalYears[historicalYears.indexOf(y)-1]||null}/>
          ))}
        </div>
      </LangCtx.Provider>
    </ThemeCtx.Provider>
  );
}
