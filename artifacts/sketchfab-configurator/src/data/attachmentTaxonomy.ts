import csv from '@assets/Skeletal_system_and_muscle_attachments_1791278212022.csv?raw';
import { csvRows } from './anatomicalSystems';
import type { NervousGroup } from './nervousTaxonomy';

// The export has two flat attachment collections. Regions describe the named
// muscle, not the position of each individual origin/insertion patch.
const muscleRegions = [
  { id: 'head-face', label: '01 Head & Face' },
  { id: 'cervical', label: '02 Cervical' },
  { id: 'thoracic', label: '03 Thoracic' },
  { id: 'back', label: '04 Back' },
  { id: 'abdominal', label: '05 Abdominal' },
  { id: 'hip-pelvis', label: '06 Hip & Pelvis' },
  { id: 'upper-extremity', label: '07 Upper Extremity' },
  { id: 'lower-extremity', label: '08 Lower Extremity' },
] as const;
type MuscleRegion = typeof muscleRegions[number]['id'];

export const ATTACHMENT_GROUPS: readonly NervousGroup[] = [
  { id: 'attachment-muscles', label: '01 Muscle Attachments', children: muscleRegions },
  {
    id: 'attachment-tendons',
    label: '02 Tendon & Ligament Attachments',
    children: [
      { id: 'elbow', label: 'Elbow — Common Tendons' },
      { id: 'hip', label: 'Hip — Tensor Fasciae Latae' },
      { id: 'knee', label: 'Knee — Patellar Ligament' },
      { id: 'foot', label: 'Foot — Long Plantar Ligament' },
    ],
  },
];

// Exact reviewed muscle identities avoid collisions between hand/foot muscles
// and similarly named muscles (e.g. extensor digitorum vs its longus variant).
const regionByMuscle = new Map<string, MuscleRegion>();
function assign(region: MuscleRegion, names: readonly string[]) {
  for (const name of names) {
    const key = name.toLowerCase();
    if (regionByMuscle.has(key)) throw new Error(`Duplicate attachment muscle: ${name}`);
    regionByMuscle.set(key, region);
  }
}

assign('head-face', [
  'Bucinator', 'Depressor anguli oris', 'Depressor labii inferioris',
  'Depressor septi nasi', 'Frontalis muscle', 'Lateral pterygoid muscle',
  'Levator anguli oris', 'Levator labii superioris', 'Levator nasolabialis',
  'Masseter', 'Medial pterygoid muscle', 'Mentalis muscle', 'Nasalis muscle',
  'Occipitalis muscle', 'Orbicularis oris muscle', 'Orbital part of orbicularis oculi',
  'Procerus muscle', 'Temporalis muscle', 'Zygomaticus major muscle', 'Zygomaticus minor muscle',
]);
assign('cervical', [
  'Anterior belly of digastric muscle', 'Geniohyoid muscle', 'Iliocostalis colli muscle',
  'Levator scapulae', 'Longus capitis muscle', 'Mylohyoid muscle', 'Omohyoid muscle',
  'Obliquus inferior capitis muscle', 'Obliquus superior capitis muscle',
  'Rectus anterior capitis muscle', 'Rectus lateralis capitis muscle',
  'Rectus posterior major capitis muscle', 'Rectus posterior minor capitis muscle',
  'Scalenus anterior muscle', 'Scalenus medius muscle', 'Scalenus posterior muscle',
  'Spinalis capitis muscle', 'Splenius colli muscle', 'Sternocleidomastoid muscle',
  'Sternohyoid muscle', 'Thyrohyoid muscle',
]);
assign('thoracic', [
  '(Abdominal part of pectoralis major muscle)', 'Diaphragm', 'Pectoralis major muscle',
  'Pectoralis minor muscle', 'Serratus anterior muscle', 'Subclavius muscle',
  'Sternocostal head of pectoralis major muscle', 'Transversus thoracis muscle',
]);
assign('back', [
  'Ascending part of trapezius muscle', 'Descending part of trapezius muscle',
  'Transverse part of trapezius muscle', 'Erector spinae', 'Latissimus dorsi muscle',
  'Levatores longi costarum', 'Longissimus thoracis muscle', 'Rhomboid major muscle',
  'Rhomboid minor muscle', 'Serratus posterior inferior muscle', 'Serratus posterior superior muscle',
]);
assign('abdominal', [
  'External abdominal oblique muscle', 'Internal abdominal oblique muscle',
  'Rectus abdominis muscle', 'Transversus abdominis muscle',
]);
assign('hip-pelvis', [
  'Gluteus maximus muscle', 'Gluteus medius muscle', 'Gluteus minimus muscle',
  'Iliacus muscle', 'Iliopsoas muscle', 'Inferior gemellus muscle', 'Superior gemellus muscle',
  'Levator ani', 'Obturator externus', 'Obturator internus', 'Piriformis muscle',
  'Quadratus femoris muscle', 'Trochanteric insertion',
]);
assign('upper-extremity', [
  'Abductor digiti minimi of hand', 'Abductor pollicis longus',
  'Acromial part of deltoid muscle', 'Adductor pollicis', 'Anconeus muscle',
  'Biceps brachii muscle', 'Brachialis muscle', 'Brachioradialis muscle',
  'Clavicular part of deltoid muscle', 'Coracobrachialis muscle',
  'Deep head of flexor pollicis brevis', 'Deltoid muscle',
  'Dorsal interossei muscles of hand', 'Extensor carpi radialis brevis',
  'Extensor carpi radialis longus', 'Extensor carpi ulnaris', 'Extensor digitorum',
  'Extensor indicis', 'Extensor pollicis brevis', 'Extensor pollicis longus',
  'Flexor carpi ulnaris', 'Flexor digiti minimi of hand', 'Flexor digitorum profundus',
  'Flexor digitorum superficialis', 'Flexor pollicis longus', 'Infraspinatus muscle',
  'Lateral head of triceps brachii', 'Long head of biceps brachii',
  'Long head of triceps brachii', 'Medial head of triceps brachii',
  'Opponens digiti minimi muscle of hand', 'Pronator quadratus', 'Pronator teres',
  'Scapular spinal part of deltoid muscle', 'Short head of biceps brachii',
  'Subscapularis muscle', 'Supinator', 'Supraspinatus muscle',
  'Teres major muscle', 'Teres minor muscle', 'Triceps brachii muscle',
  'Ulnar head of flexor carpi ulnaris',
]);
assign('lower-extremity', [
  '(Opponens digiti minimi muscle of foot)', 'Abductor digiti minimi of foot',
  'Abductor hallucis', 'Adductor longus', 'Adductor magnus', 'Articularis genus muscle',
  'Biceps femoris muscle', 'Extensor digitorum brevis', 'Extensor digitorum longus',
  'Extensor hallucis brevis', 'Extensor hallucis longus', 'Fibularis brevis muscle',
  'Fibularis longus muscle', 'Fibularis tertius muscle', 'Flexor digiti minimi of foot',
  'Flexor digitorum brevis', 'Flexor digitorum longus', 'Flexor hallucis longus',
  'Gracilis muscle', 'Lateral head of flexor hallucis brevis', 'Lateral head of gastrocnemius',
  'Long head of biceps femoris', 'Medial head of flexor hallucis brevis',
  'Medial head of gastrocnemius', 'Oblique head of adductor hallucis', 'Pectineus muscle',
  'Plantar interossei muscles', 'Plantaris muscle', 'Popliteus muscle',
  'Quadriceps femoris muscle', 'Rectus femoris muscle', 'Sartorius muscle',
  'Semimembranosus muscle', 'Semitendinosus muscle', 'Short head of biceps femoris',
  'Soleus muscle', 'Tibialis anterior muscle', 'Tibialis posterior muscle',
  'Transverse head of adductor hallucis', 'Triceps surae muscle',
  'Vastus intermedius muscle', 'Vastus lateralis muscle', 'Vastus medialis muscle',
]);

const tendonRegion = new Map([
  ['common extensor tendon', 'elbow'],
  ['common flexor tendon', 'elbow'],
  ['tensor fasciae latae', 'hip'],
  ['patellar ligament', 'knee'],
  ['long plantar ligament', 'foot'],
]);

const pathByObject = new Map<string, readonly string[]>();
for (const row of csvRows(csv)) {
  if (row[0] !== 'OBJECT' || !['MESH', 'CURVE'].includes(row[5]) || !row[4]) continue;
  const key = row[4].trim().toLowerCase();
  // Preserve the original name, and remove only its attachment-site suffix
  // for lookup: o/e + optional site number + left/right.
  const muscle = key.replace(/\.[oe]\d*[lr]$/, '');
  const region = row[1] === 'MUSCLE_ATTACHMENTS' ? regionByMuscle.get(muscle)
    : row[1] === 'TENDON_LIGAMENT_ATTACHMENTS' ? tendonRegion.get(muscle) : undefined;
  if (!region) continue; // Unknown future names remain accessible for review.
  const root = row[1] === 'MUSCLE_ATTACHMENTS' ? 'attachment-muscles' : 'attachment-tendons';
  const path = [root, region];
  const previous = pathByObject.get(key);
  if (previous && previous.join('/') !== path.join('/')) {
    throw new Error(`Attachment region is ambiguous for ${row[4]}`);
  }
  pathByObject.set(key, path);
}

export function classifyAttachmentObject(rawName: string): readonly string[] | null {
  const key = rawName.trim().toLowerCase();
  return pathByObject.get(key) ?? pathByObject.get(key.replace(/_\d+$/, '').trimEnd()) ?? null;
}
