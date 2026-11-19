import type { NervousGroup } from './nervousTaxonomy';

// Families reviewed against the corrected Final_Muscles_fused CSV. A family
// never creates geometry: only already-recognized regional muscles receive it.
const families = [
  ['suboccipital', 'Suboccipital muscles', /obliquus (?:superior|inferior) capitis|rectus posterior (?:major|minor) capitis/],
  ['ocular', 'Extraocular muscles and orbital supporting structures', /rectus muscle|oblique muscle|levator palpebrae|tendinous ring|tarsus|trochlea/],
  ['mastication', 'Muscles of mastication', /temporalis|masseter|pterygoid muscle/],
  ['tongue', 'Tongue muscles', /glossus/],
  ['suprahyoid', 'Suprahyoid muscles and digastric tendon', /digastric|mylohyoid|geniohyoid|stylohyoid/],
  ['infrahyoid', 'Infrahyoid muscles', /sternohyoid|sternothyroid|omohyoid|thyrohyoid/],
  ['pharyngeal', 'Pharyngeal muscles', /pharynge/],
  ['laryngeal', 'Laryngeal muscles', /arytenoid|cricothyroid|crico-arytenoid/],
  ['scalenes', 'Scalene muscles', /scalenus/],
  ['prevertebral', 'Prevertebral muscles', /longus (?:capitis|colli)|rectus (?:anterior|lateralis) capitis/],
  ['sternocleidomastoid', 'Sternocleidomastoid', /sternocleidomastoid/],
  ['posterior-cervical', 'Posterior cervical and shoulder-girdle muscles', /trapezius|splenius|semispinalis|spinalis|longissimus|iliocostalis|multifidus|interspinales|levator scapulae|subclavius/],
  ['auricular', 'Auricular and middle-ear muscles', /auricularis|tympani|typmani|stapedius/],
  ['facial', 'Facial-expression muscles', /frontalis|occipitalis|orbicularis|corrugator|procerus|nasalis|nasolabialis|depressor septi|zygomaticus|risorius|mentalis|labii|anguli oris|bucinator|buccinator/],
  ['other', 'Other modeled regional muscles', /.*/],
] as const;
export function headNeckMuscleFamily(canonicalName: string): string {
  return families.find(([, , pattern]) => pattern.test(canonicalName))![0];
}
export function headNeckMuscleGroups(path: readonly string[]): NervousGroup[] {
  return families.map(([id, label]) => ({ id: [...path, id].join('/'), label }));
}
