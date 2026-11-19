import type { LowerLimbMembership, LowerLimbTissue } from './lowerLimbTopographyRegions';
import { lumbarPelvicVesselRegions } from './lowerLimbLumbarPelvic';
import { hipGlutealVesselRegions, isLowerLimbCaudaComponent } from './lowerLimbHipGluteal';

/** Assign whole named pathways; source meshes may cross neighboring regions. */
export function lowerLimbNeurovascular(name: string, tissue: LowerLimbTissue): LowerLimbMembership[] {
  const regions = new Set<string>();
  const add = (...items: string[]) => items.forEach(item => regions.add(item));
  if (tissue === 'nerves') {
    if (isLowerLimbCaudaComponent(name)) add('hip-gluteal/gluteal/cauda-equina', 'thigh');
    if (/^(?:l[1-5]|s[1-4]) (?:root$|.*gangli)|^dorsal ramus l[1-5]$/.test(name))
      add('hip-gluteal/gluteal');
    if (/^(?:(?:l[1-5]|th?12) .*(?:root|gangli|nerve)|dorsal ramus l[1-5]|lumbar plexus|rami communicantes.*lumbar)/.test(name))
      add('lumbar-pelvic/lumbar-plexus');
    if (/ventral.*ramus th?12/.test(name)) add('lumbar-pelvic/lumbar-plexus');
    // Superior cluneal nerves are L1–L3 dorsal-ramus branches, not sacral
    // plexus branches. Keep the requested overlapping pelvic teaching view
    // with their actual available origin components.
    if (/^l[1-3] .*(?:root|gangli)|^dorsal ramus l[1-3]$/.test(name))
      add('lumbar-pelvic/sacral-plexus');
    if (/^l[45] .*(?:root|gangli)/.test(name)) add('lumbar-pelvic/sacral-plexus');
    if (/^(?:s[1-4] .*root|s[1-4] root|sacral plexus|sympathetic ganglia sacral|ganglion impar|rami communicantes.*sacral)/.test(name))
      add('lumbar-pelvic/sacral-plexus');
    if (/iliohypogastric|ilio-?inguinal|genitofemoral/.test(name))
      add('lumbar-pelvic/lumbar-plexus', 'hip-gluteal/iliopsoas');
    if (/^(?:ilio-?inguinal nerve|genitofemoral nerve|femoral branch of genitofemoral nerve)$/.test(name))
      add('thigh/anterior', 'thigh/femoral-triangle');
    if (/\bfemoral nerve|saphenous nerve/.test(name)) {
      add('lumbar-pelvic/lumbar-plexus', 'thigh/anterior', 'thigh/femoral-triangle');
      if (/saphenous/.test(name)) {
        add('thigh/adductor-canal', 'knee', 'leg', 'ankle', 'foot');
        if (/infrapatellar/.test(name)) {
          regions.clear(); add('knee/patellar');
        } else if (/medial crural cutaneous/.test(name)) {
          regions.clear(); add('leg', 'ankle');
        }
      }
    }
    if (/femoral branch of genitofemoral nerve/.test(name)) add('thigh/femoral-triangle');
    if (/lateral femoral cutaneous/.test(name))
      add('lumbar-pelvic/lumbar-plexus', 'hip-gluteal/iliopsoas', 'thigh/anterior');
    if (/obturator nerve/.test(name))
      add('lumbar-pelvic/lumbar-plexus', 'thigh/medial');
    if (/sciatic nerve/.test(name))
      add('lumbar-pelvic/sacral-plexus', 'hip-gluteal/rotators', 'thigh/posterior', 'knee/popliteal');
    if (/gluteal nerve|cluneal nerve|clluneal nerve/.test(name))
      add('lumbar-pelvic/sacral-plexus', 'hip-gluteal/gluteal');
    if (/superior cluneal nerve/.test(name)) add('lumbar-pelvic/lumbar-plexus');
    if (/nerve to (?:piriformis|quadratus femoris|obturator internus)/.test(name))
      add('lumbar-pelvic/sacral-plexus', 'hip-gluteal/rotators');
    if (/pudendal|pudental/.test(name)) add('lumbar-pelvic/sacral-plexus');
    if (/posterior femoral cutaneous/.test(name))
      add('hip-gluteal/gluteal', 'thigh/posterior');
    if (/common fibular nerve/.test(name))
      add('thigh/posterior', 'knee/popliteal', 'leg/lateral');
    if (/deep fibular nerve/.test(name)) {
      add('leg/anterior', 'ankle/anterior-ankle', 'foot/dorsal');
      if (/dorsal digital/.test(name)) { regions.clear(); add('foot/dorsal'); }
    }
    if (/superficial fibular|dorsal cutaneous nerve of foot/.test(name)) {
      add('leg/lateral', 'ankle/anterior-ankle', 'foot/dorsal');
      if (name === 'superficial fibular nerve') add('leg/anterior');
      if (/dorsal digital|dorsal cutaneous nerve of foot/.test(name)) { regions.clear(); add('foot/dorsal'); }
    }
    if (/tibial nerve/.test(name))
      add('knee/popliteal', 'leg/posterior/deep', 'ankle/tarsal-tunnel');
    if (/sural nerve|sural cutaneous nerve|sural communicating/.test(name))
      add('knee/popliteal', 'leg/posterior/superficial', 'ankle/lateral-ankle', 'foot');
    if (/plantar nerve/.test(name)) {
      add('ankle/tarsal-tunnel', 'foot/plantar');
      if (/digital/.test(name)) { regions.clear(); add('foot/plantar'); }
    }
    if (/sural communicating branch|medial sural cutaneous nerve/.test(name)) {
      regions.clear(); add('knee/popliteal', 'leg/posterior/superficial');
    }
    if (/muscular branches of deep fibular nerve/.test(name)) {
      regions.clear(); add('leg/anterior');
    }
  } else {
    add(...lumbarPelvicVesselRegions(name));
    add(...hipGlutealVesselRegions(name));
    if (/^(?:inferior|superficial) epigastric|^(?:superficial|deep) external pudendal|^great saphenous vein/.test(name))
      add('thigh/anterior', 'thigh/femoral-triangle');
    // Collection metadata is unreliable: the export files many vessels as muscles.
    if (/^(?:common iliac|external iliac|internal iliac|posterior division of internal iliac|median sacral|lateral sacral|iliolumbar|lumbar|ascending lumbar)|(?:spinal|lumbar) branch of iliolumbar/.test(name))
      add('lumbar-pelvic');
    if (/gluteal (?:arter|vein)/.test(name)) add('hip-gluteal/gluteal', 'lumbar-pelvic/sacral-plexus');
    if (/obturator (?:arter|vein)/.test(name)) add('lumbar-pelvic', 'thigh/medial');
    if (/circumflex femoral/.test(name)) add('hip-gluteal', 'thigh/anterior', 'thigh/femoral-triangle');
    if (/medial circumflex femoral/.test(name)) add('hip-gluteal/rotators');
    if (/^(?:common )?femoral (?:arter|vein)/.test(name))
      add('thigh/anterior', 'thigh/femoral-triangle', 'thigh/adductor-canal');
    if (/^deep (?:artery|vein) of thigh|^deep femoral/.test(name))
      add('thigh/femoral-triangle', 'thigh/medial', 'thigh/posterior');
    if (/perforating femoral/.test(name)) add('thigh/medial', 'thigh/posterior');
    if (/descending genicular/.test(name)) add('thigh/adductor-canal', 'knee');
    if (/genicular/.test(name) && !/descending/.test(name)) add('knee/popliteal');
    if (/patellar anastomosis/.test(name)) add('knee/patellar');
    if (/popliteal (?:arter|vein)/.test(name)) add('knee/popliteal', 'leg/posterior/deep');
    if (/^anterior tibial/.test(name)) add('leg/anterior', 'ankle/anterior-ankle', 'foot/dorsal');
    if (/^posterior tibial/.test(name)) add('leg/posterior/deep', 'ankle/tarsal-tunnel');
    if (/^(?:fibular|peroneal) (?:arter|vein)/.test(name))
      add('leg/posterior/deep', 'leg/lateral', 'ankle/lateral-ankle');
    if (/^great saphenous/.test(name)) add('thigh/femoral-triangle', 'knee', 'leg', 'ankle', 'foot');
    if (/^small saphenous/.test(name)) add('knee/popliteal', 'leg/posterior/superficial', 'ankle/lateral-ankle', 'foot');
    if (/^perforating veins?$/.test(name)) add('thigh');
    if (/superficial (?:epigastric|external pudendal)|^inferior epigastric|^deep circumflex iliac/.test(name)) {
      add('thigh/femoral-triangle');
      if (!/epigastric/.test(name)) add('hip-gluteal/iliopsoas');
    }
    if (/plantar|dorsalis pedis|dorsal.*(?:foot|metatarsal|digital)|arcuate artery|tarsal artery|intercapitular.*foot/.test(name)) {
      add(/plantar/.test(name) ? 'foot/plantar' : 'foot/dorsal');
      if (/^(?:medial|lateral) plantar (?:arter|vein)/.test(name)) add('ankle/tarsal-tunnel');
    }
  }
  return [...regions].map(region => ({ region, tissue }));
}
