import { useRef } from 'react';
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from 'framer-motion';
import { ArrowDown, Search } from 'lucide-react';
import { openHeaderSearch } from '../HeaderSearch';
import hero from '../../assets/hero-neurovascular-transparent.webp';

export function HomeHero() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion() || import.meta.env.SSR;
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const p = useSpring(scrollYProgress, { stiffness: 90, damping: 24, mass: 0.4 });
  const imgY = useTransform(p, [0, 1], reduce ? ['0%', '0%'] : ['0%', '16%']);
  const imgScale = useTransform(p, [0, 1], reduce ? [1, 1] : [1, 1.14]);
  const titleY = useTransform(p, [0, 1], reduce ? ['0%', '0%'] : ['0%', '-22%']);
  const fade = useTransform(p, [0, 0.8], reduce ? [1, 1] : [1, 0.15]);
  const ease = [0.22, 1, 0.36, 1] as const;
  return (
    <section ref={ref} className="hm-hero" aria-labelledby="hm-title">
      <motion.div className="hm-hero-img" style={{ y: imgY, scale: imgScale, opacity: fade }}
        initial={reduce ? false : { opacity: 0, scale: 1.06 }} animate={{ opacity: 1 }} transition={{ duration: 1.8, ease }}>
        <img src={hero} alt="Brain, cranial nerves and blood vessels from the atlas" width={876} height={1098} fetchPriority="high" />
      </motion.div>
      <div className="hm-hero-vignette" aria-hidden />
      <motion.div className="hm-hero-copy" style={{ y: titleY }}>
        <motion.p className="hm-kicker" initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 0.3 }}>
          Open-access anatomy atlas &nbsp;/&nbsp; Nonprofit
        </motion.p>
        <h1 id="hm-title" className="hm-title" aria-label="Anatomia Aperta 3D — Interactive human anatomy atlas">
          {['Anatomia', 'Aperta'].map((w, i) => (
            <span key={w} className="hm-line"><motion.span style={{ display: 'block' }}
              initial={reduce ? false : { y: '105%' }} animate={{ y: 0 }} transition={{ duration: 1.3, delay: 0.25 + i * 0.14, ease }}>{w}{i === 1 && <em> 3D</em>}</motion.span></span>
          ))}
        </h1>
      </motion.div>
      <div className="hm-hero-foot">
        <p className="hm-lede">The human body, studied layer by layer. An interactive 3D atlas for education, research and anatomical exploration.</p>
        <div className="hm-hero-actions">
          <button type="button" onClick={openHeaderSearch} className="hm-link" style={{ background: 'none', cursor: 'pointer' }} data-testid="link-search-structures">Find a structure <Search size={14} aria-hidden /></button>
          <a href="#highlights" className="hm-link" data-testid="link-scroll-highlights">Current highlights <ArrowDown size={14} /></a>
        </div>
      </div>
    </section>
  );
}
