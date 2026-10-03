"use client";
import { useEffect, useState } from "react";

function part(h: number) {
  if (h < 5) return { text: "Good night", icon: "moon" as const };
  if (h < 12) return { text: "Good morning", icon: "sun" as const };
  if (h < 17) return { text: "Good afternoon", icon: "sun" as const };
  if (h < 21) return { text: "Good evening", icon: "dusk" as const };
  return { text: "Good night", icon: "moon" as const };
}

/** Time-aware greeting with a looping car-wash scene (car rolls in, gets foamed + rinsed, rolls out clean). Pure SVG/CSS, honours reduced-motion. */
export function GreetingBanner({ name, summary }: { name: string; summary?: string }) {
  const [g, setG] = useState({ text: "Hello", icon: "sun" as "sun" | "moon" | "dusk" });
  useEffect(() => {
    setG(part(new Date().getHours()));
    const t = setInterval(() => setG(part(new Date().getHours())), 60_000);
    return () => clearInterval(t);
  }, []);
  const first = name.split(" ")[0];
  const sky = g.icon === "moon" ? "from-indigo-900 via-sky-900 to-cyan-900" : g.icon === "dusk" ? "from-orange-400 via-rose-500 to-indigo-700" : "from-sky-400 via-cyan-400 to-teal-300";
  return (
    <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-r ${sky} p-5 text-white shadow-lg md:p-7`}>
      <div className="relative z-10 max-w-[62%] sm:max-w-[55%]">
        <p className="text-sm font-semibold opacity-90">{new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}</p>
        <h1 className="mt-1 text-2xl font-extrabold leading-tight md:text-3xl">{g.text}, {first}! <span aria-hidden>{g.icon === "moon" ? "🌙" : "☀️"}</span></h1>
        {summary && <p className="mt-2 text-sm font-medium opacity-95 md:text-base">{summary}</p>}
      </div>
      <svg className="absolute bottom-0 right-0 h-full w-[56%] max-w-[460px]" viewBox="0 0 360 140" preserveAspectRatio="xMaxYMax meet" aria-hidden="true">
        {/* sun / moon */}
        {g.icon === "moon" ? (
          <g className="cw-sun"><circle cx="305" cy="34" r="16" fill="#fef9c3" /><circle cx="312" cy="29" r="14" fill="#1e3a8a" opacity=".55" /></g>
        ) : (
          <g className="cw-sun"><circle cx="312" cy="32" r="15" fill="#fde047" /><circle cx="312" cy="32" r="22" fill="#fde047" opacity=".25" /></g>
        )}
        {/* clouds */}
        <g fill="#fff" opacity=".35"><ellipse cx="70" cy="30" rx="26" ry="9" /><ellipse cx="90" cy="24" rx="18" ry="8" /><ellipse cx="230" cy="46" rx="22" ry="7" /></g>
        {/* wash arch */}
        <g>
          <path d="M122 128 V52 Q122 34 140 34 H220 Q238 34 238 52 V128" fill="none" stroke="#0f172a" strokeOpacity=".35" strokeWidth="9" strokeLinecap="round" />
          <rect x="136" y="30" width="88" height="8" rx="4" fill="#0f172a" fillOpacity=".5" />
          {[148, 164, 180, 196, 212].map((x, i) => (
            <circle key={x} cx={x} cy="44" r="2.6" fill="#e0f2fe" className="cw-drop" style={{ animationDelay: `${i * 0.18}s` }} />
          ))}
          {[154, 172, 190, 206].map((x, i) => (
            <circle key={x} cx={x} cy="44" r="2.2" fill="#bae6fd" className="cw-drop" style={{ animationDelay: `${0.09 + i * 0.22}s` }} />
          ))}
        </g>
        {/* road */}
        <rect x="0" y="124" width="360" height="16" fill="#0f172a" fillOpacity=".35" />
        <g stroke="#fff" strokeOpacity=".5" strokeWidth="2" strokeDasharray="14 12"><line x1="0" y1="132" x2="360" y2="132" /></g>
        {/* car */}
        <g className="cw-drive">
          <g className="cw-bob">
            <path d="M118 112 V96 Q118 88 128 86 L146 82 L162 64 Q166 60 174 60 H206 Q214 60 220 66 L234 84 L250 88 Q258 90 258 98 V112 Z" fill="#f8fafc" />
            <path d="M166 66 H206 L222 84 H152 Z" fill="#7dd3fc" opacity=".9" />
            <line x1="188" y1="66" x2="188" y2="84" stroke="#f8fafc" strokeWidth="2.5" />
            <rect x="248" y="94" width="10" height="6" rx="3" fill="#fde047" />
            <rect x="118" y="94" width="8" height="6" rx="3" fill="#f87171" />
            <rect x="118" y="106" width="140" height="6" fill="#0e7490" opacity=".5" />
            {/* shine sweep after rinse */}
            <g clipPath="url(#cw-car-clip)"><rect x="150" y="56" width="16" height="60" fill="#fff" opacity=".0" className="cw-glint" /></g>
            {/* foam on the roof */}
            {[160, 178, 196, 214, 150, 232].map((x, i) => <circle key={x} cx={x} cy={i % 2 ? 70 : 62} r={4 + (i % 3)} fill="#fff" className="cw-bubble" style={{ animationDelay: `${i * 0.5}s` }} />)}
          </g>
          {[146, 232].map((cx) => (
            <g key={cx}>
              <circle cx={cx} cy="114" r="12" fill="#1e293b" />
              <g className="cw-wheel"><circle cx={cx} cy="114" r="6.5" fill="#cbd5e1" /><path d={`M${cx - 6} 114 H${cx + 6} M${cx} 108 V120`} stroke="#64748b" strokeWidth="2" /></g>
            </g>
          ))}
        </g>
        <defs><clipPath id="cw-car-clip"><path d="M118 112 V96 Q118 88 128 86 L146 82 L162 64 Q166 60 174 60 H206 Q214 60 220 66 L234 84 L250 88 Q258 90 258 98 V112 Z" /></clipPath></defs>
        {/* free-floating bubbles near the arch */}
        {[[100, 118, 0], [262, 116, 1.1], [112, 108, 2.1], [276, 110, 0.6]].map(([x, y, d], i) => <circle key={i} cx={x} cy={y} r="4" fill="none" stroke="#fff" strokeWidth="1.5" className="cw-bubble" style={{ animationDelay: `${d}s` }} />)}
      </svg>
    </div>
  );
}
