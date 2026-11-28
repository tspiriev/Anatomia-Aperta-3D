import { headNeckTopographyName } from './headNeckTopography';
import { HEAD_NECK_MUSCLE_RULES, HEAD_NECK_VESSEL_RULES, HEAD_NECK_BONE_RULES,
  HEAD_NECK_NERVE_RULES, HEAD_NECK_ORGAN_RULES, matchingHeadNeckRegions } from './headNeckTopographyRules';
import { cervicalNerveName, headNeckCervicalNerveFamily, cervicalNerveRegions,
  cervicalPlexusSupplementalMemberships, cervicalNerveDetail, cervicalNerveLeaf } from './headNeckCervicalNerves';
import type { NeckTissue } from './neckTopographyRegions';
import { neckAnteriorMemberships } from './neckAnteriorTriangle';
import { isPosteriorCervicalVessel } from './neckPosteriorCervicalVessels';
import { neckPeripheralMemberships } from './neckPeripheralPlexuses';

export type NeckMembership = { region: string; tissue: NeckTissue };
export const isNeckBrainstemName = (name: string) => /^(?:pons|medulla oblongata)$/.test(name);
const suboccipitalMuscles = /^(?:obliquus (?:superior|inferior) capitis|rectus posterior (?:major|minor) capitis)(?: muscle)?$/;
function regionName(region: string): string | null {
  if (region.startsWith('head/')) return null;
  return region.replace(/^lateral-neck\/sternocleidomastoid$/, 'sternocleidomastoid')
    .replace(/^lateral-neck\/occipital-triangle$/, 'posterior-triangle/occipital')
    .replace(/^lateral-neck\/omoclavicular$/, 'posterior-triangle/omoclavicular')
    .replace(/^posterior-neck\/suboccipital$/, 'foramen-magnum/suboccipital')
    .replace(/^posterior-neck\/posterior-cervical$/, 'posterior-neck');
}

/** Standard regional relationships, bounded by the dedicated Neck CSV. */
export function neckMemberships(rawName: string): NeckMembership[] {
  const name = headNeckTopographyName(rawName);
  const nerveName = cervicalNerveName(rawName);
  // The export also contains CNS nuclei/tracts and distant anatomy. They are
  // not cervical peripheral branches or part of the brainstem surface shell.
  if (/nucleus|neucleus|nuclei|\btract\b|pyramid of medulla|^olive$/.test(name)
    && !/^nucleus pulposus/.test(name)) return [];
  const entries: NeckMembership[] = [];
  const add = (tissue: NeckTissue, regions: readonly string[]) => {
    for (const region of regions) {
      const mapped = regionName(region);
      if (mapped && /^(?:anterior-triangle|posterior-triangle|sternocleidomastoid|deep-neck|posterior-neck|foramen-magnum|cervical-plexus)(?:\/|$)/.test(mapped))
        entries.push({ region: mapped, tissue });
    }
  };
  const vein = /vein|venous|sinus|vena cava|vertebral venous pleus/.test(name);
  const neural = !vein && /nerve|gangli|plexus|sympathetic/.test(name);
  // This source label is truncated before "superior thyroid artery".
  const superiorThyroidGlandularBranch = /^anterior glandular branch of supe(?:rior thyroid artery)?$/.test(name);
  const artery = !neural && (/artery|arteries|arterial|aortic arch|brachiocephalic trunk|thyrocervical trunk|costocervical trunk/.test(name)
    || superiorThyroidGlandularBranch);
  const nerve = !artery && !vein && /nerve|gangli|plexus|sympathetic trunk|rami communicantes|ansa |brachial plexus|^c[1-8] /.test(name);
  const bone = /^(?:vertebra [ct]\d+|atlas \(c1\)|axis \(c2\)|hyoid bone|mandible|manubrium of sternum|clavicle|(?:first|second) rib|occipital bone|temporal bone|sphenoid bone)$/.test(name);
  const connective = /ligament|membrane|cartilage|nucleus pulposus|annulus fibrosus|intervertebral disc|joint/.test(name);
  const muscle = !artery && !vein && !nerve && !connective && /muscle|^platysma$|^levator scapulae$|pharyngeal constrictor/.test(name);
  if (artery || vein) {
    const tissue = vein ? 'veins' : 'arteries';
    add(tissue, matchingHeadNeckRegions(name, HEAD_NECK_VESSEL_RULES));
    if (isPosteriorCervicalVessel(name, tissue)) add(tissue, ['posterior-neck']);
    const superficialCarotidArtery = artery
      && (/(?:common|external|internal) carotid artery|facial artery|lingual artery|superior thyroid artery|cricothyroid artery|ascending pharyngeal artery|occipital artery|posterior auricular artery/.test(name)
        || superiorThyroidGlandularBranch);
    const superficialJugularVein = vein
      && /^(?:(?:internal|external|anterior) jugular vein|(?:common )?facial vein|lingual vein|(?:superior|middle) thyroid vein|(?:anterior division of |posterior division of )?retromandibular vein|(?:posterior auricular|occipital|submental|transverse cervical|suprascapular) vein)$/.test(name);
    if (superficialCarotidArtery || superficialJugularVein)
      add(tissue, ['sternocleidomastoid']);
    if (artery && /^internal carotid artery$/.test(name))
      add('arteries', ['deep-neck/prevertebral', 'deep-neck/root-of-neck']);
    if (artery && /^common carotid artery$/.test(name))
      add('arteries', ['deep-neck/root-of-neck']);
    if (/subclavian|thyrocervical|costocervical|brachiocephalic|aortic arch|^superior vena cava$/.test(name))
      add(tissue, ['deep-neck/root-of-neck', 'posterior-triangle/omoclavicular']);
    if (/deep cervical|transverse cervical/.test(name))
      add(tissue, ['posterior-triangle/occipital', 'posterior-neck', 'deep-neck/prevertebral']);
    if (/vertebral artery|cervical vertebral venous pleus|basilar venous plexus/.test(name))
      add(tissue, ['foramen-magnum/suboccipital', 'foramen-magnum/junction']);
    if (/^basilar artery$|^anterior spinal artery$/.test(name))
      add(tissue, ['foramen-magnum/junction']);
  } else if (isNeckBrainstemName(name)) {
    add('nerves', ['foramen-magnum/brainstem', 'foramen-magnum/junction']);
  } else if (nerve) {
    add('nerves', matchingHeadNeckRegions(name, HEAD_NECK_NERVE_RULES));
    const family = headNeckCervicalNerveFamily(rawName);
    if (family !== 'brachial-plexus') add('nerves', cervicalNerveRegions(rawName));
    if (family === 'cervical-plexus') {
      const detail = cervicalNerveDetail(rawName, family);
      const leaf = detail ? cervicalNerveLeaf(rawName, family, detail) : null;
      const branch = detail === 'ansa' ? `ansa/${leaf === 'ansa' ? 'loop' : leaf ?? 'loop'}`
        : detail === 'cutaneous' ? `cutaneous/${leaf ?? 'other'}`
        : detail === 'phrenic' ? 'phrenic' : 'roots';
      add('nerves', [`cervical-plexus/${branch}`]);
    }
    if (family === 'spinal-roots' || family === 'spinal-nerves')
      add('nerves', ['cervical-plexus/spinal-context', 'deep-neck/prevertebral', 'posterior-neck']);
    if (/^roots of brachial plexus$/.test(nerveName))
      add('nerves', ['cervical-plexus/brachial-plexus/roots', 'deep-neck/root-of-neck',
        'deep-neck/prevertebral', 'posterior-triangle/occipital', 'posterior-triangle/omoclavicular']);
    const trunk = nerveName.match(/^(superior|middle|inferior) trunk of brachial plexus$/);
    if (trunk) add('nerves', [`cervical-plexus/brachial-plexus/trunks/${trunk[1]}`,
      'deep-neck/root-of-neck', 'posterior-triangle/occipital', 'posterior-triangle/omoclavicular']);
    if (/hypoglossal nerve/.test(name)) add('nerves', ['cervical-plexus/c1-via-xii']);
    if (/greater occipital nerve|^c[12] spinal nerve$|suboccipital nerve/.test(nerveName))
      add('nerves', ['foramen-magnum/suboccipital', 'foramen-magnum/junction']);
    if (/hypoglossal nerve|accessory nerve|vagus nerve|glossopharyngeal nerve/.test(name)
      && !/nucleus|root|gangli|branch|plexus/.test(name))
      add('nerves', ['foramen-magnum/junction']);
    if (/sympathetic trunk|cervical.*sympathetic|carotid artery sympathetic plexus|rami communicantes/.test(name))
      add('nerves', ['deep-neck/prevertebral', 'deep-neck/root-of-neck', 'anterior-triangle/carotid']);
    if (/oesophagus.*plexus|esophagus.*plexus/.test(name))
      add('nerves', ['deep-neck/pharyngeal', 'deep-neck/root-of-neck']);
    if (/cardiac nerve vagus|cardiac sympathetic nerve/.test(name) && !/thoracic/.test(name))
      add('nerves', ['deep-neck/root-of-neck']);
    if (/^recurrent laryngeal nerve$/.test(name))
      add('nerves', ['deep-neck/root-of-neck', 'deep-neck/pharyngeal']);
    if (/^(?:vagus nerve \(x\)|superior laryngeal nerve|pharyngeal branch of (?:the )?vagus nerve)$/.test(name))
      add('nerves', ['deep-neck/pharyngeal']);
  } else if (bone) {
    add('bones', matchingHeadNeckRegions(name, HEAD_NECK_BONE_RULES));
    if (/^(?:vertebra c[1-7]|atlas \(c1\)|axis \(c2\)|occipital bone|temporal bone)$/.test(name))
      add('bones', ['sternocleidomastoid']);
    if (/vertebra c[1-7]|atlas|axis/.test(name))
      add('bones', ['posterior-neck', 'deep-neck/prevertebral', 'cervical-plexus/relations']);
    if (/occipital|sphenoid|atlas|axis/.test(name))
      add('bones', ['foramen-magnum/junction', 'foramen-magnum/suboccipital']);
    if (/^(?:vertebra c[1-7]|atlas \(c1\)|axis \(c2\)|occipital bone)$/.test(name))
      add('bones', ['posterior-triangle', 'posterior-triangle/occipital']);
    if (/^(?:vertebra c[1-7]|atlas \(c1\)|axis \(c2\))$/.test(name))
      add('bones', ['posterior-triangle/omoclavicular']);
    if (/vertebra t[1-4]|first rib|second rib|clavicle|manubrium/.test(name))
      add('bones', ['deep-neck/root-of-neck']);
  } else if (/fascia/.test(name)) {
    add('fasciae', ['sternocleidomastoid', 'anterior-triangle', 'posterior-triangle']);
  } else if (muscle) {
    add('muscles', matchingHeadNeckRegions(name, HEAD_NECK_MUSCLE_RULES));
    // Whole deep-muscle meshes intentionally overlap these two teaching views.
    // "Colli" is the source's name for the cervical/cervicis component.
    if (/^(?:(?:semispinalis|longissimus|splenius) (?:capitis|colli|cervicis)|obliquus superior capitis|rectus posterior (?:major|minor) capitis|rectus lateralis capitis)(?: muscle)?$/.test(name))
      add('muscles', ['posterior-triangle', 'posterior-triangle/occipital']);
    if (suboccipitalMuscles.test(name))
      add('muscles', ['foramen-magnum/suboccipital', 'foramen-magnum/junction']);
    if (/rectus (?:anterior|lateralis) capitis|longus (?:colli|capitis)|scalenus|levator scapulae/.test(name))
      add('muscles', ['deep-neck/prevertebral', 'cervical-plexus/motor', 'cervical-plexus/relations']);
    if (/thyrohyoid|geniohyoid/.test(name))
      add('muscles', ['cervical-plexus/c1-via-xii']);
    if (/sternohyoid|sternothyroid|omohyoid/.test(name))
      add('muscles', ['cervical-plexus/ansa']);
    if (/arytenoid|cricothyroid|pharyngeal constrictor|stylopharyngeus|palatopharyngeus/.test(name))
      add('muscles', ['anterior-triangle/muscular', 'deep-neck/pharyngeal']);
    if (/trapezius|sternocleidomastoid/.test(name))
      add('muscles', ['posterior-triangle/occipital', 'posterior-triangle/omoclavicular']);
    if (/genioglossus|hyoglossus|geniohyoid/.test(name))
      add('muscles', ['anterior-triangle/submandibular']);
  } else if (connective) {
    if (/thyro|crico|arytenoid|corniculate|quadrangular membrane/.test(name))
      add('joints', ['anterior-triangle/muscular', 'deep-neck/pharyngeal']);
    if (/stylohyoid|stylomandibular/.test(name)) add('joints', ['anterior-triangle/submandibular']);
    if (/nuchal|(?:nucleus pulposus|intervertebral disc|annulus fibrosus) c|atlanto|alar ligament|tectorial|apical ligament|longitudinal ligament|ligamenta flava|intertransverse ligament|interspinous ligament|supraspinous ligament/.test(name))
      add('joints', ['posterior-neck', 'deep-neck/prevertebral']);
    if (/c7[-–]t1|costal cartilage of (?:first|second) rib/.test(name))
      add('joints', ['deep-neck/root-of-neck']);
    if (/atlanto|alar ligament|tectorial|apical ligament|nuchal/.test(name))
      add('joints', ['foramen-magnum/junction']);
  } else {
    add('organs', matchingHeadNeckRegions(name, HEAD_NECK_ORGAN_RULES));
    if (/^trachea$/.test(name))
      add('organs', ['deep-neck/prevertebral', 'deep-neck/root-of-neck', 'deep-neck/pharyngeal']);
    if (/^oesophagus$|^esophagus$/.test(name)) add('organs', ['deep-neck/pharyngeal']);
    if (/^carotid body/.test(name)) add('organs', ['anterior-triangle/carotid']);
  }
  for (const m of cervicalPlexusSupplementalMemberships(rawName)) add(m.tissue, [m.region]);
  return [...new Map(neckPeripheralMemberships(rawName, neckAnteriorMemberships(rawName, entries))
    .map(m => [`${m.region}/${m.tissue}`, m])).values()];
}
