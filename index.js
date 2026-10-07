'use strict'

const { defaultIgnores } = require('./lib/ignores')
const { defaultRules } = require('./lib/rules')
const { commonjsGlobals, mochaGlobals, nodeGlobals } = require('./lib/globals')

/**
 * Builds the ESLint flat config array for a project.
 *
 * Blocks are emitted in order: global ignores, the main block carrying the rules
 * and Node globals, the per-extension `sourceType` overrides, and finally the
 * optional Mocha block. Spread the result and append your own config objects to
 * layer on anything the options below do not cover.
 *
 * @param {object} [opts] Options.
 * @param {string[]} [opts.files] Glob patterns the rules and globals attach to, not a
 *   way to scope the run. ESLint globs `.js`, `.cjs` and `.mjs` on its own, so files
 *   outside these patterns are still linted, just with no rules.
 * @param {string[]} [opts.ignores] Paths to skip. Replaces the defaults rather than
 *   extending them, so re-list any that should be kept. `node_modules` is always
 *   ignored by ESLint itself.
 * @param {Object<string, 'readonly'|'writable'|'off'>} [opts.globals={}] Extra globals,
 *   merged over the built-in Node set.
 * @param {boolean|string[]} [opts.mocha=false] `true` applies Mocha globals to
 *   `test/**\/*.js`, `**\/*.test.js` and `**\/*.spec.js`; an array targets custom globs.
 * @param {boolean} [opts.esm=false] Parse `.js` as ES modules. `.cjs` and `.mjs` always
 *   follow their extension regardless of this flag.
 * @param {Object<string, *>} [opts.rules={}] Rule overrides, merged over the defaults.
 * @returns {object[]} ESLint flat config array.
 */
const setup = (opts = {}) => {
  const {
    files = ['**/*.js', '**/*.cjs', '**/*.mjs'],
    ignores = [...defaultIgnores],
    globals = {},
    mocha = false,
    esm = false,
    rules: extraRules = {}
  } = opts

  const config = [
    { ignores },
    {
      files,
      languageOptions: {
        ecmaVersion: 'latest',
        sourceType: esm ? 'module' : 'commonjs',
        globals: {
          ...nodeGlobals,
          ...(esm ? {} : commonjsGlobals),
          ...globals
        }
      },
      linterOptions: { reportUnusedDisableDirectives: true },
      rules: { ...defaultRules, ...extraRules }
    },
    {
      files: ['**/*.cjs'],
      languageOptions: { sourceType: 'commonjs', globals: commonjsGlobals }
    },
    {
      files: ['**/*.mjs'],
      languageOptions: {
        sourceType: 'module',
        // The main block's `files` also matches .mjs, so switch these back off.
        globals: { __dirname: 'off', __filename: 'off' }
      }
    }
  ]

  if (mocha) {
    config.push({
      files: mocha === true
        ? ['test/**/*.js', '**/*.test.js', '**/*.spec.js']
        : mocha,
      languageOptions: { globals: mochaGlobals }
    })
  }

  return config
}

module.exports = setup
