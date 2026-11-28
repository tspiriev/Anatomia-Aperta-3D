import { useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { ArrowUp } from 'lucide-react';
import { Reveal } from './Reveal';
import { backToAtlasMenus } from './homeNavigation';
import whiteMatter from '../../assets/closing-white-matter.webp';

export function Closing() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end end'] });
  const y = useTransform(scrollYProgress, [0, 1], reduce ? ['0%', '0%'] : ['-10%', '3%']);
  return (
    <section ref={ref} className="hm-closing">
      <motion.img src={whiteMatter} alt="" aria-hidden loading="lazy" style={{ y }} />
      <div className="hm-closing-copy">
        <Reveal as="h2" className="hm-closing-h">Open the atlas.</Reveal>
        <Reveal delay={0.1}><p>Free to explore, for learning and research. Choose a system or region from the atlas menus.</p></Reveal>
        <Reveal delay={0.2}>
          <a href="#atlas-navigation" data-testid="button-closing-explore" className="hm-btn"
            onClick={(e) => { e.preventDefault(); backToAtlasMenus(!!reduce); }}>
            Open the atlas <ArrowUp size={16} aria-hidden />
          </a>
        </Reveal>
      </div>
    </section>
  );
}
