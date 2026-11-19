import policyText from '@/assets/legal-policies.txt?raw';

export const legalPolicies = [
  {
    slug: 'terms-of-use',
    title: 'Terms of Use',
    headings: ['Educational and Research Purpose', 'Anatomical Accuracy', 'Clinical Use', 'Intellectual Property and Licensing', 'Availability and Updates', 'Disclaimer'],
    nextTitle: 'Licensing & Attribution',
  },
  {
    slug: 'licensing-attribution',
    title: 'Licensing & Attribution',
    headings: ['BodyParts3D / Anatomography', 'Z-Anatomy', 'Anatomia Aperta 3D Modifications', 'Third-Party Material', 'Attribution', 'Full Licensing Documentation'],
    nextTitle: 'Privacy Policy',
  },
  {
    slug: 'privacy-policy',
    title: 'Privacy Policy',
    headings: ['External Services', 'Changes'],
    nextTitle: 'Support Anatomia Aperta 3D',
  },
].map((policy) => {
  const lines = policyText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const start = lines.indexOf(`Anatomia Aperta 3D — ${policy.title}`) + 1;
  const end = lines.indexOf(policy.nextTitle, start);
  if (start === 0 || end === -1) throw new Error(`Missing legal policy: ${policy.title}`);
  const body = lines.slice(start, end);
  const updated = body[0]?.startsWith('Last updated:') ? body.shift() : undefined;
  const sections: { title?: string; paragraphs: string[] }[] = [{ paragraphs: [] }];
  for (const line of body) {
    if (policy.headings.includes(line)) {
      sections.push({ title: line, paragraphs: [] });
    } else {
      sections[sections.length - 1].paragraphs.push(line);
    }
  }
  return { ...policy, updated, sections };
});
