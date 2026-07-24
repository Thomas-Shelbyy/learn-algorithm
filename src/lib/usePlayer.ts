import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// Materializes a generator into an array of steps and exposes play/pause/step controls.
export function usePlayer<T>(gen: () => Generator<T>, speed: number) {
  const steps = useMemo(() => {
    const out: T[] = [];
    const g = gen();
    let n = g.next();
    let safety = 0;
    while (!n.done && safety++ < 100000) {
      out.push(n.value);
      n = g.next();
    }
    return out;
  }, [gen]);

  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    setIndex(0);
    setPlaying(false);
  }, [steps]);

  useEffect(() => {
    if (!playing) return;
    timer.current = window.setInterval(() => {
      setIndex((i) => {
        if (i >= steps.length - 1) {
          setPlaying(false);
          return i;
        }
        return i + 1;
      });
    }, Math.max(10, 1000 - speed * 9));
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [playing, speed, steps.length]);

  const play = useCallback(() => setPlaying(true), []);
  const pause = useCallback(() => setPlaying(false), []);
  const reset = useCallback(() => {
    setPlaying(false);
    setIndex(0);
  }, []);
  const stepFwd = useCallback(() => setIndex((i) => Math.min(steps.length - 1, i + 1)), [steps.length]);
  const stepBack = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);

  return { steps, index, current: steps[index], playing, play, pause, reset, stepFwd, stepBack, total: steps.length };
}