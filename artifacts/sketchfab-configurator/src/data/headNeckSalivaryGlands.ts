import { normalizeAdvancedObjectName } from './advancedCollection';

export type SalivaryFamily = 'parotid' | 'submandibular' | 'sublingual';

/** Strict anatomical identities, not a substring match on "parotid":
 * nerves, vessels and pathology names must never become gland objects. */
export function headNeckSalivaryGland(rawName: string): { family: SalivaryFamily; duct: boolean } | null {
  const name = normalizeAdvancedObjectName(rawName)
    .replace(/\b(?:left|right)\b/g, '').replace(/[()]/g, '')
    .replace(/(?:[. ]+[lr])(?:[. ]+\d+)*$/g, '').replace(/\s+/g, ' ').trim()
    .replace('submadinular', 'submandibular');
  const match = name.match(/^(?:(?:accessory|superficial|deep)(?: lobes?| part)?(?: of(?: the)?)? )?(parotid|submandibular|sublingual)(?: salivary)?(?: (?:glands?|ducts?))?(?: (?:superficial|deep)(?: lobes?| part)?)?$/);
  return match ? { family: match[1] as SalivaryFamily, duct: /\bducts?\b/.test(name) } : null;
}
