import { PageShell, TextPage, Block } from '@/components/PageShell';

export default function Contact() {
  return (
    <PageShell title="Contact — Anatomia Aperta 3D" description="Contact information for Anatomia Aperta 3D.">
      <TextPage eyebrow="Contact" heading="Contact"
        lead="For questions about Anatomia Aperta 3D, anatomical corrections, academic collaboration, or other project-related inquiries, please contact us by email">
        <Block title="Email">
          <a href="mailto:3Datlas@pm.me" className="hm-link" data-testid="link-contact-email">3Datlas@pm.me</a>
        </Block>
        <Block title="GitHub repository">
          <a href="https://github.com/tspiriev/Anatomia-Aperta-3D" target="_blank" rel="noopener noreferrer" className="hm-link" data-testid="link-contact-github">Anatomia Aperta 3D on GitHub</a>
        </Block>
      </TextPage>
    </PageShell>
  );
}
