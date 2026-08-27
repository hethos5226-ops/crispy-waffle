"use client";

import { useRef, useState } from "react";
import type { PriceHistoryPoint } from "@/lib/types";

const W = 560;
const H = 150;
const PAD_X = 6;
const PAD_Y = 16;

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

export function PriceHistoryChart({
  history,
  typical,
  currency,
  tone,
}: {
  history: PriceHistoryPoint[];
  typical: number;
  currency: string;
  tone: "buy" | "wait" | "dont";
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const draggingRef = useRef(false);

  const prices = history.map((p) => p.price);
  const all = [...prices, typical];
  const min = Math.min(...all) * 0.97;
  const max = Math.max(...all) * 1.03;
  const x = (i: number) => PAD_X + (i / (history.length - 1)) * (W - PAD_X * 2);
  const y = (v: number) => PAD_Y + (1 - (v - min) / (max - min)) * (H - PAD_Y * 2);

  const linePts = prices.map((v, i) => `${x(i)},${y(v)}`).join(" L ");
  const areaPts = `M ${x(0)},${y(prices[0])} L ${linePts} L ${x(history.length - 1)},${H - PAD_Y} L ${x(0)},${H - PAD_Y} Z`;
  const typicalY = y(typical);
  const lastX = x(history.length - 1);
  const lastY = y(prices[prices.length - 1]);
  const color = `var(--${tone})`;

  const fmt = (v: number) => new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(v);

  function indexFromClientX(clientX: number) {
    const svg = svgRef.current;
    if (!svg) return 0;
    const rect = svg.getBoundingClientRect();
    const relX = clamp((clientX - rect.left) / rect.width, 0, 1);
    const vbX = relX * W;
    return Math.round(clamp(((vbX - PAD_X) / (W - PAD_X * 2)) * (history.length - 1), 0, history.length - 1));
  }

  function handlePointerDown(e: React.PointerEvent<SVGSVGElement>) {
    draggingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    setActiveIndex(indexFromClientX(e.clientX));
  }
  function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (draggingRef.current) setActiveIndex(indexFromClientX(e.clientX));
  }
  function handlePointerUp() {
    draggingRef.current = false;
    setActiveIndex(null);
  }

  const tipLeftPct = activeIndex != null ? (activeIndex / (history.length - 1)) * 100 : 0;
  const tipX = activeIndex != null ? x(activeIndex) : 0;
  const tipY = activeIndex != null ? y(prices[activeIndex]) : 0;

  return (
    <div>
      <div className="relative mt-3.5 touch-pan-y">
        {activeIndex != null && (
          <div
            className="pointer-events-none absolute -top-1.5 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg px-2.5 py-1.5 text-center text-xs font-semibold text-background"
            style={{
              left: `clamp(30px, ${tipLeftPct}%, calc(100% - 30px))`,
              backgroundColor: "color-mix(in srgb, var(--foreground) 90%, transparent)",
              backdropFilter: "blur(8px)",
            }}
          >
            {fmt(history[activeIndex].price)}
            <span className="mt-0.5 block text-[10.5px] font-medium opacity-75">
              {history[activeIndex].date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
          </div>
        )}
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          role="img"
          aria-label="Price history chart, press and drag to inspect"
          className="block w-full cursor-pointer touch-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerLeave={() => {
            if (!draggingRef.current) setActiveIndex(null);
          }}
        >
          <path d={areaPts} fill={color} opacity="0.12" />
          <line x1={PAD_X} y1={typicalY} x2={W - PAD_X} y2={typicalY} stroke="var(--muted)" strokeWidth="1.3" strokeDasharray="4 4" opacity="0.6" />
          <path d={`M ${linePts}`} fill="none" stroke={color} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          {activeIndex != null && (
            <>
              <line x1={tipX} y1={PAD_Y} x2={tipX} y2={H - PAD_Y} stroke={color} strokeWidth="1.3" strokeDasharray="3 3" opacity="0.8" />
              <circle cx={tipX} cy={tipY} r="4" fill={color} stroke="var(--surface)" strokeWidth="2" />
            </>
          )}
          <circle cx={lastX} cy={lastY} r="4.5" fill={color} stroke="var(--surface)" strokeWidth="2" />
        </svg>
      </div>
      <p className="mt-0.5 text-center text-[11px] text-muted">Press and drag the chart to see the price on any date</p>
      <div className="mt-1 flex justify-between text-[11px] text-muted">
        <span>{history[0].date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
        <span>Now</span>
      </div>
    </div>
  );
}
