import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { extractValues } from '../src/extract.ts'
import type { FieldSpec } from '../src/types.ts'

const form = [
  'Application form',
  'Name: Jordan Hale',
  'Case Number: SR-10482',
  'Address: 18 Harbor Street',
  'Boston, MA 02110',
  'Income: $4,250.00',
  'Document Date: March 14, 2026',
].join('\n')

function spec(partial: Partial<FieldSpec> & Pick<FieldSpec, 'key'>): FieldSpec {
  return {
    id: partial.id ?? partial.key,
    label: partial.label ?? '',
    pattern: partial.pattern ?? '',
    multiline: partial.multiline ?? false,
    key: partial.key,
  }
}

describe('extractValues', () => {
  it('reads labeled fields and a multiline address', () => {
    const { values, fieldErrors } = extractValues(form, [
      spec({ key: 'name', label: 'Name' }),
      spec({ key: 'caseNumber', label: 'Case Number' }),
      spec({ key: 'address', label: 'Address', multiline: true }),
      spec({ key: 'income', label: 'Income' }),
      spec({ key: 'documentDate', label: 'Document Date' }),
    ])

    assert.deepEqual(fieldErrors, {})
    assert.deepEqual(values, {
      name: 'Jordan Hale',
      caseNumber: 'SR-10482',
      address: '18 Harbor Street, Boston, MA 02110',
      income: '$4,250.00',
      documentDate: 'March 14, 2026',
    })
  })

  it('uses the first capture group when a regex is set', () => {
    const { values } = extractValues(form, [
      spec({ key: 'caseDigits', pattern: 'SR-(\\d+)' }),
    ])
    assert.equal(values.caseDigits, '10482')
  })

  it('reports an invalid regex and a duplicate key', () => {
    const { values, fieldErrors } = extractValues(form, [
      spec({ key: 'name', label: 'Name' }),
      spec({ id: 'second', key: 'name', label: 'Name' }),
      spec({ id: 'bad', key: 'broken', pattern: '(' }),
    ])

    assert.equal(values.name, 'Jordan Hale')
    assert.equal(values.broken, null)
    assert.equal(fieldErrors.second, 'This JSON key is already used.')
    assert.equal(fieldErrors.bad, 'This regular expression is invalid.')
  })
})
