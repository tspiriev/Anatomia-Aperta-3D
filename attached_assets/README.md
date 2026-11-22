# attached_assets

Scene exports (CSV) of the Anatomia Aperta 3D models, one file per anatomical system or region. Each file lists the
objects and collections of a Blender/Sketchfab scene. The web viewer imports them (through the `@assets` alias) to
build its system, region and pathway menus and collections, and the tests use them to check that the menus match the
models.

- **Provenance:** the models are derived from BodyParts3D/Anatomography and Z-Anatomy and were corrected,
  reorganized and extended for Anatomia Aperta 3D. See [`../ATTRIBUTION.md`](../ATTRIBUTION.md) and
  [`../MODIFICATIONS.md`](../MODIFICATIONS.md).
- **License:** CC BY-SA 4.0, see [`../LICENSE.md`](../LICENSE.md).
- **File names:** the numeric suffix is the export timestamp. Several systems have more than one export because code
  and tests refer to specific versions. Don't rename or delete a file without updating every reference
  (`git grep <file name>`).
