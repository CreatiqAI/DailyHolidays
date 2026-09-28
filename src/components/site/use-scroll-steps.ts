"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export const PIN_TOP = 96; // px from the top of the viewport where pinned sections sit (below the header)

/**
 * Scroll-driven steps for a pinned section: a tall "track" contains a sticky block; scrolling through the
 * track picks the step. Only active when the media query matches (wide and tall enough to pin).
 * Returns refs for the track and the sticky block, the current step, progress within it, and a
 * scroll-to-step helper for clicks.
 */
export function useScrollSteps(count: number, media = "(min-width: 1024px) and (min-height: 700px)") {
  const trackRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [step, setStep] = useState(0);
  const [sub, setSub] = useState(0);

  useEffect(() => {
    const mq = window.matchMedia(media);
    const sync = () => setEnabled(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [media]);

  useEffect(() => {
    if (!enabled) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const track = trackRef.current;
      const sticky = stickyRef.current;
      if (!track || !sticky) return;
      const range = track.offsetHeight - sticky.offsetHeight;
      const p = Math.min(1, Math.max(0, (PIN_TOP - track.getBoundingClientRect().top) / Math.max(1, range)));
      const i = Math.min(count - 1, Math.floor(p * count));
      setStep(i);
      setSub(Math.min(1, p * count - i));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [enabled, count]);

  /** Scroll so that step i is showing (desktop); returns false when not pinned so callers can set state instead. */
  const goTo = useCallback(
    (i: number) => {
      const track = trackRef.current;
      const sticky = stickyRef.current;
      if (!enabled || !track || !sticky) return false;
      const range = track.offsetHeight - sticky.offsetHeight;
      const top = window.scrollY + track.getBoundingClientRect().top - PIN_TOP + ((i + 0.05) / count) * range;
      window.scrollTo({ top, behavior: "smooth" });
      return true;
    },
    [enabled, count],
  );

  return { trackRef, stickyRef, enabled, step, sub, goTo };
}
