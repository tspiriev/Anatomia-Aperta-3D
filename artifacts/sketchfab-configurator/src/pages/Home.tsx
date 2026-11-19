import { PageShell } from '@/components/PageShell';
import { HomeHero } from '@/components/home/HomeHero';
import { HomeNavigationIllustrations } from '@/components/home/HomeNavigationIllustrations';
import { Statement } from '@/components/home/Statement';
import { Highlights } from '@/components/home/Highlights';
import { ProjectIntroduction } from '@/components/home/ProjectIntroduction';
import { Closing } from '@/components/home/Closing';
import '../styles/home.css';

export default function Home() {
  return (
    <PageShell title="Anatomia Aperta 3D — Open-access interactive anatomy atlas"
      description="A nonprofit, open-access interactive 3D human anatomy atlas for education, research, and anatomical exploration.">
      <div className="home">
        <HomeHero />
        <HomeNavigationIllustrations />
        <Statement />
        <Highlights />
        <ProjectIntroduction />
        <Closing />
      </div>
    </PageShell>
  );
}
