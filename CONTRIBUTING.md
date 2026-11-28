# Contributing to Anatomia Aperta 3D

Thank you for helping improve Anatomia Aperta 3D. Contributions of two kinds are welcome:
**anatomical corrections** to the models and their organization, and **code changes** to the web viewer.

By contributing, you agree that code contributions are licensed under the [MIT License](LICENSE-CODE) and
anatomical/model contributions under [CC BY-SA 4.0](LICENSE.md). Please follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Reporting an anatomical error

Open an issue using the **Anatomical correction** template. Please include:

- the structure(s) concerned and where they appear in the atlas (system, region or collection, and the page URL);
- what is wrong and what the correct anatomy is;
- **references** (textbook, atlas or peer-reviewed literature) supporting the correction;
- a screenshot if it helps.

## Reporting a bug or suggesting a feature

Open an issue using the **Bug report** template, with your browser and OS, steps to reproduce,
and what you expected to happen. For security problems, see [SECURITY.md](SECURITY.md) instead.

## Working on the code

Prerequisites: Node.js 24+ and pnpm 12+.

```sh
pnpm install
pnpm --filter @anatomia-aperta/viewer dev   # http://127.0.0.1:5173
```

The viewer lives in `artifacts/sketchfab-configurator`:

- `src/data/` holds the anatomical taxonomies and collections, mostly derived from the scene exports in `attached_assets/`;
- `src/components/` and `src/pages/` hold the UI, and `src/hooks/useSketchfabViewer.ts` the Sketchfab Viewer API integration;
- tests sit next to the code as `*.test.ts(x)` files using `node:test`.

Before opening a pull request, run:

```sh
pnpm typecheck
pnpm test
pnpm build && pnpm --filter @anatomia-aperta/viewer test:seo
```

Pull request guidelines:

- keep each pull request focused on one change, and describe what it changes and why;
- add or update tests for changes to anatomical collections, menus or viewer behavior;
- for anatomical changes, cite your references in the description;
- don't commit build output (`dist/`), `node_modules/` or editor settings.
