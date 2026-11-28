/** Region relationships for whole source meshes, not clipped spatial segments. */
export const UPPER_LIMB_REGIONS = [
  ['shoulder-girdle', 'Shoulder girdle', [
    ['clavicular', 'Clavicular and infraclavicular region'], ['deltoid', 'Deltoid region'], ['scapular', 'Scapular region'],
  ]],
  ['axillary', 'Axillary region', [
    ['walls', 'Axillary walls and muscular boundaries'], ['vessels', 'Axillary arteries and veins'], ['brachial-plexus', 'Brachial plexus'],
  ]],
  ['arm', 'Arm (brachium)', [
    ['anterior', 'Anterior compartment'], ['posterior', 'Posterior compartment'], ['medial', 'Medial neurovascular structures'],
  ]],
  ['elbow', 'Elbow', [
    ['cubital-fossa', 'Cubital fossa'], ['posterior', 'Posterior elbow'], ['medial', 'Medial elbow'], ['lateral', 'Lateral elbow'],
  ]],
  ['forearm', 'Forearm', [
    ['anterior', 'Anterior compartment'], ['posterior', 'Posterior compartment'], ['radial', 'Radial neurovascular structures'], ['ulnar', 'Ulnar neurovascular structures'],
  ]],
  ['wrist', 'Wrist', [
    ['palmar', 'Palmar wrist'], ['dorsal', 'Dorsal wrist'], ['carpal-tunnel', 'Carpal tunnel region'],
  ]],
  ['hand', 'Hand', [
    ['thenar', 'Thenar region'], ['hypothenar', 'Hypothenar region'], ['central', 'Central palm'], ['dorsal', 'Dorsum of hand'], ['digital', 'Digital anatomy'],
  ]],
] as const;

export const UPPER_LIMB_TISSUES = [
  ['bones-joints', 'Bones and joints', 'skeletal'],
  ['muscles-tendons', 'Muscles and tendons', 'muscular'],
  ['arteries', 'Arteries', 'vascular'], ['veins', 'Veins', 'vascular'],
  ['nerves', 'Nerves', 'nervous'],
  ['fasciae-ligaments-bursae', 'Fasciae, ligaments and bursae', 'joints'],
] as const;
export type UpperLimbTissue = typeof UPPER_LIMB_TISSUES[number][0];
export const UPPER_LIMB_PLEXUS_PARTS = [
  ['roots', 'Roots'], ['trunks', 'Trunks'], ['divisions', 'Divisions'],
  ['cords', 'Cords'], ['collateral', 'Collateral branches'], ['terminal', 'Terminal branches'],
] as const;

type Rule = readonly [string, RegExp];
const muscleRules: readonly Rule[] = [
  ['shoulder-girdle/clavicular', /pectoralis|subclavius|clavipectoral|pectoral fascia|coracobrachial bursa/],
  ['shoulder-girdle/deltoid', /deltoid|subacromial|acromial bursa|intertubercular tendon sheath/],
  ['shoulder-girdle/scapular', /supraspinatus|infraspinatus|subscapularis|teres (?:major|minor)|trapezius|rhomboid|levator scapulae|latissimus/],
  ['axillary/walls', /pectoralis|subclavius|subscapularis|teres major|latissimus|serratus anterior|coracobrachial|short head of biceps|long head of triceps|clavipectoral|pectoral fascia/],
  ['arm/anterior', /biceps|brachialis|coracobrachialis|^brachial fascia|intermuscular septum of arm|intertubercular tendon sheath/],
  ['arm/posterior', /triceps|anconeus|^brachial fascia|intermuscular septum of arm/],
  ['arm/medial', /^brachial fascia|medial intermuscular septum of arm/],
  ['elbow/cubital-fossa', /biceps|brachialis|brachioradialis|pronator teres|bicipitoradial/],
  ['elbow/posterior', /triceps|anconeus/],
  ['elbow/medial', /flexor carpi ulnaris|flexor digitorum superficialis|pronator teres/],
  ['elbow/lateral', /brachioradialis|supinator|extensor carpi radialis|extensor digitorum|extensor digiti minimi|humeral head of extensor carpi ulnaris/],
  ['forearm/anterior', /flexor (?:carpi|pollicis longus|digitorum)|palmaris longus|pronator|antebrachial fascia/],
  ['forearm/posterior', /extensor|supinator|abductor pollicis longus|abd\. pollicis longus|antebrachial fascia/],
  ['forearm/radial', /brachioradialis|flexor carpi radialis|abductor pollicis longus|extensor carpi radialis/],
  ['forearm/ulnar', /flexor carpi ulnaris|extensor carpi ulnaris|flexor digitorum profundus/],
  ['wrist/palmar', /flexor (?:carpi|pollicis longus|digitorum)|palmaris longus|flexor retinaculum|common flexor tendon sheath/],
  ['wrist/dorsal', /extensor|abductor pollicis longus|abd\. pollicis longus/],
  ['wrist/carpal-tunnel', /flexor digitorum|flexor pollicis longus|flexor retinaculum|common flexor tendon sheath/],
  ['hand/thenar', /abductor pollicis brevis|flexor pollicis brevis|opponens pollicis|adductor pollicis/],
  ['hand/hypothenar', /(?:abductor|flexor|opponens) digiti minimi.*(?:hand|muscle)/],
  ['hand/central', /lumbrical|palmar interossei|palmar aponeurosis|adductor pollicis|flexor digitorum|common flexor tendon sheath|transverse metacarpal ligament/],
  ['hand/dorsal', /dorsal interossei|dorsal fascia|extensor (?:digitorum|indicis|digiti minimi|pollicis)/],
  ['hand/digital', /flexor digitorum|flexor pollicis longus|extensor (?:digitorum|indicis|digiti minimi|pollicis)|sheath.*digit|fibrous sheath|transverse metacarpal ligament/],
];
const vesselRules: readonly Rule[] = [
  ['shoulder-girdle/clavicular', /subclavian|suprascapular|transverse cervical|thoraco.acromial|cephalic/],
  ['shoulder-girdle/deltoid', /circumflex humeral|thoraco.acromial|cephalic/],
  ['shoulder-girdle/scapular', /suprascapular|circumflex scapular|subscapular|thoracodorsal/],
  ['axillary/vessels', /axillary|subscapular|circumflex (?:humeral|scapular)|lateral thoracic|thoraco.acromial|thoracodorsal|pectoral branches/],
  ['arm/medial', /^brachial (?:artery|veins)|basilic|cephalic|deep brachial|ulnar collateral|radial collateral|middle collateral/],
  ['arm/posterior', /deep brachial|radial collateral|middle collateral/],
  ['elbow/cubital-fossa', /^brachial (?:artery|veins)|median cubital|median antebrachial|cephalic|basilic|^radial (?:artery|veins)|^ulnar (?:artery|veins)/],
  ['elbow/posterior', /^(?:(?:deep )?brachial|(?:superior ulnar|inferior ulnar|radial|middle) collateral|(?:ulnar|radial) recurrent|recurrent interosseous) artery$/],
  ['elbow/medial', /ulnar collateral|ulnar recurrent|basilic/],
  ['elbow/lateral', /radial collateral|radial recurrent|recurrent interosseous|cephalic/],
  ['forearm/anterior', /anterior interosseous|common interosseous|median antebrachial|basilic|cephalic/],
  ['forearm/posterior', /posterior interosseous|recurrent interosseous|cephalic/],
  ['forearm/radial', /^radial (?:artery|veins)|cephalic/],
  ['forearm/ulnar', /^ulnar (?:artery|veins)|basilic/],
  ['wrist/palmar', /palmar carpal|^radial (?:artery|veins)|^ulnar (?:artery|veins)|median antebrachial/],
  ['wrist/dorsal', /dorsal carpal|carpal anastomosis|dorsal venous network|cephalic|basilic/],
  ['hand/thenar', /^radial artery|deep palmar arch/],
  ['hand/hypothenar', /^ulnar artery|superficial palmar arch/],
  ['hand/central', /palmar arch|venous palmar arch|palmar metacarpal/],
  ['hand/dorsal', /dorsal (?:venous network|metacarpal|digital)/],
  ['hand/digital', /(?:palmar|dorsal) digital|palmar metacarpal/],
];
const nerveRules: readonly Rule[] = [
  ['elbow/posterior', /^(?:ulnar|radial) nerve$/],
  ['shoulder-girdle/clavicular', /suprascapular|subclavian nerve/],
  ['shoulder-girdle/deltoid', /axillary nerve|superior lateral brachial cutaneous/],
  ['shoulder-girdle/scapular', /suprascapular|dorsal scapular|subscapular|thoracodorsal/],
  ['axillary/walls', /long thoracic|thoracodorsal|pectoral nerve|subscapular/],
  ['arm/anterior', /^musculocutaneous nerve$|^median nerve$/],
  ['arm/posterior', /^radial nerve$|muscular branches of radial|lateral brachial cutaneous/],
  ['arm/medial', /^median nerve$|^ulnar nerve$|medial brachial cutaneous/],
  ['elbow/cubital-fossa', /^median nerve$|lateral antebrachial cutaneous/],
  ['elbow/lateral', /^radial nerve$|deep branch of radial|posterior interosseous nerve/],
  ['elbow/medial', /^ulnar nerve$|medial antebrachial cutaneous/],
  ['forearm/anterior', /^median nerve$|anterior interosseous|muscular branches of (?:median|ulnar)/],
  ['forearm/posterior', /posterior interosseous|deep branch of radial|muscular branches of radial|posterior antebrachial cutaneous/],
  ['forearm/radial', /^radial nerve$|superficial branch of radial|lateral antebrachial cutaneous/],
  ['forearm/ulnar', /^ulnar nerve$|muscular branches of ulnar|medial antebrachial cutaneous|dorsal branch of ulnar/],
  ['wrist/palmar', /^median nerve$|^ulnar nerve$|palmar branch of (?:median|ulnar)/],
  ['wrist/dorsal', /superficial branch of radial|dorsal branch of ulnar/],
  ['wrist/carpal-tunnel', /^median nerve$/],
  ['hand/thenar', /^median nerve$|deep branch of ulnar/],
  ['hand/hypothenar', /^ulnar nerve$|(?:deep|superficial) branch of ulnar/],
  ['hand/central', /^median nerve$|^ulnar nerve$|palmar branch|deep branch of ulnar|superficial branch of ulnar|communicating branch of median/],
  ['hand/dorsal', /dorsal branch of ulnar|superficial branch of radial|dorsal digital branches/],
  ['hand/digital', /palmar digital branches|dorsal digital branches/],
];
const match = (name: string, rules: readonly Rule[]) => rules.filter(([, pattern]) => pattern.test(name)).map(([region]) => region);

export function upperLimbPlexusPart(name: string): string | null {
  if (/roots? of brachial plexus/.test(name)) return 'roots';
  if (/division.*brachial plexus/.test(name)) return 'divisions';
  if (/trunk.*brachial plexus/.test(name)) return 'trunks';
  if (/cord.*brachial plexus/.test(name)) return 'cords';
  if (/^(?:median|ulnar|radial|musculocutaneous|axillary) nerve$/.test(name)) return 'terminal';
  if (/dorsal scapular|suprascapular|subclavian nerve|subscapular nerve|thoracodorsal|long thoracic|pectoral nerve|^medial (?:antebrachial|brachial) cutaneous nerve$/.test(name)) return 'collateral';
  return null;
}

export function upperLimbRegionalMemberships(name: string): { region: string; tissue: UpperLimbTissue; part?: string }[] {
  const memberships: { region: string; tissue: UpperLimbTissue; part?: string }[] = [];
  const add = (regions: readonly string[], tissue: UpperLimbTissue) => regions.forEach(region => memberships.push({ region, tissue }));
  const isNerve = /nerve|brachial plexus/.test(name);
  const connective = /fascia|bursa|retinacul|aponeuros|ligament|sheath|septum/.test(name);
  const vessel = /arter|vein|venous|palmar arch|carpal anastomosis/.test(name);
  if (isNerve) {
    add(match(name, nerveRules), 'nerves');
    const part = upperLimbPlexusPart(name);
    if (part) memberships.push({ region: 'axillary/brachial-plexus', tissue: 'nerves', part });
  } else if (vessel) add(match(name, vesselRules), /vein|venous/.test(name) ? 'veins' : 'arteries');
  else {
    const bony = (regions: readonly string[]) => add(regions, 'bones-joints');
    if (/^clavicle$/.test(name)) bony(['shoulder-girdle/clavicular', 'axillary/walls']);
    else if (/^scapula$/.test(name)) bony(['shoulder-girdle/scapular', 'shoulder-girdle/deltoid', 'axillary/walls']);
    else if (/^humerus$/.test(name)) bony(['shoulder-girdle/deltoid', 'axillary/walls', 'arm/anterior', 'arm/posterior', 'elbow/cubital-fossa', 'elbow/posterior', 'elbow/medial', 'elbow/lateral']);
    else if (/^(?:radius|ulna)$/.test(name)) bony(['elbow/cubital-fossa', 'elbow/posterior', 'elbow/medial', 'elbow/lateral', 'forearm/anterior', 'forearm/posterior', 'wrist/palmar', 'wrist/dorsal']);
    else if (/^(?:(?:scaphoid|lunate|triquetrum|pisiform|trapezium|trapezoid|capitate|hamate) bone|triquetrum)$/.test(name))
      bony(['wrist/palmar', 'wrist/dorsal', 'wrist/carpal-tunnel']);
    else if (/metacarpal bone|phalanx.*hand|articular capsules of metacarpophalangeal/.test(name)) {
      bony(['hand/central', 'hand/dorsal', 'hand/digital']);
      if (/first/.test(name)) bony(['hand/thenar']);
      if (/fifth/.test(name)) bony(['hand/hypothenar']);
    } else if (/^first rib$/.test(name)) bony(['axillary/walls']);
    else add(match(name, muscleRules), connective ? 'fasciae-ligaments-bursae' : 'muscles-tendons');
  }
  return memberships;
}
