import { Link } from 'wouter';
import { Block, PageShell, TextPage } from '@/components/PageShell';
import { legalPolicies } from '@/data/legalPolicies';

const repository = 'https://github.com/tspiriev/Anatomia-Aperta-3D';

function PolicyParagraph({ text }: { text: string }) {
  return (
    <p>
      {text.split(/(GitHub repository|Licensing & Attribution section)/g).map((part, index) => {
        if (part === 'Licensing & Attribution section') {
          return <Link key={index} href="/licensing-attribution" className="hm-link">{part}</Link>;
        }
        if (part === 'GitHub repository') {
          return <a key={index} href={repository} target="_blank" rel="noopener noreferrer" className="hm-link">{part}</a>;
        }
        return part;
      })}
    </p>
  );
}

export default function Legal({ slug }: { slug: string }) {
  const policy = legalPolicies.find((item) => item.slug === slug);
  if (!policy) throw new Error(`Unknown legal policy: ${slug}`);
  return (
    <PageShell title={`${policy.title} — Anatomia Aperta 3D`} description={`Anatomia Aperta 3D — ${policy.title}.`}>
      <TextPage eyebrow={policy.title} heading={`Anatomia Aperta 3D — ${policy.title}`} lead={policy.updated}>
        {policy.sections.map((section, index) => {
          const paragraphs = section.paragraphs.map((text, paragraphIndex) => <PolicyParagraph key={paragraphIndex} text={text} />);
          return section.title
            ? <Block key={index} title={section.title}>{paragraphs}</Block>
            : <div key={index} className="tp-copy">{paragraphs}</div>;
        })}
      </TextPage>
    </PageShell>
  );
}
