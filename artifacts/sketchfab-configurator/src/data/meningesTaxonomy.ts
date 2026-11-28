import { buildAdvancedCollection, collection, structures } from './advancedCollection';

// Explicit cranial source meshes only; never include spinal dura or dural nerves.
const meninges = buildAdvancedCollection(collection('meninges', 'Dura and meninges',
  structures('dura', 'Dura mater', 'Dura mater brain'),
  structures('tentorium', 'Tentorium cerebelli', 'Tentorium cerebelli'),
  structures('falx', 'Falx cerebri', 'Falx cerebri'),
));

export const MENINGES_GROUP = meninges.group;
export const classifyMeningesObject = meninges.classify;
