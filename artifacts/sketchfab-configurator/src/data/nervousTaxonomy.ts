export type NervousGroup = {
  id: string;
  label: string;
  children?: readonly NervousGroup[];
};

const groups = (entries: readonly (readonly [string, string])[]): readonly NervousGroup[] =>
  entries.map(([id, label]) => ({ id, label }));

const cranialNerveGroups: readonly NervousGroup[] = groups([
  ['cn-1', 'CN I — Olfactory'],
  ['cn-2', 'CN II — Optic'],
  ['cn-3', 'CN III — Oculomotor'],
  ['cn-4', 'CN IV — Trochlear'],
  ['cn-5', 'CN V — Trigeminal'],
  ['cn-6', 'CN VI — Abducens'],
  ['cn-7', 'CN VII — Facial'],
  ['cn-8', 'CN VIII — Vestibulocochlear'],
  ['cn-9', 'CN IX — Glossopharyngeal'],
  ['cn-10', 'CN X — Vagus'],
  ['cn-11', 'CN XI — Accessory'],
  ['cn-12', 'CN XII — Hypoglossal'],
]);

export const NERVOUS_GROUPS: readonly NervousGroup[] = [
  {
    id: 'supratentorial',
    label: 'Supratentorial Brain',
    children: groups([
      ['cerebral-cortex', 'Cerebral Cortex'],
      ['white-matter', 'White Matter / Fiber Tracts'],
      ['basal-ganglia', 'Basal Ganglia'],
      ['thalamus', 'Thalamus'],
      ['hypothalamus', 'Hypothalamus'],
      ['limbic', 'Limbic Structures'],
      ['ventricular-system', 'Ventricular System'],
    ]),
  },
  {
    id: 'infratentorial',
    label: 'Infratentorial Brain',
    children: [
      {
        id: 'brainstem',
        label: 'Brainstem',
        children: groups([
          ['midbrain', 'Midbrain'],
          ['pons', 'Pons'],
          ['medulla', 'Medulla'],
          ['brainstem-nuclei', 'Brainstem Nuclei'],
          ['brainstem-fiber-tracts', 'Brainstem Fiber Tracts'],
        ]),
      },
      {
        id: 'cerebellum',
        label: 'Cerebellum',
        children: groups([
          ['cerebellar-anatomy', 'Cerebellar Anatomy'],
          ['cerebellar-nuclei', 'Cerebellar Nuclei'],
          ['cerebellar-peduncles', 'Cerebellar Peduncles'],
          ['cerebellar-fiber-tracts', 'Cerebellar Fiber Tracts'],
        ]),
      },
    ],
  },
  { id: 'cranial', label: 'Cranial Nerves', children: cranialNerveGroups },
  {
    id: 'spinal',
    label: 'Spinal Cord',
    children: groups([
      ['spinal-cord-anatomy', 'Spinal Cord Anatomy'],
      ['spinal-gray-matter', 'Spinal Cord Nuclei / Gray Matter'],
      ['ascending-tracts', 'Ascending Tracts'],
      ['descending-tracts', 'Descending Tracts'],
      ['spinal-roots', 'Spinal Roots'],
    ]),
  },
  {
    id: 'peripheral',
    label: 'Peripheral Nervous System',
    children: groups([
      ['cervical-plexus', 'Cervical Plexus'],
      ['brachial-plexus', 'Brachial Plexus'],
      ['thoracic-intercostal', 'Thoracic / Intercostal Nerves'],
      ['lumbar-plexus', 'Lumbar Plexus'],
      ['sacral-plexus', 'Sacral Plexus'],
      ['upper-limb-nerves', 'Upper Limb Nerves'],
      ['lower-limb-nerves', 'Lower Limb Nerves'],
    ]),
  },
  {
    id: 'autonomic',
    label: 'Autonomic Nervous System',
    children: groups([
      ['sympathetic', 'Sympathetic System'],
      ['parasympathetic', 'Parasympathetic System'],
      ['visceral-enteric-plexuses', 'Visceral / Enteric Plexuses'],
    ]),
  },
];

type GroupPath = readonly string[];

const path = (...ids: string[]): GroupPath => ids;
const supratentorial = (child: string): GroupPath => path('supratentorial', child);
const infratentorial = (organ: string, child: string): GroupPath =>
  path('infratentorial', organ, child);
const spinal = (child: string): GroupPath => path('spinal', child);
const cranialNerve = (number: number): GroupPath => path('cranial', `cn-${number}`);

const ocularOrNonNeural = /\b(?:sclera|retina|eyeball|cornea|lens|cochlea|auditory tube|sinus of .* bone|ethmoid bone|middle meningeal artery)\b/i;

const brainstemNucleus = /\b(?:reticular formation|red nucleus|nucleus of darkschewitsch|ventral tegmental area|substantia nigra|vestibular nucleus|vestibular nuclei|nucleus of (?:abducens|trochlear|oculomotor)|abducens nucleus|oculomotor nucleus|accessory nucleus of oculomotor|motor nucleus of facial|facial nucleus|principal .* trigeminal|mesencephalic nucleus of trigeminal|trigeminal nucleus|posterior cochlear nucleus|anterior cochlear nucleus|cochlear nucleus|nucleus of lateral lemniscus|n\. of the lateral lemniscus|auditory decussation|inferior colliculus|superior colliculus|superior olivary complex|gracile nucleus|cuneate nucleus|accessory cuneate nucleus|nucleus of solitary tract|nucleus ambiguus|posterior nucleus of vagus|nucleus of hypoglossal|nucleus of accessory|superior salivatory nucleus|inferior salivatory nucleus)\b/i;

const cranialNerveRules: readonly { pattern: RegExp; number: number }[] = [
  { pattern: /\b(?:olfactory nerve(?:\s*\(i\))?|cranial nerve i\b)/i, number: 1 },
  { pattern: /\b(?:optic nerve(?:\s*\(ii\))?|optic chiasm)/i, number: 2 },
  {
    pattern: /\b(?:oculomotor nerve|oculomotr nerve|oculomotor nucleus|accessory nucleus of oculomotor|ciliary ganglion|short ciliary nerves?|long cilliary nerve|long ciliary nerve|nasociliary nerve|communicating branch .* nasociliary|oculomotor nerve|oculomotr nerve)\b/i,
    number: 3,
  },
  { pattern: /\b(?:trochlear nerve|nucleus of trochlear nerve)\b/i, number: 4 },
  {
    pattern: /\b(?:trigeminal nerve|trigeminal tract|trigeminal lemniscus|trigeminal nucleus|trigeminal root|trigeminal ganglion|ophthalmic nerve|maxillary nerve|mandibular nerve|mental nerve|buccal nerve|lingual nerve|auriculotemporal nerve|masseteric nerve|pterygoid nerve|mylohyoid nerve|nerve to mylohyoid|tensor tympani nerve|alveolar nerve|nasopalatine nerve|ethmoidal nerve|nasal nerve|infratrochlear nerve|greater palatine nerve|zygomatic(?:otemporal|ofacial)? nerve|frontal nerve|supraorbital nerve|supratrochlear nerve|lacrimal nerve|meningeal (?:nerve|branch)|ganglionic branch of maxillary nerve|posterior division of mandibular nerve|anterior division of mandibular nerve|motor root of trigeminal|mesencephalic nucleus of trigeminal|principal .* trigeminal)\b/i,
    number: 5,
  },
  { pattern: /\b(?:abducens nerve|nucleus of abducens nerve)\b/i, number: 6 },
  {
    pattern: /\b(?:facial nerve|facial nucleus|motor nucleus of facial nerve|superior salivatory nucleus|chorda tympani|greater petrosal nerve|vidian nerve|nerve of the pterygoid canal)\b/i,
    number: 7,
  },
  {
    pattern: /\b(?:vestibulocochlear nerve|vestibular nerve|cochlear nerve|vestibular nuclei|cochlear nucleus|auditory fibers|auditory decussation)\b/i,
    number: 8,
  },
  {
    pattern: /\b(?:glossopharyngeal nerve|glossopharyngeal nucleus|lesser petrosal nerve|inferior salivatory nucleus|otic ganglion|tympanic nerve|tympanic plexus|jacobson)\b/i,
    number: 9,
  },
  {
    pattern: /\b(?:vagus nerve|vagal|vagus|pharyngeal nerve|pharyngeal branch of the vagus|recurrent laryngeal nerve|superior laryngeal nerve|posterior nucleus of vagus|nucleus ambiguus|nucleus of solitary tract)\b/i,
    number: 10,
  },
  {
    pattern: /\b(?:accessory nerve(?:\s*\(xi\))?|spinal accessory nerve|nucleus of accessory nerve)/i,
    number: 11,
  },
  {
    pattern: /\b(?:hypoglossal nerve|nucleus of hypoglossal nerve)\b/i,
    number: 12,
  },
];

const lowerLimbNerve = /\b(?:sciatic|femoral|obturator|pudendal|pudental|fibular|peroneal|tibial|sural|saphenous|plantar|cluneal|clluneal|gluteal|posterior femoral cutaneous|genitofemoral|quadratus femoris|piriformis|dorsal digital branches of .* foot|(?:medial|intermediate|lateral) dorsal cutaneous nerve of foot)\b/i;
const upperLimbNerve = /\b(?:axillary|radial|median nerve|ulnar|musculocutaneous|brachial cutaneous|antebrachial cutaneous|interosseous nerve of forearm|pectoral nerve|subscapular nerve|dorsal scapular|suprascapular|thoracodorsal|palmar|digital branches of .* nerve|carpal|brachial plexus)\b/i;

/**
 * Conservatively map a Blender/Sketchfab object name to its menu ancestry.
 * Objects outside confidently recognized nervous-system anatomy intentionally
 * remain unassigned.
 */
export function classifyNervousObject(rawName: string): readonly string[] | null {
  let name = rawName.trim().toLowerCase();
  if (!name) return null;

  // Strip common Blender duplicate suffixes and Sketchfab's terminal _number,
  // then remove the laterality suffix used throughout this model export.
  name = name.replace(/\.(?:l|r)$/, '').replace(/\.\d+$/, '').replace(/_\d+$/, '');
  name = name.replace(/\.(?:l|r)$/, '').replace(/_\d+$/, '');
  name = name.replace(/[_]+/g, ' ').replace(/\s+/g, ' ');

  if (ocularOrNonNeural.test(name)) return null;

  // Nuclei named for cranial nerves are brainstem anatomy, not nerve branches.
  if (brainstemNucleus.test(name)) {
    return infratentorial('brainstem', 'brainstem-nuclei');
  }

  // Nerve-specific structures are checked before broad brainstem/system rules.
  for (const rule of cranialNerveRules) {
    if (rule.pattern.test(name)) return cranialNerve(rule.number);
  }

  if (/\b(?:enteric plexus|nerve plexus|nerveplexus|arterynerve plexus|arter ynerveplexus|plexus nerves?|hypogastric plexus|cardiac plexus|aortic plexus)\b/i.test(name)) {
    return path('autonomic', 'visceral-enteric-plexuses');
  }

  if (/\b(?:sympathetic|splanchn\w*|rami communicantes|stellatum|cervicothoracic ganglion|middle cervical sympathetic ganglion|sympathetic ganglion|sympathetic plexus|ansa subclavia|ganglion impar|coeliac ganglia|celiac ganglia|superior mesenteric ganglia|inferior mesenteric ganglia|inferior mesenteric ganglion|deep petrosal nerve)\b/i.test(name)) {
    return path('autonomic', 'sympathetic');
  }
  if (/\b(?:parasympathetic|pterygopalatine ganglion|submandibular ganglion|submandibular ganglia|ciliary ganglion|otic ganglion)\b/i.test(name)) {
    return path('autonomic', 'parasympathetic');
  }

  // Cerebellar subdivisions precede generic cerebellar anatomy.
  if (/\b(?:dentate nucleus|nucleus fastigii|nucleus emboliformis|nucleus globosus|cerebellar nucleus)\b/i.test(name)) {
    return infratentorial('cerebellum', 'cerebellar-nuclei');
  }
  if (/\b(?:cerebellar peduncle|peduncle of (?:flocculus|cerebellum)|middle cerebellar peduncle|superior cerebellar peduncle|inferior cerebellar peduncle)\b/i.test(name)) {
    return infratentorial('cerebellum', 'cerebellar-peduncles');
  }
  if (/\b(?:cerebellar fibers|cerebellar tract|pontocerebellar fibers|olivocerebellar|fastigiovestibular|dentatorubrothalamic|olivodentate)\b/i.test(name)) {
    return infratentorial('cerebellum', 'cerebellar-fiber-tracts');
  }
  if (/\b(?:cerebellum|cerebellar|vermis|(?:superior|inferior) semilunar lobule|(?:anterior|posterior) quadrangular lobule|biventral lobule|gracile lobule|wing of central lobule|central lobule|flocculus|culmen|declive|pyramis|nodule of vermis|lingula of cerebellum|tonsil of cerebellum)\b/i.test(name)) {
    return infratentorial('cerebellum', 'cerebellar-anatomy');
  }

  // Spinal gray matter and roots/tracks get priority over general spinal terms.
  if (/\b(?:anterior horn of spinal cord|posterior horn of spinal cord|nucleus proprius|clarke'?s nucleus|dorsal nucleus clarke|intermediomedial nucleus|intermediolateral nucleus|lateral intermediate substance)\b/i.test(name)) {
    return spinal('spinal-gray-matter');
  }
  if (/\b(?:spinal cord|central canal|filum terminale|spinal dura)\b/i.test(name)) {
    return spinal('spinal-cord-anatomy');
  }
  if (/\b(?:ascending|spinothalamic|spinocerebellar|gracile|cuneate|posterior column|fasciculus gracilis|fasciculus cuneatus)\b.*\b(?:tract|fascicul|pathway)\b|\b(?:tract|fascicul|pathway)\b.*\b(?:ascending|spinothalamic|spinocerebellar|gracile|cuneate)\b/i.test(name)) {
    return spinal('ascending-tracts');
  }
  if (/\b(?:corticospinal|rubrospinal|reticulospinal|vestibulospinal|tectospinal|descending)\b.*\b(?:tract|fiber|fibers)\b|\b(?:tract|fiber|fibers)\b.*\b(?:corticospinal|rubrospinal|reticulospinal|vestibulospinal|tectospinal)\b/i.test(name)) {
    return spinal('descending-tracts');
  }
  if (/\b(?:[csl]\d{1,2}\s*.*(?:root|dorsal root ganglion|spinal nerve)|th\d+\s*.*root|(?:anterior|posterior|dorsal|ventral) root\b|spinal nerve|dorsal root ganglion|roots of brachial plexus|spinal roots)\b/i.test(name)) {
    return spinal('spinal-roots');
  }

  // Peripheral plexuses and named limb distributions.
  if (/\bcervical plexus\b|\bansa cervicali?s?\b|\bphrenic nerve\b|\btransverse cervical nerve\b|\bsupraclavicular nerve\b|\blesser occipital nerve\b|\bgreat auricular nerve\b/i.test(name)) {
    return path('peripheral', 'cervical-plexus');
  }
  if (/\bbrachial plexus\b|\btrunk of c\d nerve\b|\b(?:superior|middle|inferior) trunk of brachial plexus\b/i.test(name)) {
    return path('peripheral', 'brachial-plexus');
  }
  if (/\b(?:intercostal nerve|thoracic nerve|(?:dorsal|ventral) (?:\(cutaneous\) )?ramus th\d+|intercostal)\b/i.test(name)) {
    return path('peripheral', 'thoracic-intercostal');
  }
  if (/\blumbar plexus\b|\blumbar nerve\b|\biliohypogastric nerve\b|\bilio-inguinal nerve\b/i.test(name)) return path('peripheral', 'lumbar-plexus');
  if (/\bsacral plexus\b|\bsacral nerve\b/i.test(name)) return path('peripheral', 'sacral-plexus');
  if (lowerLimbNerve.test(name)) return path('peripheral', 'lower-limb-nerves');
  if (upperLimbNerve.test(name)) return path('peripheral', 'upper-limb-nerves');

  // Brainstem regions, then their fiber tracts.
  if (/\b(?:midbrain|mesencephalon|cerebral peduncle|periaqueductal gray|aqueduct of midbrain|interpeduncular fossa)\b/i.test(name)) {
    return infratentorial('brainstem', 'midbrain');
  }
  if (/\b(?:pons|pontine|pontocerebellar|pontomedullary)\b/i.test(name)) {
    if (/\b(?:tract|fiber|fibers)\b/i.test(name)) return infratentorial('brainstem', 'brainstem-fiber-tracts');
    return infratentorial('brainstem', 'pons');
  }
  if (/\b(?:medulla oblongata|medulla|olive|pyramid of medulla)\b/i.test(name)) {
    return infratentorial('brainstem', 'medulla');
  }
  if (/\bbrainstem\b/i.test(name)) {
    return infratentorial('brainstem', 'brainstem-nuclei');
  }
  if (/\b(?:brainstem fiber|brainstem tract|medial longitudinal fascicle|medial lemniscus|medial lemmniscus|lateral lemniscus|central tegmental tract|tectospinal|rubrospinal|reticulospinal|spinocerebellar|posterolateral tract|lissauer'?s tract)\b/i.test(name)) {
    return infratentorial('brainstem', 'brainstem-fiber-tracts');
  }
  if (/\b(?:brainstem|midbrain|pons|medulla)\b/i.test(name)) {
    return infratentorial('brainstem', 'brainstem-nuclei');
  }

  // Supratentorial anatomy: specific regions before cortex and white matter.
  if (/\b(?:ventricle|ventricular|choroid plexus|septum pellucidum|aqueduct of midbrain)\b/i.test(name)) {
    return supratentorial('ventricular-system');
  }
  if (/\b(?:caudate|putamen|globus pallidus|subthalamic nucleus|subthalamus|claustrum|nucleus accumbens|basal nucleus of maynert)\b/i.test(name)) {
    return supratentorial('basal-ganglia');
  }
  if (/\b(?:thalamocortical|pulvinar fibers|thalamic fibers|mediodorsal thalamic fibers|superior longitudinal fiascicle|tractus mamillothalamicus|stria medullaris thalami)\b/i.test(name)) {
    return supratentorial('white-matter');
  }
  if (/\b(?:thalamus|thalamic|pulvinar|geniculate body|mamillothalamic|mammillothalamic|internal medullary lamina|(?:ventral posteromedial|ventral posterolateral|ventral lateral|ventral anterior|lateral posterior|lateral dorsal|centromedian parafascicular|intralaminar rostral|midline nuclei|mediodorsal|anterior medial|anterior dorsal|anterior ventral) (?:vpm|vpl|vl|va|lp|ld|cm pf|cl pc cem|md|am|ad|av))\b/i.test(name)) {
    return supratentorial('thalamus');
  }
  if (/\b(?:hypothalam\w*|mammillary|mamillary|preoptic nucleus|suprachiasmatic nucleus|supraoptic nucleus|paraventricular nucleus|ventromedial nucleus|tuberomammillary nucleus)\b/i.test(name)) {
    return supratentorial('hypothalamus');
  }
  if (/\b(?:hippocamp\w*|amygdal\w*|cingulat\w*|fornix|septal nucleus|dentate gyrus|parahippocamp\w*|limbic|cingulum|stria terminalis|indusium griseum)\b/i.test(name)) {
    return supratentorial('limbic');
  }
  if (/\b(?:tract|fascicle|fasciculus|commissure|corpus callosum|radiation|fiber|fibers|capsule)\b/i.test(name)) {
    return supratentorial('white-matter');
  }
  if (/\b(?:cortex|cortical|cerebral hemisphere|cerebral cortex|gyrus|gyri|sulcus|sulci|superior parietal lobule|inferior parietal lobule|paracentral lobule|cuneus|precuneus|occipital pole|olfactory sulcus|temporal pole|temporal plane|insula)\b/i.test(name)) {
    return supratentorial('cerebral-cortex');
  }

  return null;
}