import type { HeadNeckRegion } from './headNeckTopographyRegions';

type Rule = readonly [RegExp, readonly HeadNeckRegion[]];
// Rules operate on canonical source names, after removing FMA export prefixes,
// laterality and runtime duplicate suffixes. Never infer a region from a broad
// CSV collection alone (the Head & Face vascular collection contains lung vessels).
export const HEAD_NECK_MUSCLE_RULES: readonly Rule[] = [
  [/frontalis|occipitalis|orbicularis|corrugator|procerus|nasalis|nasolabialis|depressor septi|zygomaticus|risorius|mentalis|labii|anguli oris|bucinator|buccinator/, ['head/scalp-face']],
  [/temporalis|masseter|pterygoid muscle/, ['head/temporal-infratemporal']],
  [/masseter|stylohyoid|posterior belly of digastric|sternocleidomastoid/, ['head/parotid']],
  [/rectus muscle|oblique muscle|levator palpebrae|tendinous ring|tarsus|trochlea of superior oblique/, ['head/orbit']],
  [/nasalis|depressor septi|palatopharyngeus|levator veli|tensor veli/, ['head/nasal-pterygopalatine']],
  [/glossus|mylohyoid|geniohyoid|buccinator|bucinator|orbicularis oris|palatopharyngeus/, ['head/oral']],
  [/tympani|stapedius|auricularis/, ['head/ear']],
  [/anterior belly of digastric|intermediate tendon of digastric|mylohyoid|geniohyoid|platysma/, ['anterior-triangle/submental']],
  [/digastric|mylohyoid|hyoglossus|stylohyoid|platysma/, ['anterior-triangle/submandibular']],
  [/sternocleidomastoid|posterior belly of digastric|stylohyoid|omohyoid|thyrohyoid|(?:middle|inferior) pharyngeal constrictor/, ['anterior-triangle/carotid']],
  [/sternocleidomastoid|sternohyoid|sternothyroid|omohyoid|thyrohyoid|crico|arytenoid|thyro-epiglottic|pharyngeal constrictor|pharyngeus|platysma/, ['anterior-triangle/muscular']],
  [/sternocleidomastoid|platysma/, ['lateral-neck/sternocleidomastoid']],
  [/sternocleidomastoid|(?:descending|transverse) part of trapezius|levator scapulae|splenius capitis|scalenus medius|scalenus posterior|omohyoid/, ['lateral-neck/occipital-triangle']],
  [/omohyoid|scalenus anterior|scalenus medius|sternocleidomastoid|subclavius/, ['lateral-neck/omoclavicular']],
  [/longus capitis|longus colli|rectus anterior capitis|rectus lateralis capitis|scalenus/, ['deep-neck/prevertebral']],
  [/scalenus|longus colli|sternothyroid|sternohyoid|omohyoid|subclavius/, ['deep-neck/root-of-neck']],
  [/pharynge|palatopharyngeus|stylopharyngeus/, ['deep-neck/pharyngeal']],
  [/splenius|semispinalis (?:capitis|colli)|spinalis (?:capitis|colli)|longissimus (?:capitis|colli)|iliocostalis colli|multifidus colli|interspinales colli|(?:descending|transverse) part of trapezius|levator scapulae/, ['posterior-neck/posterior-cervical']],
  [/obliquus (?:superior|inferior) capitis|rectus posterior (?:major|minor) capitis|rectus lateralis capitis/, ['posterior-neck/suboccipital']],
];
export const HEAD_NECK_NERVE_RULES: readonly Rule[] = [
  [/supraorbital|supratrochlear|infratrochlear|zygomaticofacial|zygomaticotemporal|mental nerve|buccal nerve|facial nerve \(vii\)|auriculotemporal/, ['head/scalp-face']],
  [/mandibular nerve|inferior alveolar|lingual nerve|buccal nerve|masseteric nerve|pterygoid nerve|auriculotemporal|otic ganglion|chorda tympani/, ['head/temporal-infratemporal']],
  [/facial nerve \(vii\)|auriculotemporal|great auricular/, ['head/parotid']],
  [/optic nerve|oculomot|trochlear nerve|abducens nerve|ophthalmic nerve|frontal nerve|supraorbital|supratrochlear|nasociliary|infratrochlear|lacrimal nerve|ciliary|cilliary/, ['head/orbit']],
  [/olfactory nerve|maxillary nerve|maxillary n \(v\)|pterygopalatine|palatine nerve|nasopalatine|ethmoidal nerve|posterior .*nasal nerve|vidian nerve|deep petrosal|pharyngeal nerve/, ['head/nasal-pterygopalatine']],
  [/lingual nerve|hypoglossal|alveolar nerve|palatine nerve|nasopalatine|chorda tympani|submandibular ganglion|submadinular ganglia/, ['head/oral']],
  [/vestibulo|cochlear nerve|vestibular nerve|facial nerve \(vii\)|chorda tympani|tensor tympani nerve|lesser petrosal|auriculotemporal/, ['head/ear']],
  [/mylohyoid nerve|nerve to mylohyoid/, ['anterior-triangle/submental']],
  [/hypoglossal nerve|lingual nerve|submandibular ganglion|submadinular ganglia|mylohyoid nerve/, ['anterior-triangle/submandibular']],
  [/vagus nerve \(x\)|hypoglossal nerve|glossopharyngeal nerve|superior laryngeal|ansa cervical|superior cervical sympathetic|carotid body/, ['anterior-triangle/carotid']],
  [/ansa cervical|laryngeal nerve|transverse cervical nerve/, ['anterior-triangle/muscular']],
  [/great auricular|transverse cervical nerve|accessory nerve|lesser occipital/, ['lateral-neck/sternocleidomastoid']],
  [/accessory nerve|lesser occipital|great auricular|supraclavicular|transverse cervical nerve|roots of brachial|trunk of brachial/, ['lateral-neck/occipital-triangle']],
  [/supraclavicular|phrenic nerve|roots of brachial|trunk of brachial/, ['lateral-neck/omoclavicular']],
  [/phrenic nerve|cervical sympathetic|cervicothoracic ganglion|ansa subclavia|trunk of c[234] (?:nerve|nerve root)|^c1 nerve$/, ['deep-neck/prevertebral']],
  [/phrenic nerve|recurrent laryngeal|vagus nerve \(x\)|cervicothoracic ganglion|ansa subclavia|roots of brachial|trunk of brachial/, ['deep-neck/root-of-neck']],
  [/glossopharyngeal nerve|vagus nerve \(x\)|pharyngeal branch|pharyngeal nerve|hypoglossal nerve|superior cervical sympathetic/, ['deep-neck/pharyngeal']],
  [/dorsal ramus c[4-8]|greater occipital|third occipital|lesser occipital|accessory nerve/, ['posterior-neck/posterior-cervical']],
  [/suboccipital nerve|greater occipital|third occipital|^c[12] (?:nerve|spinal nerve)$/, ['posterior-neck/suboccipital']],
];
// Explicit regional identities also accept separately named meshes in revised
// live models. A name match never invents geometry absent from the node map.
export const TEMPORAL_INFRATEMPORAL_VEINS = /^(?:(?:superficial|middle|deep|anterior deep|posterior deep) temporal veins?|maxillary veins?|(?:(?:anterior|posterior) division of )?retromandibular veins?|deep facial veins?|masseteric veins?|pterygoid (?:venous )?plexus)$/;
export const ORBIT_CAVERNOUS_VEINS = /^(?:cavernous sinus|(?:(?:anterior|posterior) )?intercavernous (?:sinus|veins?))$/;
export const HEAD_NECK_VESSEL_RULES: readonly Rule[] = [
  [/^(?:angular|facial|superficial temporal|occipital|transverse facial|superior labial|inferior labial|posterior auricular)|(?:frontal|parietal) branch of superficial temporal|labial vein/, ['head/scalp-face']],
  [/maxillary artery|deep temporal|buccal artery|inferior alveolar|middle meningeal|pterygoid plexus|retromandibular/, ['head/temporal-infratemporal']],
  [TEMPORAL_INFRATEMPORAL_VEINS, ['head/temporal-infratemporal']],
  [/external carotid|retromandibular|superficial temporal|transverse facial|posterior auricular/, ['head/parotid']],
  [/ophthalmic|central (?:artery|vein) of retina|ciliary arter|supraorbital|supratrochlear|lacrimal arter|lacrimal vein/, ['head/orbit']],
  [ORBIT_CAVERNOUS_VEINS, ['head/orbit']],
  [/sphenopalatine|descending palatine|greater palatine|pterygoid canal|ethmoidal arter|nasal branches|nasal arter/, ['head/nasal-pterygopalatine']],
  [/lingual (?:artery|vein)|palatine|alveolar|submental/, ['head/oral']],
  [/posterior auricular|stylomastoid|labyrinthine|anterior tympanic|petrosal branch/, ['head/ear']],
  [/submental|anterior jugular/, ['anterior-triangle/submental']],
  [/^(?:facial|common facial)|submental|lingual (?:artery|vein)/, ['anterior-triangle/submandibular']],
  [/common carotid|internal carotid|external carotid|internal jugular|common facial|superior thyroid|ascending pharyngeal|lingual (?:artery|vein)|^facial artery/, ['anterior-triangle/carotid']],
  [/thyroid arter|thyroid vein|cricothyroid|anterior jugular/, ['anterior-triangle/muscular']],
  [/external jugular|internal jugular|common carotid|occipital artery/, ['lateral-neck/sternocleidomastoid']],
  [/external jugular|transverse cervical|occipital artery|deep cervical/, ['lateral-neck/occipital-triangle']],
  [/subclavian|transverse cervical|suprascapular|external jugular/, ['lateral-neck/omoclavicular']],
  [/vertebral arter|vertebral vein|cervical vertebral venous|deep cervical|ascending cervical|thyrocervical/, ['deep-neck/prevertebral']],
  [/subclavian|brachiocephalic vein|thyrocervical|costocervical|inferior thyroid|vertebral arter|vertebral vein|internal jugular/, ['deep-neck/root-of-neck']],
  [/ascending pharyngeal|internal carotid|internal jugular|pharyngeal (?:plexus|vein)/, ['deep-neck/pharyngeal']],
  [/deep cervical|transverse cervical|occipital artery|occipital vein|cervical vertebral venous/, ['posterior-neck/posterior-cervical']],
  [/vertebral arter|vertebral vein|cervical vertebral venous|^occipital artery/, ['posterior-neck/suboccipital']],
];
export const HEAD_NECK_BONE_RULES: readonly Rule[] = [
  [/frontal bone|parietal|temporal bone|occipital bone|zygomatic|maxilla|mandible|nasal bone/, ['head/scalp-face']],
  [/sphenoid|temporal bone|zygomatic|mandible|maxilla/, ['head/temporal-infratemporal']],
  [/mandible|temporal bone|styloid process/, ['head/parotid']],
  [/frontal bone|sphenoid|ethmoid|zygomatic|maxilla|lacrimal|palatine/, ['head/orbit']],
  [/ethmoid|sphenoid|palatine|vomer|maxilla|nasal bone|inferior nasal concha/, ['head/nasal-pterygopalatine']],
  [/mandible|maxilla|palatine|hyoid|tooth|incisor|canine|premolar|molar/, ['head/oral']],
  [/temporal bone|incus|malleus|stapes/, ['head/ear']],
  [/mandible|hyoid/, ['anterior-triangle/submental', 'anterior-triangle/submandibular']],
  [/hyoid/, ['anterior-triangle/carotid', 'anterior-triangle/muscular']],
  [/clavicle|sternum/, ['lateral-neck/sternocleidomastoid', 'deep-neck/root-of-neck']],
  [/clavicle|first rib/, ['lateral-neck/omoclavicular']],
  [/vertebra c[1-7]|atlas \(c1\)|axis \(c2\)/, ['deep-neck/prevertebral', 'posterior-neck/posterior-cervical']],
  [/occipital|atlas \(c1\)|axis \(c2\)/, ['posterior-neck/suboccipital']],
];
export const HEAD_NECK_ORGAN_RULES: readonly Rule[] = [
  [/\bparotid (?:gland|duct)\b/, ['glands/parotid']],
  [/\bsubmandibular (?:gland|duct)\b/, ['glands/submandibular']],
  [/\bsublingual (?:gland|duct)\b/, ['glands/sublingual']],
  [/\blacrimal gland\b/, ['glands/lacrimal']],
  [/\bthyroid gland\b/, ['glands/thyroid']],
  [/\bparathyroid gland\b/, ['glands/parathyroid']],
  [/eye|eyeball|sclera|cornea|iris|retina|lens|vitreous|ciliary body|lacrimal|zonular|nasolacrimal/, ['head/orbit']],
  [/nasal cavity|nasopharynx/, ['head/nasal-pterygopalatine']],
  [/tongue|sublingual|submandibular|parotid duct/, ['head/oral']],
  [/parotid|submandibular|sublingual/, ['head/parotid']],
  [/submandibular/, ['anterior-triangle/submandibular']],
  [/thyroid|parathyroid|^trachea$|^larynx$/, ['anterior-triangle/muscular']],
  [/^trachea$|oesophagus|esophagus|thyroid/, ['deep-neck/root-of-neck']],
  [/pharynx/, ['deep-neck/pharyngeal']],
];

export function matchingHeadNeckRegions(name: string, rules: readonly Rule[]): HeadNeckRegion[] {
  return [...new Set(rules.flatMap(([pattern, regions]) => pattern.test(name) ? regions : []))];
}
