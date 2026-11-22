<img width="1536" height="876" alt="Anatomia Aperta 3D logo new" src="https://github.com/user-attachments/assets/39aec011-1866-49f7-b94b-9c0f94a05ee9" />

# Anatomia-Aperta-3D

Anatomia Aperta 3D — an open-access interactive human anatomy atlas based on BodyParts3D/Anatomography and Z-Anatomy,
reorganized and expanded, with major additions to the nervous system
The project builds upon the open anatomical resources BodyParts3D/Anatomography and Z-Anatomy. These datasets were
extensively reviewed, corrected, reorganized, and expanded with the aim of improving anatomical accuracy, completeness,
and educational value.

Anatomia Aperta 3D would not have been possible without the work of the anatomists, researchers, 3D artists, and
developers who created these resources and made them available to the scientific and educational community.
* Links to BodyParts3D/Anatomography: https://lifesciencedb.jp/bp3d/
* Link to Z-Anatomy (official webpage and Github
repository): https://www.z-anatomy.com/, https://sketchfab.com/Z-Anatomy, https://github.com/Z-Anatomy

## Purpose of the Project

The purpose of Anatomia Aperta 3D is not to replace the original datasets, but to build upon, refine, and extend them
while preserving their open-access philosophy.

The source models were corrected or reorganized where necessary, while numerous structures, pathways, nerves, plexuses,
nuclei, and other anatomical components that were absent or insufficiently represented were reconstructed or added.

Particular emphasis has been placed on the nervous system, reflecting the author’s background in neurosurgery and
neuroanatomy.

## Major areas of work include:

* Central nervous system — reconstruction and refinement of white-matter association, commissural and projection
  pathways; thalamic and hypothalamic structures; basal ganglia and basal forebrain; brainstem nuclei and pathways;
  cerebellar circuitry; motor, sensory, visual, auditory, and limbic systems.
* Cranial and peripheral nerves — extensive correction and reconstruction of cranial nerves, orbital innervation, spinal
  nerves, cervical, brachial and lumbar plexuses, intercostal nerves, vagus and phrenic nerves, and other peripheral
  nerve branches.
* Spinal cord and spinal nerves — reconstruction of bilateral dorsal and ventral roots from C1 to S5, dorsal root
  ganglia, dorsal rami, cauda equina, spinal pathways, facet-joint innervation, and sinuvertebral nerves.
* Autonomic nervous system — extensive reconstruction of sympathetic and parasympathetic anatomy, including the
  sympathetic trunks and ganglia, rami communicantes, vagal pathways, cardiac and visceral nerves and plexuses,
  splanchnic nerves, periarterial plexuses, and hypogastric systems.
* Vascular and meningeal anatomy — additions and corrections to cerebral and facial vessels, cerebral venous anatomy,
  dural venous sinuses, meninges, meningeal vessels, and innervation.
* Musculoskeletal and cardiac anatomy — systematic refinement of muscular anatomy and the addition or improvement of
  cardiac structures, including the cardiac conduction system.

The development record currently documents 202 individual modifications and stages of anatomical reconstruction and can
be found in a separate file, [`MODIFICATIONS.md`](MODIFICATIONS.md).

## Licensing and Attribution

Important: Anatomia Aperta 3D is derived in substantial part from BodyParts3D/Anatomography and Z-Anatomy. The original
creators and projects must be appropriately acknowledged.

| Part of the repository | License |
| --- | --- |
| Source code of the web viewer (`artifacts/`), build scripts and configuration | [MIT](LICENSE-CODE) |
| Anatomical models and model data (`attached_assets/`) | [CC BY-SA 4.0](LICENSE.md) |
| Third-party source material (BodyParts3D/Anatomography, Z-Anatomy) | Original licenses, see [`ATTRIBUTION.md`](ATTRIBUTION.md) |

The distributed anatomical models are provided under the same applicable licensing terms as the
BodyParts3D/Anatomography source material.

Detailed licensing, attribution, source provenance, and the distinctions between source-derived and newly created
content are provided in [`LICENSE.md`](LICENSE.md) and [`ATTRIBUTION.md`](ATTRIBUTION.md).

## The Web Viewer

The interactive atlas at [anatomiaaperta.org](https://anatomiaaperta.org) is a React + Vite single-page app in
[`artifacts/sketchfab-configurator`](artifacts/sketchfab-configurator). It embeds the 3D models through the
[Sketchfab Viewer API](https://sketchfab.com/developers/viewer) and adds system, region and pathway menus, isolation,
search and keyboard shortcuts on top of them. Public pages are pre-rendered at build time for search engines.

## Development

Prerequisites: Node.js 24 or newer and [pnpm](https://pnpm.io) 12 or newer (npm and yarn are not supported).

```sh
pnpm install
pnpm --filter @anatomia-aperta/viewer dev     # dev server on http://127.0.0.1:5173
pnpm typecheck                                # type-check all packages
pnpm test                                     # unit tests (node:test)
pnpm build                                    # production build in artifacts/sketchfab-configurator/dist/public
pnpm --filter @anatomia-aperta/viewer test:seo   # check the pre-rendered pages (run after build)
```

Optional environment variables:

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `5173` | Port for the dev and preview servers |
| `BASE_PATH` | `/` | Public base path the app is served from |

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for how to contribute code or report anatomical errors.

## About the Author

Toma Spiriev, MD, PhD, FEBNS is a neurosurgeon with a particular interest in surgical anatomy, 3D anatomical
visualization, photogrammetry, VR. Apart from Anatomia Aperta 3D, please visit our other open-access project,
[3D Atlas of Neurological Surgery](https://3datlasofneurologicalsurgery.org), an interactive 3D atlas based on
photorealistic anatomical models derived from anatomical dissections.
