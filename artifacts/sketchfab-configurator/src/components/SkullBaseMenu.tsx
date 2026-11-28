import { FocusedNerveMenu, type FocusedMenuConfig, type FocusedNerveMenuProps } from './FocusedNerveMenu';
import { SKULL_BASE_GROUPS, SKULL_BASE_ROOT_PATH, skullBasePathForGroup } from '../data/skullBaseTaxonomy';
import { CEREBELLAR_SUPPLY_REFERENCE } from '../data/skullBaseCerebellum';
import { trigeminalEarRole } from '../data/trigeminalEar';

const config: FocusedMenuConfig = {
  groups: SKULL_BASE_GROUPS,
  rootPath: SKULL_BASE_ROOT_PATH,
  // Tensor tympani stays in the opening scene, not as a standalone menu item.
  pathForGroup: (node, path) => path[2] === 'posterior-fossa' && trigeminalEarRole(node.rawName) === 'muscle'
    ? null : skullBasePathForGroup(node, path),
  testPrefix: 'skull-base',
  stripLabel: 'Skull base categories',
  defaultSystemLabel: 'Skull base',
  heading: 'SKULL BASE',
  browseLabel: 'Browse skull base anatomy',
  searchAllPlaceholder: 'Search bones, nerves, vessels and inner ear…',
  searchAllScope: 'skull base',
  description: (_fullscreen, activeId) => activeId?.includes('/sella-cavernous-sinus')
    ? 'Sellar / cavernous relationships: pituitary, hypothalamus, optic pathway and venous sinuses. Brainstem and available cerebellar peduncles are semitransparent. V1 includes all modeled branches; V2 is limited to its trunk and main zygomatic, infraorbital and ganglionic branches; V3 is trunk-only. Nuclei are central nerve connections, not inside the sinus. Whole sphenoid provides sellar context; missing segments or nerves are not synthesized.'
    : activeId?.includes('/petrosal-autonomic')
    ? ''
    : activeId?.endsWith('/petrous-temporal')
    ? 'Temporal bone and main trigeminal trunks only. Ear and jugular structures use existing meshes; a separate jugular bulb is not identified in the supplied export. No geometry is synthesized.'
    : activeId?.includes('/vascular')
    ? 'Isolate a vascular group to retain its semitransparent landmarks: eye, temporal bone, cervical vertebrae and clival bones, brainstem/cerebellum, or sphenoid. Whole bone meshes are used where petrous or clival regions are not separate. Middle meningeal isolation also includes its maxillary and external-carotid origin. Vessels retain their original appearance.'
    : activeId?.includes('/posterior-fossa')
    ? 'The whole-cerebellum control groups existing lobules for Show/Hide; it does not create a new mesh. Cerebellar surfaces and gross brainstem remain semitransparent. Select individual parts with their typical SCA, AICA or PICA blood supply; territories overlap and vary, especially in deep nuclei. Only available meshes are used, not simulated perfusion territories.'
    : 'Foraminal and petrous regions use the existing bone meshes. Separate landmarks and surgical approach simulations are not added.',
};

export function SkullBaseMenu(props: FocusedNerveMenuProps) {
  const enabled = props.boneTransparency ?? true;
  return <FocusedNerveMenu {...props} onSetRegionVisibility={(ids, visible, requested) => {
    const path = requested ?? props.isolatedRegionPath ?? props.activeNerveId?.split('/') ?? [];
    const openingMuscles = path.length === 3 && path[2] === 'posterior-fossa'
      ? props.nodes.filter(node => trigeminalEarRole(node.rawName) === 'muscle').map(node => node.instanceID) : [];
    props.onSetRegionVisibility([...new Set([...ids, ...openingMuscles])], visible, requested);
  }} config={{
    ...config,
    toolbar: <div className="space-y-2"><button
      type="button"
      role="switch"
      aria-label="Bone transparency"
      aria-checked={enabled}
      disabled={props.disabled || !props.onBoneTransparencyChange}
      onClick={() => props.onBoneTransparencyChange?.(!enabled)}
      data-testid="toggle-skull-base-bone-transparency"
      className="inline-flex min-h-10 items-center gap-3 rounded-md border border-current/20 px-3 py-2 text-xs hover:bg-white/5 disabled:opacity-40 focus-visible:outline focus-visible:outline-primary"
    >
      <span>Bone transparency</span>
      <span aria-hidden="true" className={`rounded px-2 py-0.5 text-[10px] ${enabled ? 'bg-primary/20 text-primary' : 'bg-white/10'}`}>
        {enabled ? 'On' : 'Off'}
      </span>
    </button>
      {props.activeNerveId?.includes('/posterior-fossa') && <a
        href={CEREBELLAR_SUPPLY_REFERENCE} target="_blank" rel="noopener noreferrer"
        className="block text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
      >Cerebellar arterial anatomy reference</a>}
    </div>,
  }} />;
}
