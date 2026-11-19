import sourceCsv from '@assets/Brainstem_and_cerebellum_1792566495954.csv?raw';
import { parseCsv } from './nervousSourceRows';

// Dedicated model inventory, independent of atlas classifiers. Do not replace
// the source data or model used by the separate Brain or full-anatomy atlases.
export const BRAINSTEM_CEREBELLUM_SOURCE_ROWS = parseCsv(sourceCsv);
export const BRAINSTEM_CEREBELLUM_SOURCE_OBJECTS = BRAINSTEM_CEREBELLUM_SOURCE_ROWS.filter(
  row => row.row_type === 'OBJECT' && row.object_type === 'MESH',
);
