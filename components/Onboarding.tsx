"use client";

import { useEffect, useState } from "react";
import { Wiz, type WizPose } from "@/components/Wiz";
import { setOnboarded, useHasOnboarded } from "@/lib/storage";

const STEPS: { pose: WizPose; title: string; text: string }[] = [
  {
    pose: "wave",
    title: "Hey! I'm Wiz",
    text: "I'll help you figure out if something's actually worth buying, before you spend a cent.",
  },
  {
    pose: "magnify",
    title: "Search, browse, or scan",
    text: "Find a product in Recs, or scan a barcode, and I'll check today's price against what's typical and dig through the reviews.",
  },
  {
    pose: "pointing",
    title: "I'll always show my work",
    text: "Price, reviews, reliability, warranty, age — every factor behind the score is right there, never just a number.",
  },
  {
    pose: "thumbsUp",
    title: "Then I'll give you a straight answer",
    text: "Buy now, wait, or don't buy — with the reasoning right underneath, so you can judge it yourself.",
  },
];

let externalTrigger: (() => void) | null = null;
/** Lets Settings replay the intro without threading state through the tree. */
export function replayOnboarding() {
  externalTrigger?.();
}

export function Onboarding() {
  const onboarded = useHasOnboarded();
  const [forceShow, setForceShow] = useState(false);
  const [closing, setClosing] = useState(false);
  const [step, setStep] = useState(0);

  // Registers a subscription for Settings to call later — the setState calls
  // this stores live inside a callback fired by a future user action, not
  // synchronously during the effect itself.
  useEffect(() => {
    externalTrigger = () => {
      setStep(0);
      setClosing(false);
      setForceShow(true);
    };
    return () => {
      externalTrigger = null;
    };
  }, []);

  const shouldRender = forceShow || !onboarded || closing;
  if (!shouldRender) return null;

  function dismiss() {
    setOnboarded();
    setClosing(true);
    setTimeout(() => {
      setForceShow(false);
      setClosing(false);
    }, 260);
  }

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-end justify-center bg-black/40 transition-opacity duration-[250ms] ${
        closing ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
      style={{ backdropFilter: "blur(6px)", animation: closing ? "none" : "backdrop-in 250ms ease" }}
    >
      <div
        className={`w-full max-w-[520px] rounded-t-[28px] border border-b-0 border-border px-6 pb-[calc(30px+env(safe-area-inset-bottom))] pt-7 text-center transition-transform duration-[360ms] ${
          closing ? "translate-y-full" : "translate-y-0"
        }`}
        style={{
          backgroundColor: "color-mix(in srgb, var(--surface) 86%, transparent)",
          backdropFilter: "blur(24px)",
          boxShadow: "0 -24px 60px -24px rgba(0,0,0,0.4)",
          transitionTimingFunction: "cubic-bezier(0.32, 0.72, 0, 1)",
          animation: closing ? "none" : "sheet-in 360ms cubic-bezier(0.32, 0.72, 0, 1)",
        }}
      >
        <div className="flex h-[132px] items-end justify-center">
          <Wiz key={current.pose} pose={current.pose} size={132} priority className="wiz-pop" />
        </div>
        <p className="mt-3.5 text-lg font-extrabold">{current.title}</p>
        <p className="mx-auto mt-2 max-w-[380px] text-[14.5px] leading-relaxed text-muted">{current.text}</p>

        <div className="my-5 flex justify-center gap-1.5">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${i === step ? "w-[18px] bg-accent" : "w-1.5 bg-border"}`}
            />
          ))}
        </div>

        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={dismiss}
            className={`px-2.5 py-2.5 text-[13px] font-semibold text-muted pressable ${isLast ? "invisible" : ""}`}
          >
            Skip
          </button>
          <button
            type="button"
            onClick={() => (isLast ? dismiss() : setStep((s) => s + 1))}
            className="rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background pressable"
          >
            {isLast ? "Let's go" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
