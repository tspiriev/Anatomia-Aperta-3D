import { lowerLimbMuscleSubdivision } from './musculoskeletalLowerLimb';
import { lowerLimbNeurovascular } from './lowerLimbTopographyNeurovascular';
import type { LowerLimbMembership, LowerLimbTissue } from './lowerLimbTopographyRegions';
import { lowerLimbName } from './lowerLimbNames';
import { isLowerLimbSpinalCord } from './lowerLimbLumbarPelvic';
import { isLowerLimbCaudaEquina, isLowerLimbLumbarSacralBone } from './lowerLimbHipGluteal';
export { lowerLimbName } from './lowerLimbNames';

const footBone = /^(?:(?:first|second|third|fourth|fifth) metatarsal bone|(?:proximal|middle|distal) phalanx.*of foot|sesamoid bones of foot|(?:medial|intermediate|lateral) cuneiform bone|talus|calcaneus|navicular bone|cuboid bone)$/;
const cervicalOrCranial = /\bc[1-8]\b|vestibulo|cochlear|vestibular|gasserian|cranial/;
const hipRotator = /^(?:piriformis|quadratus femoris|obturator (?:internus|externus)|(?:superior|inferior) gemellus)(?: muscle)?$/;
const lumbarMuscle = /lumborum|quadratus lumborum/;

export function lowerLimbMemberships(raw: string, collection: string): LowerLimbMembership[] {
  const name = lowerLimbName(raw), entries: LowerLimbMembership[] = [];
  const add = (tissue: LowerLimbTissue, ...regions: string[]) =>
    regions.forEach(region => entries.push({ region, tissue }));
  // Preserve source identity, but do not turn unrelated cranial review objects
  // or upper-limb capsules into lower-limb anatomy because of their collection.
  if (cervicalOrCranial.test(name) || (/nucle/.test(name) && !/^nucleus pulposus\b/.test(name))
    || /metacarp|of hand|of arm|of forearm/.test(name)) return [];
  if (/^(?:(?:lumbar|lumbosacral) )?spinal cord$|^anterior horn of spinal cord$|^spinal dura$/.test(name)) {
    add('nerves', 'lumbar-pelvic/lumbar-plexus', 'lumbar-pelvic/sacral-plexus');
    if (isLowerLimbSpinalCord(raw)) add('nerves', 'hip-gluteal/gluteal');
    return entries;
  }
  if (isLowerLimbCaudaEquina(raw) || name === 'filum terminale') {
    add('nerves', 'hip-gluteal/gluteal/cauda-equina');
    add('nerves', 'thigh');
    return entries;
  }
  const vein = /vein|venous|vena cava/.test(name);
  const artery = !vein && /artery|arteries|arterial|aorta|^coeliac trunk$|patellar anastomosis|^plantar arch$/.test(name);
  const neural = !vein && !artery && /nerve|plexus|root|gangli|ramus|rami/.test(name);
  if (vein || artery || neural) {
    entries.push(...lowerLimbNeurovascular(name, vein ? 'veins' : artery ? 'arteries' : 'nerves'));
  } else if (footBone.test(name)) {
    add('bones', 'foot');
    add('bones', 'foot/dorsal', 'foot/plantar/layer-1', 'foot/plantar/layer-2', 'foot/plantar/layer-3', 'foot/plantar/layer-4');
    if (/^(?:talus|calcaneus|navicular bone)$/.test(name))
      add('bones', 'ankle/anterior-ankle', 'ankle/tarsal-tunnel', 'ankle/lateral-ankle', 'ankle/posterior-ankle');
  } else if (/^(?:vertebra (?:l[1-5]|t12)|sacrum|coccyx|hip bone|twelfth rib)$/.test(name)) {
    add('bones', 'lumbar-pelvic');
    if (/vertebra|twelfth rib/.test(name)) add('bones', 'lumbar-pelvic/lumbar-plexus');
    if (/sacrum|coccyx|hip bone/.test(name)) add('bones', 'lumbar-pelvic/sacral-plexus');
    if (/hip bone|sacrum/.test(name)) add('bones', 'hip-gluteal');
    if (name === 'hip bone') add('bones', 'thigh/anterior', 'thigh/femoral-triangle');
    if (isLowerLimbLumbarSacralBone(raw))
      add('bones', 'hip-gluteal/iliopsoas', 'hip-gluteal/gluteal');
  } else if (/^(?:femur|patella|tibia|fibula)$/.test(name)) {
    if (name === 'femur') add('bones', 'hip-gluteal', 'thigh/anterior', 'thigh/medial', 'thigh/posterior', 'knee/patellar', 'knee/popliteal');
    if (name === 'patella') add('bones', 'knee/patellar');
    if (/tibia|fibula/.test(name))
      add('bones', 'knee/patellar', 'knee/popliteal', 'leg/anterior', 'leg/lateral', 'leg/posterior/superficial', 'leg/posterior/deep',
        'ankle/anterior-ankle', 'ankle/lateral-ankle', 'ankle/tarsal-tunnel', 'ankle/posterior-ankle');
  } else if (/bursa|bursae/.test(name)) {
    if (/glute|trochanter|piriformis|obturator|iliacus|iliopectineal/.test(name)) add('bursae', 'hip-gluteal');
    if (/patellar|anserine|gastrocnemius|semimembranosus|biceps femoris|sartorius|tuberosity of tibia/.test(name)) add('bursae', 'knee');
    if (/malleol|calcaneal|tibialis anterior/.test(name)) add('bursae', 'ankle', 'foot');
  } else if (/fascia|aponeurosis|septum|retinaculum|\btendon\b|tendinous sheath|iliotibial tract|iliopectineal arch/.test(name)
    && !/^tensor fasciae latae$/.test(name)) {
    if (/piriformis|gluteal/.test(name)) add('fasciae', 'hip-gluteal/gluteal');
    if (/iliac fascia|psoas fascia|iliopsoas fascia|thoracolumbar/.test(name))
      add('fasciae', 'lumbar-pelvic/lumbar-plexus', 'hip-gluteal/iliopsoas');
    if (/lata|femoral|iliotibial|septum.*thigh/.test(name))
      add('fasciae', 'thigh');
    if (/iliotibial/.test(name)) add('fasciae', 'hip-gluteal/gluteal', 'knee');
    if (/iliopectineal/.test(name)) add('fasciae', 'hip-gluteal/iliopsoas', 'thigh');
    if (/septum of leg|crural/.test(name)) add('fasciae', 'leg');
    if (/popliteal|patellar/.test(name)) add('fasciae', 'knee');
    if (/plantar/.test(name)) add('fasciae', 'foot/plantar');
    if (/ankle|fibular|calcaneal|hallucis longus|digitorum longus|tibialis/.test(name)) {
      add('fasciae', 'ankle');
      if (/fibular/.test(name)) add('fasciae', 'ankle/lateral-ankle');
      if (/flexor|tibialis posterior/.test(name)) add('fasciae', 'ankle/tarsal-tunnel');
      if (/extensor|tibialis anterior/.test(name)) add('fasciae', 'ankle/anterior-ankle');
      if (/calcaneal tendon/.test(name)) add('fasciae', 'ankle/posterior-ankle', 'leg');
    }
  } else if (/ligament|capsul|cartilage|menisc|labrum|membrane|symphys|disc|pulposus|fibrosus|frenula|zona orbicularis|fat pad/.test(name)
    || collection.toUpperCase() === 'JOINTS') {
    if (name === 'inguinal ligament') add('joints', 'thigh/anterior', 'thigh/femoral-triangle');
    if (/sacro|iliolumbar|pubic|pubofemoral|ischiofemoral|iliofemoral|acetabul|hip joint|obturator membrane|head of femur|triradiate|zona orbicularis|frenula/.test(name))
      add('joints', 'hip-gluteal');
    if (/sacro|sacrococcy|intercornual|interpubic|pubic symphysis|iliolumbar|inguinal|intervertebral|pulposus|fibrosus|longitudinal ligament|intertransverse|interspinous|ligamenta flava/.test(name))
      add('joints', 'lumbar-pelvic');
    if (/patellar|menisc|cruciate|popliteal|popliteofibular|\bknee\b|fibular head|(?:tibial|fibular) collateral|superior tibiofibular/.test(name))
      add('joints', 'knee');
    if (/interosseous membrane of leg/.test(name)) add('joints', 'leg/anterior', 'leg/posterior');
    if (/talofibular|calcaneofibular|tibiotalar|tibiocalcaneal|tibionavicular|(?:anterior|posterior|transverse) tibiofibular/.test(name))
      add('joints', 'ankle');
    if (/talocalcaneal/.test(name)) add('joints', 'ankle');
    if (/tars|metatars|phalan|interphal|calcaneo|talocalcaneal|plantar ligament|cuneo|cuneiform|cuboid|navicular|intersesamoid/.test(name))
      add('joints', 'foot');
  } else {
    const subdivision = lowerLimbMuscleSubdivision(raw);
    if (subdivision && subdivision[0] !== 'associated-tissues') {
      const [region, ...parts] = subdivision;
      add('muscles', [region === 'hip' ? 'hip-gluteal' : region, ...parts.map(part =>
        region === 'hip' && part === 'flexors' ? 'iliopsoas' : part)].join('/'));
    }
    if (hipRotator.test(name)) add('muscles', 'hip-gluteal/rotators', 'lumbar-pelvic/sacral-plexus');
    if (/^(?:iliacus|psoas major|psoas minor|iliopsoas)(?: muscle)?$/.test(name) || lumbarMuscle.test(name))
      add('muscles', 'lumbar-pelvic/lumbar-plexus');
    if (/^(?:sartorius|pectineus|adductor longus|iliacus|psoas major)(?: muscle)?$/.test(name))
      add('muscles', 'thigh/femoral-triangle');
    if (/^(?:sartorius|vastus medialis|adductor longus|adductor magnus)(?: muscle)?$/.test(name))
      add('muscles', 'thigh/adductor-canal');
    if (/quadriceps|rectus femoris|vastus|sartorius|gracilis/.test(name))
      add('muscles', 'knee/patellar');
    if (/gastrocnemius|popliteus|plantaris|biceps femoris|semitendinosus|semimembranosus/.test(name))
      add('muscles', 'knee/popliteal');
    if (/^(?:tibialis anterior|extensor hallucis longus|extensor digitorum longus|fibularis tertius)(?: muscle)?$/.test(name))
      add('muscles', 'ankle/anterior-ankle', 'foot/dorsal');
    if (/^(?:tibialis posterior|flexor hallucis longus|flexor digitorum longus)(?: muscle)?$/.test(name))
      add('muscles', 'ankle/tarsal-tunnel');
    if (/^(?:fibularis longus|fibularis brevis)(?: muscle)?$/.test(name))
      add('muscles', 'ankle/lateral-ankle');
    if (/gastrocnemius|soleus|plantaris/.test(name)) add('muscles', 'ankle/posterior-ankle');
  }
  return [...new Map(entries.map(m => [`${m.region}/${m.tissue}`, m])).values()];
}
