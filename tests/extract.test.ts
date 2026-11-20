import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { applyOverrides, extractValues } from '../src/extract.ts'
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

  it('reads a fictional recertification page', () => {
    const recertification = [
      'Name: Maria Santos',
      'Case Number: NYC-0001842',
      'Account Number: NYC-0001842',
      'Development: Sample Houses',
      'Address: 100 Sample Court',
      'Apartment 4B',
      'Brooklyn, NY 11201',
      'Household Size: 3',
      'Income: $3,260.00',
      'Document Date: September 18, 2026',
    ].join('\n')

    const { values, fieldErrors } = extractValues(recertification, [
      spec({ key: 'name', label: 'Name' }),
      spec({ key: 'caseNumber', label: 'Case Number' }),
      spec({ key: 'accountNumber', label: 'Account Number' }),
      spec({ key: 'development', label: 'Development' }),
      spec({ key: 'address', label: 'Address', multiline: true }),
      spec({ key: 'householdSize', label: 'Household Size' }),
      spec({ key: 'income', label: 'Income' }),
      spec({ key: 'documentDate', label: 'Document Date' }),
    ])

    assert.deepEqual(fieldErrors, {})
    assert.deepEqual(values, {
      name: 'Maria Santos',
      caseNumber: 'NYC-0001842',
      accountNumber: 'NYC-0001842',
      development: 'Sample Houses',
      address: '100 Sample Court, Apartment 4B, Brooklyn, NY 11201',
      householdSize: '3',
      income: '$3,260.00',
      documentDate: 'September 18, 2026',
    })
  })

  it('reads a fictional income affidavit', () => {
    const affidavit = [
      'Employer: Harbor Kitchen LLC',
      'Gross Wages: $2,840.00',
      'SSI Amount: $420.00',
      'Public Assistance: None',
      'Income: $3,260.00',
    ].join('\n')

    const { values } = extractValues(affidavit, [
      spec({ key: 'employer', label: 'Employer' }),
      spec({ key: 'grossWages', label: 'Gross Wages' }),
      spec({ key: 'ssiAmount', label: 'SSI Amount' }),
      spec({ key: 'publicAssistance', label: 'Public Assistance' }),
      spec({ key: 'income', label: 'Income' }),
    ])

    assert.deepEqual(values, {
      employer: 'Harbor Kitchen LLC',
      grossWages: '$2,840.00',
      ssiAmount: '$420.00',
      publicAssistance: 'None',
      income: '$3,260.00',
    })
  })

  it('reads a fictional housing application', () => {
    const application = [
      'Name: David Chen',
      'Application Number: APP-22091',
      'Address: 42 Maple Avenue',
      'Apartment 2C',
      'Queens, NY 11354',
      'Household Size: 2',
      'Income: $2,910.00',
      'Document Date: October 2, 2026',
    ].join('\n')

    const { values, fieldErrors } = extractValues(application, [
      spec({ key: 'name', label: 'Name' }),
      spec({ key: 'applicationNumber', label: 'Application Number' }),
      spec({ key: 'address', label: 'Address', multiline: true }),
      spec({ key: 'householdSize', label: 'Household Size' }),
      spec({ key: 'income', label: 'Income' }),
      spec({ key: 'documentDate', label: 'Document Date' }),
    ])

    assert.deepEqual(fieldErrors, {})
    assert.deepEqual(values, {
      name: 'David Chen',
      applicationNumber: 'APP-22091',
      address: '42 Maple Avenue, Apartment 2C, Queens, NY 11354',
      householdSize: '2',
      income: '$2,910.00',
      documentDate: 'October 2, 2026',
    })
  })

  it('reads a fictional vendor invoice', () => {
    const invoice = [
      'Vendor Name: North Line Maintenance Inc',
      'Invoice Number: INV-88421',
      'Purchase Order: PO-11038',
      'Development: Sample Houses',
      'Invoice Amount: $4,875.00',
      'Document Date: October 6, 2026',
    ].join('\n')

    const { values } = extractValues(invoice, [
      spec({ key: 'vendorName', label: 'Vendor Name' }),
      spec({ key: 'invoiceNumber', label: 'Invoice Number' }),
      spec({ key: 'purchaseOrder', label: 'Purchase Order' }),
      spec({ key: 'development', label: 'Development' }),
      spec({ key: 'invoiceAmount', label: 'Invoice Amount' }),
      spec({ key: 'documentDate', label: 'Document Date' }),
    ])

    assert.deepEqual(values, {
      vendorName: 'North Line Maintenance Inc',
      invoiceNumber: 'INV-88421',
      purchaseOrder: 'PO-11038',
      development: 'Sample Houses',
      invoiceAmount: '$4,875.00',
      documentDate: 'October 6, 2026',
    })
  })

  it('replaces a PDF value when an override is set', () => {
    const { values } = extractValues(form, [spec({ key: 'name', label: 'Name' })])
    const overridden = applyOverrides(values, [spec({ key: 'name', label: 'Name' })], {
      name: 'Alex Rivera',
    })
    assert.equal(values.name, 'Jordan Hale')
    assert.equal(overridden.name, 'Alex Rivera')
  })

  it('reports a missing label and a duplicate key', () => {
    const { values, fieldErrors } = extractValues(form, [
      spec({ key: 'name', label: 'Name' }),
      spec({ id: 'second', key: 'name', label: 'Name' }),
      spec({ id: 'blank', key: 'broken', label: '' }),
    ])

    assert.equal(values.name, 'Jordan Hale')
    assert.equal(values.broken, null)
    assert.equal(fieldErrors.second, 'This JSON key is already used.')
    assert.equal(fieldErrors.blank, 'Add a label in the document.')
  })
})
