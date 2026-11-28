import { Link } from 'wouter';
import logo from '../../assets/project-logo-clean-transparent.webp';

export function ProjectIntroduction() {
  return (
    <section className="hm-project" aria-label="About Anatomia Aperta 3D">
      <div className="hm-project-inner">
        <img className="hm-project-logo" src={logo} alt="Anatomia Aperta 3D" width={1536} height={876} loading="lazy" />
        <div className="hm-project-copy">
          <p className="hm-project-lead">Anatomia Aperta 3D is a nonprofit, open-access project providing interactive visualization of human anatomy for education and academic use.</p>
          <p>Built upon BodyParts3D/Anatomography and Z-Anatomy, the atlas has been extensively reviewed, corrected, reorganized, and expanded, with particular development of the central, peripheral, and autonomic nervous systems, including structures and relationships absent or incomplete in the original datasets</p>
          <p>Learn more about the project, sources, modifications, and licensing in <Link href="/about" className="hm-link" data-testid="link-project-about">About</Link>.</p>
        </div>
      </div>
    </section>
  );
}
