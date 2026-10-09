import type { FieldSpec } from './types.ts'

const STORAGE_KEY = 'pdf-field-extractor.fields'

export function suggestedFields(): FieldSpec[] {
  return [
    field('name', 'Name', false),
    field('caseNumber', 'Case Number', false),
    field('address', 'Address', true),
    field('income', 'Income', false),
    field('documentDate', 'Document Date', false),
  ]
}

export function loadFields(): FieldSpec[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return suggestedFields()
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed) || parsed.length === 0) return suggestedFields()
    const fields = parsed.filter(isField)
    return fields.length > 0 ? fields : suggestedFields()
  } catch {
    return suggestedFields()
  }
}

export function saveFields(fields: FieldSpec[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(fields))
}

export function clearSavedFields() {
  localStorage.removeItem(STORAGE_KEY)
}

function field(key: string, label: string, multiline: boolean): FieldSpec {
  return {
    id: crypto.randomUUID(),
    key,
    label,
    pattern: '',
    multiline,
  }
}

function isField(value: unknown): value is FieldSpec {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Partial<FieldSpec>
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.key === 'string' &&
    typeof candidate.label === 'string' &&
    typeof candidate.pattern === 'string' &&
    typeof candidate.multiline === 'boolean'
  )
}
