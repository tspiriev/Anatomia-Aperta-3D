import type { NervousGroup } from './nervousTaxonomy';

const groups: readonly NervousGroup[] = [
  { id: 'hip', label: 'Hip and gluteal region', children: [
    { id: 'flexors', label: 'Hip flexors — iliacus and psoas' },
    { id: 'gluteal', label: 'Gluteal muscles' },
  ] },
  { id: 'thigh', label: 'Thigh', children: [
    { id: 'anterior', label: 'Anterior thigh — quadriceps and sartorius' },
    { id: 'medial', label: 'Medial thigh — adductors, gracilis and pectineus' },
    { id: 'posterior', label: 'Posterior thigh — hamstring compartment' },
  ] },
  { id: 'leg', label: 'Leg', children: [
    { id: 'anterior', label: 'Anterior leg — dorsiflexor compartment' },
    { id: 'lateral', label: 'Lateral leg — fibular compartment' },
    { id: 'posterior', label: 'Posterior leg', children: [
      { id: 'superficial', label: 'Superficial posterior leg — calf muscles' },
      { id: 'deep', label: 'Deep posterior leg' },
    ] },
  ] },
  { id: 'foot', label: 'Intrinsic foot muscles', children: [
    { id: 'dorsal', label: 'Dorsal foot — short extensors' },
    { id: 'plantar', label: 'Plantar foot', children: [
      { id: 'layer-1', label: 'Layer 1 — abductors and flexor digitorum brevis' },
      { id: 'layer-2', label: 'Layer 2 — quadratus plantae and lumbricals' },
      { id: 'layer-3', label: 'Layer 3 — short flexors and adductor hallucis' },
      { id: 'layer-4', label: 'Layer 4 — plantar and dorsal interossei' },
    ] },
  ] },
  { id: 'associated-tissues', label: 'Associated tendons, sheaths and septa (source)' },
];

export function lowerLimbMuscleGroups(prefix: readonly string[]): readonly NervousGroup[] {
  const build = (group: NervousGroup, parent: readonly string[]): NervousGroup => {
    const path = [...parent, group.id];
    return { id: path.join('/'), label: group.label,
      ...(group.children ? { children: group.children.map(child => build(child, path)) } : {}) };
  };
  return groups.map(group => build(group, prefix));
}

/** Group whole source meshes, including numbered EDL exports. Fibularis
 * tertius belongs anteriorly; dorsal interossei are in plantar layer four.
 * Misfiled connective tissues remain accessible without becoming muscles. */
export function lowerLimbMuscleSubdivision(rawName: string): readonly string[] | null {
  const n = rawName.toLowerCase().trim()
    .replace(/(?:\.\d{3})*(?:_\d+)?$/, '')
    .replace(/\.[oe]\d*[lr]$|\.[lr]$/, '')
    .replace(/_/g, ' ').replace(/[()]/g, '')
    .replace(/\bmuscles?\b/g, '').replace(/\s+/g, ' ').trim();
  if (/tendon|sheath|septum|ligament|fascia/.test(n) && !/^tensor fasciae latae$/.test(n))
    return ['associated-tissues'];
  if (/^(?:iliacus|psoas major|psoas minor|iliopsoas)$/.test(n)) return ['hip', 'flexors'];
  if (/^gluteus (?:maximus|medius|minimus)$|^tensor fasciae latae$/.test(n)) return ['hip', 'gluteal'];
  if (/^(?:rectus femoris|vastus medialis|vastus lateralis|vastus intermedius|sartorius)$/.test(n))
    return ['thigh', 'anterior'];
  if (/^(?:adductor (?:longus|brevis|magnus|minimus)|gracilis|pectineus)$/.test(n))
    return ['thigh', 'medial'];
  if (/^(?:(?:long|short) head of biceps femoris|biceps femoris|semitendinosus|semimembranosus)$/.test(n))
    return ['thigh', 'posterior'];
  if (/^(?:tibialis anterior|extensor digitorum longus|extensor hallucis longus|fibularis tertius)$/.test(n))
    return ['leg', 'anterior'];
  if (/^fibularis (?:longus|brevis)$/.test(n)) return ['leg', 'lateral'];
  if (/^(?:(?:medial|lateral) head of gastrocnemius|gastrocnemius|soleus|plantaris)$/.test(n))
    return ['leg', 'posterior', 'superficial'];
  if (/^(?:popliteus|tibialis posterior|flexor digitorum longus|flexor hallucis longus)$/.test(n))
    return ['leg', 'posterior', 'deep'];
  if (/^extensor (?:digitorum|hallucis) brevis$/.test(n)) return ['foot', 'dorsal'];
  if (/^(?:abductor hallucis|abductor digiti minimi of foot|flexor digitorum brevis)$/.test(n))
    return ['foot', 'plantar', 'layer-1'];
  if (/^(?:quadratus plantae|lumbrical(?:s)? of foot)$/.test(n)) return ['foot', 'plantar', 'layer-2'];
  if (/^(?:(?:medial|lateral) head of flexor hallucis brevis|flexor hallucis brevis|(?:oblique|transverse) head of adductor hallucis|adductor hallucis|flexor digiti minimi(?: brevis)? of foot|opponens digiti minimi of foot)$/.test(n))
    return ['foot', 'plantar', 'layer-3'];
  if (/^(?:plantar interossei|dorsal interossei of foot)$/.test(n)) return ['foot', 'plantar', 'layer-4'];
  return null;
}
