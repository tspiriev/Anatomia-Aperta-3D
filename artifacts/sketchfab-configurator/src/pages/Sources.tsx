import { ExternalLink } from 'lucide-react';
import { PageShell, TextPage } from '@/components/PageShell';
import sourcesBackground from '@/assets/sources-neuroanatomy-background.webp';

const REPOSITORY_URL = 'https://github.com/tspiriev/Anatomia-Aperta-3D';
const RELATED_PROJECT_URL = 'https://3datlasofneurologicalsurgery.org';

export default function Sources() {
  return (
    <PageShell title="Sources — Anatomia Aperta 3D" description="The official Anatomia Aperta 3D GitHub repository: project documentation, source attribution, licensing, the full modification record, and 3D model datasets." backgroundImage={sourcesBackground}>
      <TextPage eyebrow="Sources" heading="Anatomia Aperta 3D — GitHub Repository">
        <div className="tp-copy">
          <p>The official GitHub repository documents the development of Anatomia Aperta 3D and provides transparent access to the project’s methodology and provenance. It includes the complete record of anatomical corrections and additions, source attribution, licensing information, and access to the 3D anatomical datasets.</p>
          <p>The repository contains a detailed 202-entry modification record, documenting the progressive review, correction, reconstruction, and expansion of the source anatomical models, with particular emphasis on the central, peripheral, and autonomic nervous systems.</p>
          <p>Available resources: project documentation · source attribution · licensing · full modification record · 3D model datasets</p>
        </div>
        <a href={REPOSITORY_URL} target="_blank" rel="noopener noreferrer" data-testid="link-github-repository" className="hm-btn">
          View repository on GitHub <ExternalLink className="h-3.5 w-3.5" />
        </a>
        <div className="tp-copy mt-8">
          <p>Apart from Anatomia Aperta 3D, please visit our other open-access project, <a href={RELATED_PROJECT_URL} target="_blank" rel="noopener noreferrer" data-testid="link-neurological-surgery-atlas" className="hm-link">3D Atlas of Neurological Surgery</a>, which is an interactive 3D atlas based on photorealistic anatomical models derived from anatomical dissections.</p>
        </div>
      </TextPage>
    </PageShell>
  );
}
