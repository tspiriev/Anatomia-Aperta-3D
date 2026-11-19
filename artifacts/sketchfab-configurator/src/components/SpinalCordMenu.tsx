import { useMemo } from 'react';
import { useLocation } from 'wouter';
import { FocusedNerveMenu, type FocusedMenuConfig, type FocusedNerveMenuProps } from './FocusedNerveMenu';
import { LONG_TRACT_ROOT_PATH, longTractSourceNote } from '../data/longTractTaxonomy';
import {
  SPINAL_ATLAS_HREF, SPINAL_REFERENCE_MODELS, SPINAL_NERVE_PATH, SPINAL_NERVE_GROUP, spinalCordMenuGroups, spinalCordPathForGroup,
  spinalReferenceHref, spinalReferencePath,
} from '../data/spinalCordAtlas';
import type { Annotation } from '../types/sketchfab';

export function SpinalCordMenu(props: FocusedNerveMenuProps & {
  spinalReferenceModelUid?: string;
  sourceAnnotations?: Annotation[];
  onSourceAnnotation?: (index: number) => void;
}) {
  const [, navigate] = useLocation();
  const uid = props.spinalReferenceModelUid;
  const groups = useMemo(() => spinalCordMenuGroups(uid ? [] : props.nodes), [props.nodes, uid]);
  const activePath = props.isolatedRegionPath ?? props.activeNerveId?.split('/') ?? [];
  const reference = (path: readonly string[]) => SPINAL_REFERENCE_MODELS.find(model =>
    spinalReferencePath(model.uid).join('/') === path.join('/'));
  const activate = (path: readonly string[]) => {
    const model = reference(path);
    if (model && model.uid !== uid) navigate(spinalReferenceHref(model.uid));
    else if (!model && uid) navigate(`${SPINAL_ATLAS_HREF}?collection=${encodeURIComponent(path.join('/'))}`);
    else props.onActivateNerve(path);
  };
  const config = useMemo<FocusedMenuConfig>(() => ({
    groups, rootPath: LONG_TRACT_ROOT_PATH,
    pathForGroup: uid ? (_node, path) =>
      path.length === LONG_TRACT_ROOT_PATH.length || path.join('/') === spinalReferencePath(uid).join('/')
        ? spinalReferencePath(uid) : null : spinalCordPathForGroup,
    testPrefix: 'spinal-cord', preserveMaterials: true,
    initialExpanded: SPINAL_NERVE_GROUP.children?.filter(group => group.children?.length).map(group => group.id),
    stripLabel: 'Spinal cord models and anatomy collections',
    stripRows: 2,
    defaultSystemLabel: 'Spinal cord anatomy', heading: 'SPINAL CORD ANATOMY',
    browseLabel: 'Browse spinal cord collections',
    searchAllPlaceholder: 'Search spinal cord anatomy…', searchAllScope: 'spinal cord anatomy',
    navigationGroup: id => Boolean(uid) || id.split('/')[2]?.startsWith('model-') === true,
    description: () => uid ? '' : activePath[2] === SPINAL_NERVE_PATH[2]
      ? 'Spinal cord white matter is retained as semi-transparent context around the roots and gray matter. Its visibility can be controlled in the White matter collection.'
      : longTractSourceNote(activePath),
    toolbar: uid && props.sourceAnnotations?.length ? <div className="space-y-1 border-b border-border p-3">
      <p className="text-xs font-medium">Original numbered annotations</p>
      {props.sourceAnnotations.map((annotation, index) => <button type="button" key={annotation.index ?? index}
        className="block w-full rounded px-2 py-1 text-left text-xs hover:bg-accent"
        data-testid={`button-source-annotation-${(annotation.index ?? index) + 1}`}
        onClick={() => props.onSourceAnnotation?.(annotation.index ?? index)}>
        {(annotation.index ?? index) + 1}. {annotation.name}
      </button>)}
    </div> : undefined,
  }), [groups, uid, activePath.join('/'), props.sourceAnnotations, props.onSourceAnnotation]);
  return <FocusedNerveMenu {...props} config={config} onActivateNerve={activate} />;
}
