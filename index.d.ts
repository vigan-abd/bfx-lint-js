// Self-contained on purpose: consumers do not install `eslint` (a pinned copy is
// vendored inside this package), and eslint 8 ships no types of its own, so
// nothing here may import from 'eslint'.

declare function setup (opts?: setup.SetupOptions): setup.FlatConfig[]

declare namespace setup {
  type Severity = 0 | 1 | 2 | 'off' | 'warn' | 'error'

  type RuleEntry = Severity | [Severity, ...unknown[]]

  interface RulesRecord {
    [rule: string]: RuleEntry
  }

  type GlobalAccess = 'readonly' | 'writable' | 'off' | boolean

  interface Globals {
    [name: string]: GlobalAccess
  }

  interface LanguageOptions {
    ecmaVersion?: number | 'latest'
    sourceType?: 'script' | 'module' | 'commonjs'
    globals?: Globals
    parser?: unknown
    parserOptions?: Record<string, unknown>
  }

  interface LinterOptions {
    noInlineConfig?: boolean
    reportUnusedDisableDirectives?: boolean | Severity
  }

  /** A single ESLint flat-config object. */
  interface FlatConfig {
    name?: string
    files?: Array<string | string[]>
    ignores?: string[]
    languageOptions?: LanguageOptions
    linterOptions?: LinterOptions
    plugins?: Record<string, unknown>
    processor?: unknown
    rules?: RulesRecord
    settings?: Record<string, unknown>
  }

  interface SetupOptions {
    /**
     * Glob patterns to lint.
     *
     * @default ['**\/*.js', '**\/*.cjs', '**\/*.mjs']
     */
    files?: string[]

    /**
     * Paths to skip. Replaces the defaults rather than extending them, so re-list
     * any that should be kept. `node_modules` is always ignored by ESLint itself.
     *
     * @default ['dist/', 'build/', 'coverage/', 'vendor/', 'tmp/', '**\/*.min.js', '**\/bundle.js']
     */
    ignores?: string[]

    /**
     * Extra globals, merged over the built-in Node set.
     *
     * @default {}
     */
    globals?: Globals

    /**
     * `true` applies Mocha globals to `test/**\/*.js`, `**\/*.test.js` and
     * `**\/*.spec.js`; an array of globs targets custom paths.
     *
     * @default false
     */
    mocha?: boolean | string[]

    /**
     * Parse `.js` as ES modules. `.cjs` and `.mjs` always follow their extension
     * regardless of this flag.
     *
     * @default false
     */
    esm?: boolean

    /**
     * Rule overrides, merged over the defaults.
     *
     * @default {}
     */
    rules?: RulesRecord
  }
}

export = setup
