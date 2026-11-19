import { useRef, useState, type KeyboardEvent } from 'react';
import { Link } from 'wouter';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { Reveal } from './Reveal';
import {
  AUTONOMIC_NERVOUS_SYSTEM_VIEW, BRACHIAL_PLEXUS_VIEW, BRAIN_VIEW, BRAINSTEM_CEREBELLUM_VIEW, CRANIAL_NERVES_VIEW,
  HEAD_NECK_TOPOGRAPHY_VIEW, LONG_TRACTS_VIEW, LUMBOSACRAL_PLEXUS_VIEW, SKULL_BASE_VIEW, SPINAL_CORD_VIEW,
  TEMPORAL_ASSOCIATION_VIEW, THALAMUS_CAPSULE_VIEW, type AtlasView,
} from '@/data/atlasViews';
import whiteMatter from '../../assets/hl-white-matter.webp';
import cranial from '../../assets/hl-cranial.webp';
import peripheral from '../../assets/hl-peripheral.webp';
import longTracts from '../../assets/hl-long-tracts.webp';
import autonomic from '../../assets/hl-autonomic.webp';
import manyMoreCollage from '../../assets/hl-many-more-collage.webp';

type Item = { id: string; n: string; name: string; img: string; alt: string; text: string; points: string[]; views: { v: AtlasView; label?: string }[] };

const ITEMS: Item[] = [
  { id: 'white-matter', n: '01', name: 'White-matter fibers', img: whiteMatter, alt: 'Colored cerebral white-matter fiber bundles from the atlas',
    text: 'Refined association, projection and capsular fiber systems, shown in their original colors and organised into named anatomical collections.',
    points: ['Temporal stem and sagittal stratum', 'Association fiber systems', 'Internal capsule with thalamic projections'],
    views: [{ v: TEMPORAL_ASSOCIATION_VIEW, label: 'Temporal stem and association fibers' }, { v: THALAMUS_CAPSULE_VIEW }, { v: BRAIN_VIEW }] },
  { id: 'cranial-nerves', n: '02', name: 'Cranial nerves', img: cranial, alt: 'Cranial nerves with brain, skull and muscular context from the atlas',
    text: 'Explore cranial nerves I to XII with available nuclei, modeled branches and targets, alongside the bones, vessels and muscles that explain their course.',
    points: ['Nuclei and brain context', 'Muscular and visceral endpoints', 'Skull-base and head-neck regions'],
    views: [{ v: CRANIAL_NERVES_VIEW }, { v: SKULL_BASE_VIEW }, { v: HEAD_NECK_TOPOGRAPHY_VIEW }] },
  { id: 'peripheral', n: '03', name: 'Spinal and peripheral nerves', img: peripheral, alt: 'Spinal nerves and peripheral nerve plexuses from the atlas',
    text: 'Roots, trunks, divisions and cords, through to terminal nerves and the muscles they supply, with the spinal cord in axial detail.',
    points: ['Brachial plexus, roots C5 to T1', 'Lumbar and sacral plexuses', 'Spinal cord and nerve roots'],
    views: [{ v: BRACHIAL_PLEXUS_VIEW }, { v: LUMBOSACRAL_PLEXUS_VIEW }, { v: SPINAL_CORD_VIEW }] },
  { id: 'long-tracts', n: '04', name: 'Long tracts', img: longTracts, alt: 'Ascending and descending long tracts of the brainstem and spinal cord from the atlas',
    text: 'Descending motor and ascending sensory pathways, with cerebellar, vestibular and brainstem connections traced along their length.',
    points: ['Motor and sensory pathways', 'Cerebellar and vestibular routes', 'Brainstem nuclei and fibers'],
    views: [{ v: LONG_TRACTS_VIEW, label: 'Long tracts and brainstem pathways' }, { v: BRAINSTEM_CEREBELLUM_VIEW }] },
  { id: 'autonomic', n: '05', name: 'Autonomic nervous system', img: autonomic, alt: 'Sympathetic chain, autonomic plexuses and visceral context from the atlas',
    text: 'Sympathetic and parasympathetic divisions, head and neck ganglia, visceral plexuses and enteric anatomy, set among the organs they serve.',
    points: ['Sympathetic chain by vertebral level', 'Parasympathetic and head-neck ganglia', 'Visceral plexus and enteric context'],
    views: [{ v: AUTONOMIC_NERVOUS_SYSTEM_VIEW }] },
  { id: 'and-many-more', n: '06', name: 'And many more', img: manyMoreCollage, alt: 'Collage of head, neck and lower-limb topographic anatomy, muscular and venous anatomy, internal organs, and spinal cord anatomy',
    text: 'This is an evolving resource. New anatomical data and collections will be added in stages, including further topographic anatomy, the vascular system, internal organs and other systems. Existing content will continue to be reviewed, expanded and improved.',
    points: ['Topographic anatomy and regional relationships', 'The vascular system and circulation', 'Internal organs and other anatomical systems'],
    views: [{ v: HEAD_NECK_TOPOGRAPHY_VIEW, label: 'Explore current topographic anatomy' }] },
];

export function Highlights() {
  const [active, setActive] = useState(0);
  const reduce = useReducedMotion() || import.meta.env.SSR;
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const item = ITEMS[active];

  const onKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const map: Record<string, number> = { ArrowDown: i + 1, ArrowRight: i + 1, ArrowUp: i - 1, ArrowLeft: i - 1, Home: 0, End: ITEMS.length - 1 };
    if (!(e.key in map)) return;
    e.preventDefault();
    const next = (map[e.key] + ITEMS.length) % ITEMS.length;
    setActive(next);
    tabs.current[next]?.focus();
  };

  return (
    <section id="highlights" className="hl" aria-labelledby="hl-h" data-testid="section-highlights">
      <div className="hl-head">
        <Reveal><p className="hm-kicker">Current highlights / Nervous system</p></Reveal>
        <Reveal as="h2" className="hm-h2"><span id="hl-h">The nervous system, <em>in detail</em></span></Reveal>
        <Reveal delay={0.1}><p className="hl-intro">Explore five recent nervous-system highlights, and discover how this evolving atlas will grow as more anatomical data is added in stages.</p></Reveal>
      </div>

      <div className="hl-body">
        <div className="hl-tabs" role="tablist" aria-label="Atlas highlights" aria-orientation="vertical">
          {ITEMS.map((it, i) => (
            <button key={it.id} ref={(el) => { tabs.current[i] = el; }} type="button" role="tab"
              id={`hl-tab-${it.id}`} aria-controls="hl-panel" aria-selected={i === active} tabIndex={i === active ? 0 : -1}
              className="hl-tab" data-testid={`tab-highlight-${it.id}`} onClick={() => setActive(i)} onKeyDown={(e) => onKey(e, i)}>
              <span className="hl-tab-n">{it.n}</span><span className="hl-tab-name">{it.name}</span>
            </button>
          ))}
        </div>

        <div id="hl-panel" role="tabpanel" aria-labelledby={`hl-tab-${item.id}`} className="hl-panel" tabIndex={0}>
          <div className="hl-stage">
            <AnimatePresence initial={false} mode="popLayout">
              <motion.img key={item.id} src={item.img} alt={item.alt} loading="lazy" data-testid={`img-highlight-${item.id}`}
                initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 1.04 }} animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }} transition={{ duration: reduce ? 0.01 : 0.8, ease: [0.22, 1, 0.36, 1] }} />
            </AnimatePresence>
          </div>
          <AnimatePresence initial={false} mode="wait">
            <motion.div key={item.id} className="hl-copy"
              initial={reduce ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={reduce ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}>
              <p className="hm-kicker">{item.n} / {String(ITEMS.length).padStart(2, '0')}</p>
              <h3 className="hl-name">{item.name}</h3>
              <p className="hl-text">{item.text}</p>
              <ul className="hl-points">{item.points.map((p) => <li key={p}>{p}</li>)}</ul>
              <div className="hl-links">
                {item.views.map(({ v, label }) => (
                  <Link key={v.id} href={v.href} className="hl-go" data-testid={`link-highlight-${v.id}`}>
                    <span>{label ?? v.label}</span><ArrowUpRight size={15} aria-hidden />
                  </Link>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <Reveal className="hl-ongoing">
        <p className="hm-kicker">Work in progress</p>
        <p className="hl-ongoing-text">This is an atlas in continuous development. Its anatomy, organisation and navigation will keep being reviewed, expanded and improved, with corrections and suggestions from the anatomy community helping guide that work.</p>
        <p><Link href="/contact" className="hm-link" data-testid="link-highlight-contribute">Share a correction or suggestion <ArrowUpRight size={15} aria-hidden /></Link></p>
      </Reveal>
    </section>
  );
}
