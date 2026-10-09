import type { ExtractionResult, FieldSpec } from './types.ts'

export function extractValues(text: string, fields: FieldSpec[]): ExtractionResult {
  const values: Record<string, string | null> = {}
  const fieldErrors: Record<string, string> = {}
  const seen = new Set<string>()

  for (const spec of fields) {
    const key = spec.key.trim()
    if (!key) {
      fieldErrors[spec.id] = 'Add a JSON key.'
      continue
    }
    if (seen.has(key)) {
      fieldErrors[spec.id] = 'This JSON key is already used.'
      continue
    }
    seen.add(key)

    const pattern = spec.pattern.trim()
    if (pattern) {
      try {
        const expression = new RegExp(pattern, 'im')
        const match = text.match(expression)
        values[key] = clean(match?.[1] ?? match?.[0] ?? '')
      } catch {
        fieldErrors[spec.id] = 'This regular expression is invalid.'
        values[key] = null
      }
      continue
    }

    if (!spec.label.trim()) {
      fieldErrors[spec.id] = 'Add a label or a regular expression.'
      values[key] = null
      continue
    }

    values[key] = valueAfterLabel(text, spec.label, spec.multiline)
  }

  return { values, fieldErrors }
}

function valueAfterLabel(text: string, label: string, multiline: boolean): string | null {
  const lines = text.split(/\r?\n/)
  const labelPattern = new RegExp(
    `^\\s*${escapeRegExp(label.trim())}\\s*[:\\-]?\\s*(.*)$`,
    'i',
  )

  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(labelPattern)
    if (!match) continue

    let value = match[1].trim()
    let cursor = index
    if (!value && index + 1 < lines.length) {
      cursor = index + 1
      value = lines[cursor].trim()
    }

    if (multiline && value) {
      const extra: string[] = []
      for (let next = cursor + 1; next < lines.length; next += 1) {
        const line = lines[next].trim()
        if (!line || looksLikeLabel(line)) break
        extra.push(line)
      }
      if (extra.length > 0) value = [value, ...extra].join(', ')
    }

    return clean(value)
  }

  return null
}

function looksLikeLabel(line: string): boolean {
  return /^[A-Za-z][A-Za-z0-9 .#/]{0,40}:\s*\S/.test(line)
}

function clean(value: string): string | null {
  const compact = value.replace(/\s+/g, ' ').trim()
  return compact || null
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
