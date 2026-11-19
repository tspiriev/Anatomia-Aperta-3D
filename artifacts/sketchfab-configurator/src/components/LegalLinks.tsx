import { Fragment } from 'react';
import { Link } from 'wouter';
import { legalPolicies } from '@/data/legalPolicies';

export function LegalLinks() {
  return (
    <nav className="legal-links" aria-label="Legal information">
      {legalPolicies.map((policy, index) => (
        <Fragment key={policy.slug}>
          {index > 0 && <span aria-hidden="true">·</span>}
          <Link href={`/${policy.slug}`} data-testid={`link-${policy.slug}`}>{policy.title}</Link>
        </Fragment>
      ))}
    </nav>
  );
}
