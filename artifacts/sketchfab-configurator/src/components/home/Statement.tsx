import { useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from 'framer-motion';

const TEXT = 'Built upon open anatomical knowledge, Anatomia Aperta 3D brings together detailed human anatomy, extensive scientific refinement, and interactive three-dimensional visualization. An evolving, freely accessible resource dedicated to anatomical education.';

function Word({ w, i, n, p, reduce }: { w: string; i: number; n: number; p: MotionValue<number>; reduce: boolean }) {
  const s = (i / n) * 0.6;
  const o = useTransform(p, [s, s + 0.12], [reduce ? 1 : 0.18, 1]);
  return <motion.span style={{ opacity: o }}>{w} </motion.span>;
}

export function Statement() {
  const ref = useRef<HTMLElement>(null);
  const reduce = !!useReducedMotion() || import.meta.env.SSR;
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 85%', 'end 55%'] });
  const words = TEXT.split(' ');
  return (
    <section ref={ref} className="hm-statement" aria-label="About the atlas">
      <p className="hm-statement-text">{words.map((w, i) => <Word key={i} w={w} i={i} n={words.length} p={scrollYProgress} reduce={reduce} />)}</p>
    </section>
  );
}
