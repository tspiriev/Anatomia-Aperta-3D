import { Link } from 'wouter';
import { PageShell, TextPage, Block } from '@/components/PageShell';
import aboutBackground from '@/assets/about-neuroanatomy-background.webp';

export default function About() {
  return (
    <PageShell title="About — Anatomia Aperta 3D" description="About Anatomia Aperta 3D, a nonprofit open-access interactive human anatomy atlas." backgroundImage={aboutBackground}>
      <TextPage eyebrow="About" heading="About">
        <Block title="Acknowledgments and foundations">
          <p>Anatomia Aperta 3D stands on the work of anatomists, 3D artists, researchers, and developers who created the open anatomical resources on which this atlas is built. The project would not have been possible without BodyParts3D/Anatomography and Z-Anatomy, whose creators made their work available to the wider community and laid the foundations for future updates and improvements of their original datasets allowing further academic improvement and research.</p>
          <p>Links to BodyParts3D/Anatomography: <a href="https://lifesciencedb.jp/bp3d/" target="_blank" rel="noopener noreferrer" className="hm-link">https://lifesciencedb.jp/bp3d/</a></p>
          <p>Link to Z-Anatomy (official webpage and Github repository): <a href="https://www.z-anatomy.com/" target="_blank" rel="noopener noreferrer" className="hm-link">https://www.z-anatomy.com/</a>, <a href="https://sketchfab.com/Z-Anatomy" target="_blank" rel="noopener noreferrer" className="hm-link">https://sketchfab.com/Z-Anatomy</a>, <a href="https://github.com/Z-Anatomy" target="_blank" rel="noopener noreferrer" className="hm-link">https://github.com/Z-Anatomy</a></p>
        </Block>
        <Block title="Anatomical and atlas development">
          <p>As a neurosurgeon with interest in neuroanatomy my contribution to Anatomia Aperta 3D has been to extensively review, correct, reorganize, and expand the original anatomical datasets to the best of my anatomical knowledge. Particular emphasis was placed on the nervous system, including extensive reconstruction of white-matter pathways, thalamus, hypothalamus, brainstem and cerebellar pahtways, brainstem nuclei, spinal cord anatomy, cranial and peripheral nerves, spinal nerves, brachial and lumbar plexuses, the sympathetic and parasympathetic nervous systems, autonomic and visceral nervous system. Additional work included corrections and additions to the vascular, meningeal, musculoskeletal, and cardiac anatomy.</p>
          <p>Beyond the anatomical modifications, I developed the 3D visualization and organization of the atlas itself, including the website, interactive viewer, anatomical hierarchy, interface, menus, materials, and presentation of the models as a coherent educational resource.</p>
        </Block>
        <Block title="Documentation and open access">
          <p>All modifications are documented in a dedicated Atlas Development section, while the datasets, source information, and project files are made openly available through GitHub to ensure transparency and allow the work to be studied, reused, and further developed.</p>
          <p>A detailed record of the anatomical corrections, additions, and modifications is also provided within the project.</p>
        </Block>
        <Block title="About the Author">
          <p>Toma Spiriev, MD, PhD, FEBNS is a neurosurgeon with a particular interest in surgical anatomy, 3D anatomical visualization, photogrammetry, VR. Apart from Anatomia Aperta 3D, please visit our other open-access project, <a href="https://3datlasofneurologicalsurgery.org" target="_blank" rel="noopener noreferrer" data-testid="link-neurological-surgery-atlas" className="hm-link">3D Atlas of Neurological Surgery</a>, which is an interactive 3D atlas based on photorealistic anatomical models derived from anatomical dissections.</p>
        </Block>
        <Block title="Acknowledgements">
          <p>Anatomia Aperta 3D gratefully acknowledges Sketchfab and the Sketchfab Cultural &amp; Heritage program for supporting the project by providing access to premium 3D hosting and visualization services. This support contributes to the open-access presentation and dissemination of the project’s anatomical models.</p>
        </Block>
        <Link href="/atlas" className="hm-btn">Explore Atlas</Link>
      </TextPage>
    </PageShell>
  );
}
