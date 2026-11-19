import brainFibers from '../assets/atlas-brain-fibers.webp';
import '../styles/logo.css';

export function BrandLogo({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`brand-logo${compact ? ' brand-logo--compact' : ''}`} role="img" aria-label="Anatomia Aperta 3D">
      <img src={brainFibers} alt="" width={600} height={446} />
      <span className="brand-logo-text" aria-hidden="true">
        <span>Anatomia</span>
        <span>Aperta <b>3D</b></span>
      </span>
    </span>
  );
}
