// Canonical identities after Head/neck name normalization. Exact names admit
// revised live meshes without inventing branches or importing V1/III/VII merely
// because the older export files them under the trigeminal collection.
const branches = new Set([
  // V2 trunk, direct branches and principal pterygopalatine/terminal routes.
  'maxillary nerve', 'maxillary nerve (v2)', 'trigeminal nerve maxillary n (v)',
  'meningeal branch of maxillary nerve', 'ganglionic branch of maxillary nerve',
  'ganglionic branches of maxillary nerve', 'zygomatic nerve',
  'zygomaticofacial nerve', 'zygomaticotemporal nerve',
  'communicating branch of zygomatic nerve to lacrimal nerve',
  'infraorbital nerve', 'infra-orbital nerve',
  'posterior superior alveolar nerve', 'middle superior alveolar nerve', 'anterior superior alveolar nerve',
  'superior alveolar nerves', 'greater palatine nerve', 'lesser palatine nerve',
  'nasopalatine nerve', 'lateral posterior inferior nasal nerve', 'lateral posterior superior nasal nerve',
  'posterior superior lateral nasal nerve', 'posterior inferior lateral nasal nerve',
  'pharyngeal nerve', 'pharyngeal branch of maxillary nerve',
  'orbital branches of pterygopalatine ganglion',
  // V3 trunk/divisions, sensory branches and motor branches.
  'mandibular nerve', 'mandibular nerve (v3)', 'trigeminal nerve mandibular n (v)',
  'anterior division of mandibular nerve', 'posterior division of mandibular nerve',
  'meningeal branch of mandibular nerve', 'nervus spinosus',
  'auriculotemporal nerve', 'lingual nerve', 'buccal nerve', 'long buccal nerve',
  'inferior alveolar nerve', 'trunk of inferior alveolar nerve', 'mental nerve', 'incisive nerve',
  'masseteric nerve', 'deep temporal nerve', 'anterior deep temporal nerve',
  'posterior deep temporal nerve', 'middle deep temporal nerve',
  'medial pterygoid nerve', 'lateral pterygoid nerve', 'nerve to medial pterygoid',
  'nerve to lateral pterygoid', 'mylohyoid nerve', 'nerve to mylohyoid', 'nerve to mylohyoid muscle',
  'tensor tympani nerve', 'nerve to tensor tympani', 'nerve to tensor tympani muscle',
  'nerve to the tensor tympani muscle', 'tensor veli palatini nerve', 'nerve to tensor veli palatini',
  'nerve to tensor veli palatini muscle',
]);

export const isOralTrigeminalBranch = (canonicalName: string) => branches.has(canonicalName);
