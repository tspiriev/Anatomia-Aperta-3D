import type { MusculoskeletalEntry } from './musculoskeletalTaxonomy';
import { upperLimbBoneGroup } from './musculoskeletalSkeleton';

export type UpperLimbTissue = 'bones' | 'muscles' | 'joints-ligaments' | 'fasciae' | 'bursae' | 'attachments';
export const limbIdentity = (name: string) => name.toLowerCase().trim()
  .replace(/(?:\.\d{3})?(?:_\d+)?$/, '')
  .replace(/\.(?:[oe]\d*)?[lr]$/, '').replace(/_/g, ' ')
  .replace(/[()]/g, '').replace(/\bmuscles?\b/g, '').replace(/\s+/g, ' ').trim();
const within = (path: readonly string[], parent: readonly string[]) => parent.every((p, i) => path[i] === p);

/** Named muscle groups, never a spatial interpretation of numbered patches.
 * The same whole source muscle can cross several topographic regions.
 * https://www.ncbi.nlm.nih.gov/books/NBK554420/
 * https://www.ncbi.nlm.nih.gov/books/NBK539784/
 */
function muscleLocations(n: string): readonly string[][] {
  const locations: string[][] = [];
  if (/deltoid|supraspinatus|infraspinatus|subscapularis|teres (major|minor)/.test(n)) locations.push(['shoulder']);
  if (/biceps brachii|coracobrachialis|^brachialis$/.test(n)) locations.push(['arm', 'anterior']);
  if (/biceps brachii|^brachialis$/.test(n)) locations.push(['elbow']);
  if (/triceps brachii|^anconeus$/.test(n)) locations.push(['arm', 'posterior'], ['elbow']);
  if (/palmaris longus|flexor carpi (radialis|ulnaris)|pronator teres/.test(n))
    locations.push(['forearm', 'anterior', 'superficial'], ['elbow']);
  if (/flexor digitorum superficialis/.test(n))
    locations.push(['forearm', 'anterior', 'intermediate'], ['elbow']);
  if (/flexor digitorum profundus|flexor pollicis longus|pronator quadratus/.test(n))
    locations.push(['forearm', 'anterior', 'deep']);
  if (/^anconeus$|brachioradialis|extensor carpi (radialis|ulnaris)|extensor digitorum|extensor digiti minimi/.test(n))
    locations.push(['forearm', 'posterior', 'superficial'], ['elbow']);
  if (/^supinator$|abductor pollicis longus|extensor pollicis (longus|brevis)|extensor indicis/.test(n))
    locations.push(['forearm', 'posterior', 'deep']);
  if (/^supinator$/.test(n)) locations.push(['elbow']);
  if (/brachioradialis|extensor carpi radialis/.test(n)) locations.push(['forearm', 'mobile-wad']);
  if (/palmaris longus|flexor carpi|flexor digitorum|flexor pollicis longus/.test(n)) locations.push(['wrist', 'palmar']);
  if (/flexor digitorum|flexor pollicis longus/.test(n)) locations.push(['wrist', 'palmar', 'carpal-tunnel']);
  if (/extensor carpi|extensor digitorum|extensor digiti minimi|extensor pollicis|extensor indicis|abductor pollicis longus/.test(n))
    locations.push(['wrist', 'dorsal']);
  if (/(?:abductor|flexor) pollicis brevis|opponens pollicis/.test(n)) locations.push(['hand', 'thenar']);
  if (/adductor pollicis/.test(n)) locations.push(['hand', 'adductor']);
  if (/digiti minimi.*(?:of hand|manus)/.test(n) && !/extensor/.test(n)) locations.push(['hand', 'hypothenar']);
  if (/lumbrical.*hand/.test(n)) locations.push(['hand', 'central']);
  if (/interossei/.test(n)) locations.push(['hand', 'interosseous']);
  return locations;
}

function boneMatches(n: string, path: readonly string[]): boolean {
  const bone = upperLimbBoneGroup(n);
  switch (path[0]) {
    case 'shoulder': return bone === 'shoulder-girdle' || bone === 'arm'
      || /^manubrium of sternum$|^first rib\b/.test(n);
    case 'arm': return ['shoulder-girdle', 'arm', 'forearm'].includes(bone ?? '') && !/^clavicle/.test(n);
    case 'elbow': return bone === 'arm' || bone === 'forearm';
    case 'forearm': return ['arm', 'forearm', 'wrist', 'hand'].includes(bone ?? '');
    case 'wrist': return path[2] === 'carpal-tunnel' ? bone === 'wrist'
      : bone === 'forearm' || bone === 'wrist' || /metacarpal/.test(n);
    case 'hand':
      if (!path[1]) return bone === 'wrist' || bone === 'hand';
      if (path[1] === 'thenar')
        return /first (?:metacarpal|finger)|scaphoid|trapezium|trapezoid|capitate/.test(n);
      if (path[1] === 'hypothenar')
        return /fifth (?:metacarpal|finger)|pisiform|hamate/.test(n);
      if (path[1] === 'adductor')
        return /(?:first|second|third) metacarpal|first finger|capitate/.test(n);
      return bone === 'hand';
    default: return false;
  }
}

function jointMatches(n: string, path: readonly string[]): boolean {
  const shoulder = /clavicular|interclavicular|coraco|scapular|glenohumeral|glenoid|conoid|^trapezoid ligament|transverse humeral/.test(n);
  const elbow = /of elbow|annular ligament of radius|^ulnar collateral ligament$|^radial collateral ligament$|quadrate ligament|oblique cord|^common (flexor|extensor) tendon$/.test(n);
  const membrane = /interosseous membrane of forearm|oblique cord/.test(n);
  const hand = /metacarp|interphalangeal/.test(n);
  const wrist = /wrist|carpal|carpo|radio.ulnar|ulno|luno|scapho|piso|trapezio|trapezoideo|triquetro|capitohamate|radiocapitate/.test(n);
  switch (path[0]) {
    case 'shoulder': return shoulder;
    case 'arm': return elbow || /glenohumeral|glenoid/.test(n);
    case 'elbow': return elbow;
    case 'forearm': return membrane || elbow || wrist;
    case 'wrist': return path[2] !== 'carpal-tunnel' && wrist && !/metacarpophalangeal/.test(n);
    // Unsegmented hand capsules cannot be claimed as thumb-/digit-specific.
    case 'hand': return !path[1] && hand;
    default: return false;
  }
}

function fasciaMatches(n: string, path: readonly string[]): boolean {
  if (/intermuscular septum of arm|brachial fascia/.test(n) && !/antebrachial/.test(n))
    return path[0] === 'arm'; // Both septa are shared compartment boundaries.
  if (/deltoid fascia|clavipectoral fascia/.test(n)) return path[0] === 'shoulder';
  if (/antebrachial fascia/.test(n)) return path[0] === 'forearm' && path.length < 3;
  const sheath = /tendon sheath|tendon sheaths|common flexor tendon sheath/.test(n);
  const palmar = /flexor|palmar/.test(n) && !/extensor/.test(n);
  const dorsal = /extensor|ext\.|abd\. pollicis longus/.test(n);
  if (sheath || /retinaculum of wrist/.test(n)) {
    if (path[0] === 'wrist' && path[2] === 'carpal-tunnel')
      return /common flexor tendon sheath|sheath of flexor pollicis longus|flexor retinaculum/.test(n);
    if (path[0] === 'forearm' && path.length >= 3 && sheath)
      return /common flexor tendon sheath/.test(n)
        ? path[1] === 'anterior' && ['intermediate', 'deep'].includes(path[2])
        : muscleLocations(n).some(location => within(location, path));
    if (path[0] === 'wrist') return !path[1] || (path[1] === 'palmar' ? palmar : dorsal);
    if (path[0] === 'forearm' && sheath)
      return !path[1] || (path[1] === 'anterior' ? palmar : path[1] === 'posterior' && dorsal);
    if (path[0] === 'hand' && /flexor retinaculum/.test(n))
      return !path[1] || path[1] === 'thenar' || path[1] === 'hypothenar';
  }
  if (/palmar aponeurosis|dorsal fascia of hand|fibrous sheath of digit of hand|synovial sheaths of digits of hand|superficial transverse metacarpal/.test(n))
    return path[0] === 'hand' && (!path[1] || ['central', 'interosseous'].includes(path[1]));
  return false;
}

function bursaMatches(n: string, path: readonly string[]): boolean {
  if (/bicipitoradial/.test(n)) return path[0] === 'elbow' || (path[0] === 'arm' && path[1] !== 'posterior');
  if (/triceps brachii/.test(n)) return path[0] === 'elbow' || (path[0] === 'arm' && path[1] !== 'anterior');
  if (/coracobrachial/.test(n)) return path[0] === 'shoulder' || (path[0] === 'arm' && path[1] !== 'posterior');
  return path[0] === 'shoulder' && /acromial|subdeltoid|infraspinatus|teres major|intertubercular/.test(n);
}

export function upperLimbTissue(entry: MusculoskeletalEntry): UpperLimbTissue {
  // Preserve CSV categories; correct only the teaching label of named septa
  // and tendon sheaths filed under Muscles in that export.
  return entry.category === 'muscles' && /intermuscular septum|tendon sheath/i.test(entry.name)
    ? 'fasciae' : entry.category;
}

export function upperLimbEntryMatches(entry: MusculoskeletalEntry, path: readonly string[]): boolean {
  if (!entry.regions.includes('upper-limb') && !(entry.category === 'bones'
    && /^manubrium of sternum$|^first rib\b/.test(limbIdentity(entry.name)))) return false;
  const n = limbIdentity(entry.name);
  switch (upperLimbTissue(entry)) {
    case 'bones': return boneMatches(n, path);
    case 'joints-ligaments': return jointMatches(n, path);
    case 'fasciae': return fasciaMatches(n, path);
    case 'bursae': return bursaMatches(n, path);
    default: return muscleLocations(n).some(location => within(location, path));
  }
}
