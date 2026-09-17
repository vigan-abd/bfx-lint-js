# bfx-lint-js

ESLint rules applied on the Bitfinex codebase, with ESLint itself bundled in.

Installing this package installs **one** package. It resolves nothing from the
registry at install time: a reviewed, pinned copy of ESLint lives in `vendor/`
and ships inside the tarball. The rule set is built entirely from rules in
ESLint core — no plugins, no shared configs — so there is no plugin graph to
audit either.

The house style, in short: 2-space indent, single quotes, no semicolons, no
trailing commas, a space before function parens, `===` everywhere except against
`null`, and `const` over `let` over `var`.

## Install

```bash
npm i -D @bitfinexcom/lint-js
```

No `eslint` install, and no `eslint.config.js` to write.

## Usage

```bash
npx bfx-lint-js .
npx bfx-lint-js . --fix
```

Or as scripts:

```json
"scripts": {
  "lint": "bfx-lint-js .",
  "lint:fix": "bfx-lint-js . --fix"
}
```

With no paths given, `bfx-lint-js` lints `.`.

### CLI options

| Option | Description |
| --- | --- |
| `--fix` | Write fixes to disk. |
| `--esm` | Treat `.js` as ES modules. Implied when your `package.json` has `"type": "module"`. |
| `--mocha` | Add Mocha globals to `test/**/*.js`, `**/*.test.js` and `**/*.spec.js`. |
| `--format <name>` | Output format (default: `stylish`). Any ESLint formatter, e.g. `json`, `compact`. |
| `--max-warnings <n>` | Exit non-zero past this many warnings (default: `-1`, off). |
| `--no-config` | Ignore any `eslint.config.js` and use the built-in config. |
| `-v`, `--version` | Print the `bfx-lint-js` and vendored ESLint versions. |
| `-h`, `--help` | Print usage. |

Exit codes: `0` clean, `1` lint errors (or warnings past `--max-warnings`), `2`
bad usage or a crash.

**If your project has an `eslint.config.js`, it wins** — `bfx-lint-js` runs it
instead of the built-in config. Pass `--no-config` to force the built-in one.

## Usage as a config

To customise the rules, write an `eslint.config.js` and `bfx-lint-js` will pick it
up:

```js
'use strict'

const setup = require('@bitfinexcom/lint-js')

module.exports = setup()
```

`setup()` returns a flat-config array. Append your own config objects to it when
you need to layer on something the options below don't cover:

```js
module.exports = [
  ...setup({ mocha: true }),
  { files: ['scripts/**/*.js'], rules: { 'no-console': 'off' } }
]
```

## Options

```js
setup({
  files: ['**/*.js', '**/*.cjs', '**/*.mjs'],
  ignores: ['dist/', 'build/', 'coverage/', 'vendor/', 'tmp/', '**/*.min.js', '**/bundle.js'],
  globals: {},
  mocha: false,
  esm: false,
  rules: {}
})
```

| Option | Default | Description |
| --- | --- | --- |
| `files` | `['**/*.js', '**/*.cjs', '**/*.mjs']` | Glob patterns to lint. |
| `ignores` | see above | Paths to skip. **Replaces** the defaults rather than extending them, so re-list any you still want. `node_modules` is always ignored by ESLint itself. |
| `globals` | `{}` | Extra globals, merged over the built-in Node set. Use the ESLint form: `{ myGlobal: 'readonly' }`. |
| `mocha` | `false` | `true` applies Mocha globals to `test/**/*.js`, `**/*.test.js` and `**/*.spec.js`. Pass an array of globs to target different paths. |
| `esm` | `false` | Sets the module system for `.js` files — see below. |
| `rules` | `{}` | Rule overrides, merged over the defaults. |

### Module system

`esm` only governs `.js`, the one extension where the module system is ambiguous.
`.cjs` and `.mjs` are always parsed according to their extension, regardless of the flag:

| Extension | `esm: false` (default) | `esm: true` |
| --- | --- | --- |
| `.js` | CommonJS | ES module |
| `.cjs` | CommonJS | CommonJS |
| `.mjs` | ES module | ES module |

Under `esm: true`, a `.js` file using `require`/`module.exports` reports `no-undef` —
that is intended, since you have declared `.js` to be ESM. Put CommonJS code in `.cjs`.

### Examples

```js
// ESM project with Mocha tests
module.exports = setup({ esm: true, mocha: true })

// Browser-ish globals and a couple of relaxed rules
module.exports = setup({
  globals: { window: 'readonly', document: 'readonly' },
  rules: { 'no-console': 'off', camelcase: 'off' }
})

// Keep the default ignores and add one
const { defaultIgnores } = require('@bitfinexcom/lint-js/lib/ignores')
module.exports = setup({ ignores: [...defaultIgnores, 'generated/'] })
```

## Requirements

**Node 16 or newer.** Tested on 16.20.2 and 24.20.0.

## What ships inside

`vendor/` holds ESLint **8.57.1** and its 99 dependencies, committed to the repo
and published in the tarball. Consequences worth knowing:

- **Nothing is resolved at install time.** The tree you review is the tree that
  runs. None of the 99 packages declares an `install`, `preinstall` or
  `postinstall` script, so nothing executes when you install.
- **The ESLint version is frozen** and only changes when this package is
  upgraded and re-reviewed. That also pins the rule set: the formatting rules
  (`indent`, `quotes`, `semi`, …) that later ESLint releases moved out to
  [ESLint Stylistic](https://eslint.org/blog/2023/10/deprecating-formatting-rules/)
  are still present here and will not disappear underneath you.
- **8.57.1 is end-of-life** and receives no upstream security patches. It is the
  last ESLint line that supports Node 16 — newer releases require Node 20.19+.
  If the Node 16 floor is ever dropped, the vendored copy should move to a
  maintained release.
- Third-party licenses are reproduced in [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).

## License

MIT
