import { useEffect } from 'react';
import { Layers } from 'lucide-react';
import basicMenu from '@/assets/navigation-basic-menu.webp';
import basicAnatomy from '@/assets/navigation-basic-anatomy.webp';
import advancedAnatomy from '@/assets/navigation-advanced-anatomy.webp';
import rightMenu from '@/assets/navigation-right-menu.webp';
import cranialNerves from '@/assets/navigation-cranial-nerves.webp';
import '../../styles/home-navigation.css';

const DIAGRAM_ANCHORS = ['interface-navigation', 'navigation-basic', 'navigation-advanced', 'navigation-mix'];

export function HomeNavigationIllustrations() {
  // Honour illustration deep links; ordinary homepage visits are never scrolled.
  useEffect(() => {
    const anchor = window.location.hash.slice(1);
    if (!DIAGRAM_ANCHORS.includes(anchor)) return;
    const id = window.requestAnimationFrame(() => {
      document.getElementById(anchor)?.scrollIntoView({ block: 'start', behavior: 'instant' });
    });
    return () => window.cancelAnimationFrame(id);
  }, []);

  return (
    <section id="interface-navigation" className="nv" aria-labelledby="nv-title" data-testid="section-interface-navigation">
      <header className="nv-head">
        <p className="hm-kicker">How to read the atlas — illustrated examples</p>
        <h2 id="nv-title" className="nv-title">Three ways <em>through</em> the same anatomy.</h2>
      </header>

      <ol className="nv-list">
        {/* 01 BASIC */}
        <li id="navigation-basic" className="nv-plate" data-testid="diagram-basic-navigation">
          <div className="nv-num"><span>01</span><b>Basic navigation</b><i>Upper horizontal menu</i></div>
          <figure className="nv-capture">
            <div className="nv-horizontal-menu" tabIndex={0} role="region" aria-label="Upper horizontal category menu screenshot" data-testid="basic-horizontal-menu">
              <img src={basicMenu} width={2160} height={214} alt="Actual upper category menu: Dura and meninges, Brain gross anatomy, Limbic system, Basal forebrain, Ventricular system, White matter fibers, and Basal ganglia and diencephalon" loading="lazy" />
            </div>
            <p className="nv-menu-hint">Scroll horizontally to see the category menu.</p>
            <img className="nv-basic-anatomy" src={basicAnatomy} width={1000} height={962} alt="White matter pathways with surrounding brain context, taken from the supplied horizontal-menu screenshot" loading="lazy" />
            <figcaption className="nv-cap">
              Choose a collection from the upper horizontal menu to display its anatomy.
            </figcaption>
          </figure>
        </li>

        {/* 02 ADVANCED */}
        <li id="navigation-advanced" className="nv-plate" data-testid="diagram-advanced-navigation">
          <div className="nv-num"><span>02</span><b>Advanced navigation</b><i>Right-hand menu</i></div>
          <figure className="nv-capture">
            <div className="nv-viewer-pair">
              <img className="nv-anatomy" src={advancedAnatomy} width={880} height={1052} alt="Middle cranial fossa anatomy from the supplied atlas screenshot" loading="lazy" />
              <img className="nv-right-menu" src={rightMenu} width={760} height={1022} alt="Actual right-hand menu showing Middle cranial fossa, expandable Skull Base subdivisions, and Show, Hide and Isolate controls" loading="lazy" />
            </div>
            <figcaption className="nv-cap">
              Open subdivisions in the right-hand menu, then use Show, Hide or Isolate to control the anatomy on screen.
            </figcaption>
          </figure>
        </li>

        {/* 03 MIX */}
        <li id="navigation-mix" className="nv-plate" data-testid="diagram-mix-categories">
          <div className="nv-num"><span>03</span><b>Mixing categories</b><i>Mix categories on</i></div>
          <figure className="nv-capture">
            <div className="nv-mix-scene">
              <div className="nv-mix-indicator" role="img" aria-label="Mix categories on, illustrated state">
                <Layers size={16} aria-hidden="true" />
                <span>Mix categories</span><b>On</b>
              </div>
              <div className="nv-viewer-pair">
                <img className="nv-anatomy" src={cranialNerves} width={960} height={1030} alt="Creator-supplied cranial nerves image with surrounding head anatomy" loading="lazy" />
                <img className="nv-right-menu" src={rightMenu} width={760} height={1022} alt="Actual right-hand collection menu, alongside the cranial nerves image" loading="lazy" />
              </div>
            </div>
            <figcaption className="nv-cap">
              Turn on Mix categories to keep the current anatomy visible. Use Add or Show in the right-hand menu to include more structures.
            </figcaption>
          </figure>
        </li>
      </ol>
    </section>
  );
}
