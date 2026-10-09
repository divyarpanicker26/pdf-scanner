import { execFileSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const author = [
  '-c',
  'user.name=divyarpanicker26',
  '-c',
  'user.email=307739264+divyarpanicker26@users.noreply.github.com',
]

function git(args, cwd) {
  execFileSync('git', args, { cwd, stdio: 'inherit' })
}

execFileSync('npm', ['run', 'build'], { stdio: 'inherit', shell: true })

const remote = execFileSync('git', ['remote', 'get-url', 'origin'], { encoding: 'utf8' }).trim()
const dir = join(tmpdir(), `pdf-pages-${Date.now()}`)
mkdirSync(dir)

let cloned = false
try {
  git(['clone', '--branch', 'gh-pages', '--single-branch', '--depth', '1', remote, dir])
  cloned = true
} catch {
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(dir)
}

if (cloned) {
  for (const entry of readdirSync(dir)) {
    if (entry === '.git') continue
    rmSync(join(dir, entry), { recursive: true, force: true })
  }
}

cpSync('dist', dir, { recursive: true })
writeFileSync(join(dir, '.nojekyll'), '')

if (!existsSync(join(dir, '.git'))) {
  git(['init', '-b', 'gh-pages'], dir)
  git(['remote', 'add', 'origin', remote], dir)
}

git(['add', '-A'], dir)
git([...author, 'commit', '-m', 'Publish the PDF field extractor'], dir)
git(['push', '-u', 'origin', 'HEAD:gh-pages'], dir)
rmSync(dir, { recursive: true, force: true })
