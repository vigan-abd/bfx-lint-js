#!/usr/bin/env node
'use strict'

// Regenerates THIRD-PARTY-NOTICES.md from whatever is currently in vendor/.
// Run it after every `npm install --prefix vendor`.

const fs = require('fs')
const path = require('path')

const VENDOR = path.join(__dirname, '..', 'vendor', 'node_modules')
const OUT = path.join(__dirname, '..', 'THIRD-PARTY-NOTICES.md')

const LICENSE_RE = /^(LICENSE|LICENCE|COPYING|NOTICE)/i

// Four vendored packages ship no license file. Their SPDX id and copyright line
// come from their package.json and source headers; the text below is the
// canonical text for that license.
const FALLBACK_HOLDERS = {
  esrecurse: 'Copyright (C) 2014 Yusuke Suzuki <utatane.tea@gmail.com>',
  imurmurhash: 'Copyright (c) 2013 Gary Court, Jens Taylor',
  keyv: 'Copyright (c) Jared Wray <me@jaredwray.com>',
  'natural-compare': 'Copyright (c) 2012-2015 Lauri Rooden <lauri@rooden.ee>'
}

const MIT = (holder) => `MIT License

${holder}

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`

const BSD2 = (holder) => `BSD 2-Clause License

${holder}

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

  * Redistributions of source code must retain the above copyright
    notice, this list of conditions and the following disclaimer.
  * Redistributions in binary form must reproduce the above copyright
    notice, this list of conditions and the following disclaimer in the
    documentation and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
POSSIBILITY OF SUCH DAMAGE.`

// package.json repository fields come in several shapes: a full URL, a git+ or
// git:// URL, an scp-style ssh address, or bare GitHub "owner/repo" shorthand.
const normalizeRepo = (repo) => {
  if (typeof repo !== 'string' || !repo) return null

  let url = repo.replace(/^git\+/, '').replace(/\.git$/, '')

  const ssh = url.match(/^(?:git@|ssh:\/\/git@)([^:/]+)[:/](.+)$/)
  if (ssh) return `https://${ssh[1]}/${ssh[2]}`

  if (url.slice(0, 6) === 'git://') url = `https://${url.slice(6)}`
  if (/^https?:\/\//.test(url)) return url

  // Bare "owner/repo" (optionally "github:owner/repo") means GitHub.
  const shorthand = url.replace(/^github:/, '')
  if (/^[\w.-]+\/[\w.-]+$/.test(shorthand)) {
    return `https://github.com/${shorthand}`
  }

  return null
}

const collect = (dir, out) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name === '.bin') continue

    const pkgDir = path.join(dir, entry.name)
    if (entry.name.charAt(0) === '@') {
      collect(pkgDir, out)
      continue
    }

    const manifest = path.join(pkgDir, 'package.json')
    if (fs.existsSync(manifest)) {
      const pkg = JSON.parse(fs.readFileSync(manifest, 'utf8'))
      const license = typeof pkg.license === 'string'
        ? pkg.license
        : (pkg.license && pkg.license.type) || 'UNKNOWN'

      const texts = fs.readdirSync(pkgDir)
        .filter(name => LICENSE_RE.test(name))
        .sort()
        .map(name => fs.readFileSync(path.join(pkgDir, name), 'utf8').trim())

      const repo = pkg.repository && (pkg.repository.url || pkg.repository)

      out.push({
        name: pkg.name,
        version: pkg.version,
        license,
        repo: normalizeRepo(repo),
        texts,
        synthesized: false
      })
    }

    const nested = path.join(pkgDir, 'node_modules')
    if (fs.existsSync(nested)) collect(nested, out)
  }
}

const fallbackText = (pkg) => {
  const holder = FALLBACK_HOLDERS[pkg.name]
  if (!holder) return null
  if (pkg.license === 'MIT') return MIT(holder)
  if (pkg.license === 'BSD-2-Clause') return BSD2(holder)
  return null
}

const main = () => {
  const pkgs = []
  collect(VENDOR, pkgs)
  pkgs.sort((a, b) => a.name.localeCompare(b.name))

  const missing = []
  pkgs.forEach((pkg) => {
    if (pkg.texts.length) return
    const text = fallbackText(pkg)
    if (text) {
      pkg.texts = [text]
      pkg.synthesized = true
    } else {
      missing.push(pkg.name)
    }
  })

  const counts = {}
  pkgs.forEach((pkg) => { counts[pkg.license] = (counts[pkg.license] || 0) + 1 })

  const lines = []
  lines.push('# Third-party notices')
  lines.push('')
  lines.push('This package redistributes ESLint and its dependencies under `vendor/`.')
  lines.push('The licenses and copyright notices of those packages are reproduced below.')
  lines.push('')
  lines.push('Generated by `scripts/gen-notices.js` — re-run it after changing `vendor/`.')
  lines.push('')
  lines.push(`Packages: **${pkgs.length}**`)
  lines.push('')
  lines.push('| License | Packages |')
  lines.push('| --- | --- |')
  Object.keys(counts).sort((a, b) => counts[b] - counts[a]).forEach((lic) => {
    lines.push(`| ${lic} | ${counts[lic]} |`)
  })
  lines.push('')

  lines.push('## Index')
  lines.push('')
  lines.push('| Package | Version | License |')
  lines.push('| --- | --- | --- |')
  pkgs.forEach((pkg) => {
    const link = pkg.repo ? `[${pkg.name}](${pkg.repo})` : pkg.name
    lines.push(`| ${link} | ${pkg.version} | ${pkg.license} |`)
  })
  lines.push('')

  lines.push('## Licenses')
  lines.push('')
  pkgs.forEach((pkg) => {
    lines.push(`### ${pkg.name}@${pkg.version}`)
    lines.push('')
    lines.push(`License: ${pkg.license}`)
    if (pkg.repo) lines.push(`  \nSource: ${pkg.repo}`)
    lines.push('')
    if (pkg.synthesized) {
      lines.push('> This package ships no license file. The copyright line below is')
      lines.push('> taken from its `package.json` and source headers; the body is the')
      lines.push(`> canonical ${pkg.license} text.`)
      lines.push('')
    }
    pkg.texts.forEach((text) => {
      lines.push('```')
      lines.push(text)
      lines.push('```')
      lines.push('')
    })
  })

  fs.writeFileSync(OUT, lines.join('\n'))

  console.log(`wrote ${path.relative(process.cwd(), OUT)}`)
  console.log(`  packages: ${pkgs.length}`)
  console.log(`  synthesized texts: ${pkgs.filter(p => p.synthesized).length}`)
  if (missing.length) {
    console.error(`  MISSING license text: ${missing.join(', ')}`)
    process.exitCode = 1
  }
}

main()
