# Boundragon explorer and publishing

The [interactive explorer](index.html) follows native binary32 Fast and
binary64 Balanced conversion in English and Japanese. It explains centered
error bounds, evaluated guards, shortcuts and the complete integer finish.
The separate grid overview illustrates the shared coarse/fine candidate
geometry, with attribution to prior work.

Each step introduces its quantities, shows an equation with actual integer
values, and explains the next decision. Unreached checks have reasons rather
than invented outcomes. A compact strip inside **Evaluated decision** shows
measured acceptance or fallback rates for a selectable reference distribution.
Counts and denominators appear in hover text; [sampling and reproduction](branch_rates.md)
describe the maintained measurements. The current input and selected step stay
unchanged when the reference distribution changes.

## Build and preview

From the repository root, with Node.js and Python 3:

```sh
npm ci
npm run build:site
npm run check:docs
python3 -m http.server 8765 --directory dist/site --bind 127.0.0.1
```

Open `http://127.0.0.1:8765/`. The build exports maintained C++ caches,
compiles authored Markdown/LaTeX to browser content and MathML, and renders
the algorithm, proof and benchmark documents as HTML. It checks local links,
anchors and module imports in the final artifact. Relative URLs work under
GitHub Pages project paths.

`npm run build:docs` generates only the browser assets needed by the numeric
and bilingual-content tests. Both generated assets and `dist/` are ignored.
Commit source Markdown, JavaScript, C++ tables and generators.

## GitHub Pages

The [publishing workflow](../.github/workflows/pages.yml) builds from a clean
checkout, checks bilingual content and runs CTest. Pull requests validate
without deploying; pushes to `main` and manual runs publish `dist/site` through
[GitHub's Pages artifact/deployment actions](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

In **Settings → Pages → Build and deployment**, select **GitHub Actions** as
the source. No generated-site branch or checked-in browser exports are needed.
Source-code links use the workflow's repository and commit; local previews
show those references as text when no repository is configured.

Published files include the explorer, rendered documentation, reports and
license notices. Raw CSVs, measurement manifests, source snapshots and
per-input research data are excluded from the site. The browser uses
JavaScript modules, BigInt and MathML, with no runtime libraries, external
fonts, analytics or conversion service.

## Conversion paths and validation

Binary32 follows `binary32_to_decimal`: zero/power lookup, selected integer
dispatch, a Q40 product, coarse acceptance, boundary exclusion, fine-digit
stability and tie checks, followed by the complete exact finish when needed.
Decimal text is rounded directly to binary32 using exact rational arithmetic.

Binary64 follows the Balanced centered filter: special/subnormal dispatch,
integers below 2^53, the specialized power procedure, a high-word product with
an 11-bit centered residual and two ambiguity tests. Both normal ambiguity
tests run, matching the native bitwise OR. Subnormals and uncertain cases use
`canonical_slow`.

Both formats independently construct exact rational rounding intervals from
adjacent encodings. Negative inputs draw magnitudes; binary parity determines
midpoint inclusion. Only plot coordinates use floating approximations.
BigInt exposes C++ arithmetic; browser timing does not model C++ performance.

```sh
cmake -S . -B build/release -DCMAKE_BUILD_TYPE=Release -DBOUNDRAGON_BUILD_EXPLORER_TESTS=ON
cmake --build build/release -j
ctest --test-dir build/release -R explorer --output-on-failure
```

The browser oracle checks compare components and dispatch against C++ across
every exponent, boundary significands, both signs, special values and 100,000
deterministic random encodings per format. Mathematical certificates remain
the library's correctness evidence.

The URL retains `format`, exact `bits` and an explicitly selected `lang`, for
example `?format=binary64&bits=0x3fb999999999999a&lang=ja`. Language changes
preserve the input and selected step. The language choice is remembered locally.

## Maintained sources

- Controller and presentation: `docs/assets/explorer.js`, `formats.js`,
  `i18n.js`, `explorer.css` and the graph models.
- Integer translations and geometry: `converter.js`, `converter64.js`.
- Authored bilingual prose, equations and notation: `docs/content/explorer/`.
- Browser cache exports: `tools/generate_explorer*_tables.py`.
- Content/site builders: `tools/build_docs.mjs`, `build_explorer_content.mjs`,
  `build_site.mjs`; final-artifact checks: `check_site.mjs`.

See [Writing the explorer / 説明の書き方](explorer_authoring.md) for the
authoring format and explanation conventions.
