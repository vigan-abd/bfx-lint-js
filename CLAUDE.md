# CLAUDE.md

## What this is

`@bitfinexcom/lint-js` — an ESLint flat config plus a CLI, shipping its own
vendored copy of ESLint. A consumer installs **one** package: no `eslint`
dependency, no `eslint.config.js` required, nothing resolved from the registry
at install time.

Three pieces:

- `index.js` — `setup(opts)` returns a flat-config array. Pure data; requires
  nothing from ESLint.
- `bin/lint.js` — the `bfx-lint-js` CLI. Drives ESLint's Node API and injects
  `setup()` programmatically when the project has no config file.
- `vendor/` — ESLint 8.57.1 and its 99 dependencies, committed to the repo and
  published in the tarball.

## Commands

```bash
npm run lint          # lints this repo with its own config + vendored eslint
npm run lint:fix
npm run gen:notices   # regenerate THIRD-PARTY-NOTICES.md from vendor/
```

There is no test suite. Verification is done by running the CLI against
fixtures and by `npm pack --dry-run`.

## The constraint chain — read before changing anything

Everything below follows from one decision: **the linter must run on Node 16.**

1. Node 16 ⟹ **ESLint 8.57.1**. It is the last line whose `engines` allows
   Node 16 (`>=16.0.0`). ESLint 9 needs ≥18.18, ESLint 10 needs ≥20.19. Do not
   "upgrade" the vendored ESLint without first dropping the Node 16 floor —
   it will not start.
2. ESLint 8 ⟹ flat config only via `FlatESLint` from
   `vendor/node_modules/eslint/lib/unsupported-api`. The stable `ESLint` class
   in v8 is eslintrc-only. Required by relative path, which deliberately
   bypasses the package `exports` map.
3. Node 16 ⟹ **no `util.parseArgs`** (Node 18.3+). `bin/lint.js` has a
   hand-rolled parser. Same rule for any other modern API: check it exists in
   Node 16 before using it.
4. ESLint 8 ships **no TypeScript types** (those arrived in v9), and consumers
   do not install `eslint`. So `index.d.ts` is **self-contained** and must
   never `import` from `'eslint'` — that would fail to resolve for every
   consumer. The flat-config shapes are declared structurally instead.

ESLint 8.57.1 is EOL and gets no upstream security patches. That is a known,
accepted trade for the Node 16 floor; it is documented in the README.

## Layout

```
index.js / index.d.ts     setup(); types are self-contained
lib/{rules,globals,ignores}.js + .d.ts
bin/lint.js               CLI (bfx-lint-js)
scripts/gen-notices.js    regenerates THIRD-PARTY-NOTICES.md; not published
vendor/node_modules/      ESLint 8.57.1, committed
```

`.d.ts` files are **co-located** with the `.js` they describe. Do not move them
to a `types/` directory: TypeScript resolves subpath types by looking next to
the `.js`, so moving them breaks `@bitfinexcom/lint-js/lib/ignores` unless a
`typesVersions` mapping is added. The failure is silent — consumers just get
`any`.

`package.json` `files` is a whitelist. Anything new that must ship (the notices
file did) has to be added there explicitly.

## Vendoring workflow

```bash
npm install --prefix vendor eslint@<exact-version> --omit=dev
npm run gen:notices
```

- Pin **exactly** in `vendor/package.json` — no caret. A range lets a re-install
  silently drift from the tree that was reviewed.
- Changing versions leaves orphans behind, and `npm prune` does not clear them.
  Delete `vendor/node_modules` and `vendor/package-lock.json` and reinstall.
- Commit `vendor/package.json` and `vendor/package-lock.json` too.
- Re-run `gen:notices` after any change. It exits non-zero if a package has no
  license text, so it works as a CI check.
- Four packages ship no license file (`esrecurse`, `imurmurhash`, `keyv`,
  `natural-compare`); the generator synthesizes canonical text from their
  copyright headers and marks those blocks as synthesized.

`.gitignore` is `/node_modules` — root-anchored **on purpose**. A bare
`node_modules` pattern matches at any depth and would silently exclude
`vendor/node_modules`.

## Gotchas found the hard way

- **`defaultIgnores` is an array.** Spread it as `[...defaultIgnores]`. Object
  spread yields `{0:'dist/',...}` and ESLint dies with `Key "ignores":
  Expected value to be an array`.
- **Escape globs in JSDoc/TSDoc as `**\/*.js`.** An unescaped `*/` terminates
  the comment block and the rest becomes syntax errors.
- **`esm` governs `.js` only.** `.cjs` and `.mjs` are pinned to their extension
  by two override blocks appended after the main one. `esm` must never reach
  those blocks.
- **ESM subpath imports need the extension**:
  `@bitfinexcom/lint-js/lib/ignores.js`. ESM does not infer it. The default
  import of the package root works fine.
- **`vendor/` is in `defaultIgnores`**, so this package does not lint its own
  vendored tree.
- npm packs a *nested* `vendor/node_modules` normally; the "npm strips
  node_modules" rule only applies at the package root.

## Code style

The config lints itself, so formatting is enforced: 2-space indent, single
quotes, no semicolons, no trailing commas, space before function parens. Run
`npm run lint` before finishing.

The rules below are **not** enforced by the linter — no rule catches them — so
they have to be applied by hand:

- **`'use strict'` at the top of every file**, directly under the shebang in
  executables.
- **Arrow functions, never the `function` keyword.** `const parse = (argv) => {}`,
  not `function parse (argv) {}`. There are currently no `function` declarations
  anywhere in the repo; keep it that way.
- **Named exports, not a single default.** Modules export an object:
  `module.exports = { defaultIgnores }`, so callers destructure. The one
  deliberate exception is `index.js`, which exports the `setup` function itself
  — that is the package's public entry point, and the `export =` form in
  `index.d.ts`, the README examples and every consumer depend on it. Do not
  "fix" it into a named export.
- **Minimal comments.** Comment only what the code cannot say: a non-obvious
  constraint or the reason behind a workaround. The existing comments are all of
  that kind (why `unsupported-api` is required, why the arg parser is
  hand-rolled, why `esm` must not reach the extension overrides). Do not add
  comments that restate the code.

## Verification

Verify changes on **both** Node 16 and a modern Node — `nvm use 16` and
`nvm use 24` are both installed. The Node 16 path is the one that breaks.

For anything user-facing, test the real thing: `npm pack`, install the tarball
into a scratch project, and run `npx bfx-lint-js`. Several bugs in this repo
only appeared at that level.
