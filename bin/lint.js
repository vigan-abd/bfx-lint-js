#!/usr/bin/env node
'use strict'

const fs = require('fs')
const path = require('path')

// ESLint 8 keeps the flat-config runner behind this entry point. It is the only
// way to use flat config on the last release that still supports node 16.
const { FlatESLint } = require('../vendor/node_modules/eslint/lib/unsupported-api')
const setup = require('../index')

const CONFIG_FILES = ['eslint.config.js', 'eslint.config.mjs', 'eslint.config.cjs']

const BOOLEAN_FLAGS = ['fix', 'esm', 'mocha', 'no-config', 'version', 'help']
const VALUE_FLAGS = ['format', 'max-warnings']
const SHORT_FLAGS = { v: 'version', h: 'help' }

const USAGE = `
  bfx-lint-js [patterns...] [options]

  Lints using the Bitfinex config and the copy of ESLint vendored in this
  package. Needs no eslint.config.js; if the project has one, it wins.

  Options:
    --fix               Write fixes to disk
    --esm               Treat .js as ES modules (implied by "type": "module")
    --mocha             Add Mocha globals to test files
    --format <name>     Output format (default: stylish)
    --max-warnings <n>  Exit non-zero past this many warnings (default: -1, off)
    --no-config         Ignore any eslint.config.js and use the built-in config
    -v, --version       Print the bfx-lint-js and vendored ESLint versions
    -h, --help          Print this message

  Exit codes: 0 clean, 1 lint errors, 2 bad usage or crash.
`

// Hand-rolled because util.parseArgs only landed in node 18.3 and this has to
// run on node 16.
const parseArgs = (argv) => {
  const values = { format: 'stylish', 'max-warnings': '-1' }
  const positionals = []

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]

    if (arg === '--') {
      positionals.push.apply(positionals, argv.slice(i + 1))
      break
    }

    if (arg.charAt(0) !== '-' || arg === '-') {
      positionals.push(arg)
      continue
    }

    const isLong = arg.slice(0, 2) === '--'
    const eq = arg.indexOf('=')
    const raw = isLong
      ? arg.slice(2, eq === -1 ? undefined : eq)
      : arg.slice(1)
    const name = isLong ? raw : SHORT_FLAGS[raw]
    const inline = eq === -1 ? null : arg.slice(eq + 1)

    if (!name) throw new Error(`unknown option '${arg}'`)

    if (VALUE_FLAGS.indexOf(name) !== -1) {
      const value = inline === null ? argv[++i] : inline
      if (value === undefined) throw new Error(`option '--${name}' needs a value`)
      values[name] = value
      continue
    }

    if (BOOLEAN_FLAGS.indexOf(name) !== -1) {
      if (inline !== null) throw new Error(`option '--${name}' takes no value`)
      values[name] = true
      continue
    }

    throw new Error(`unknown option '${arg}'`)
  }

  return { values, positionals }
}

const readJson = (file) => {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch (err) {
    return {}
  }
}

const hasConfigFile = (cwd) =>
  CONFIG_FILES.some(name => fs.existsSync(path.join(cwd, name)))

const main = async () => {
  const { values, positionals } = parseArgs(process.argv.slice(2))

  if (values.help) {
    console.log(USAGE)
    return 0
  }

  if (values.version) {
    const own = require('../package.json').version
    const vendored = require('../vendor/node_modules/eslint/package.json').version
    console.log(`bfx-lint-js ${own} (vendored eslint ${vendored})`)
    return 0
  }

  const cwd = process.cwd()
  const patterns = positionals.length ? positionals : ['.']
  const useOwnConfig = values['no-config'] || !hasConfigFile(cwd)

  const options = { cwd, fix: Boolean(values.fix) }

  if (useOwnConfig) {
    // A project declaring "type": "module" wants .js parsed as ESM.
    const esm = Boolean(values.esm) ||
      readJson(path.join(cwd, 'package.json')).type === 'module'

    // `true` tells ESLint not to search for a config file at all.
    options.overrideConfigFile = true
    options.overrideConfig = setup({ esm, mocha: Boolean(values.mocha) })
  }

  const eslint = new FlatESLint(options)

  const results = await eslint.lintFiles(patterns)
  if (values.fix) await FlatESLint.outputFixes(results)

  const formatter = await eslint.loadFormatter(values.format)
  const output = await formatter.format(results)
  if (output) process.stdout.write(output)

  let errors = 0
  let warnings = 0
  results.forEach((res) => {
    errors += res.errorCount
    warnings += res.warningCount
  })

  const maxWarnings = Number(values['max-warnings'])

  if (errors > 0) return 1
  if (maxWarnings >= 0 && warnings > maxWarnings) {
    console.error(`bfx-lint-js: ${warnings} warnings exceeds the max of ${maxWarnings}`)
    return 1
  }
  return 0
}

main()
  .then((code) => { process.exitCode = code })
  .catch((err) => {
    console.error(`bfx-lint-js: ${err.message || err}`)
    process.exitCode = 2
  })
