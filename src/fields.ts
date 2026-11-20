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

export function recertificationFields(): FieldSpec[] {
  return [
    field('name', 'Name', false),
    field('caseNumber', 'Case Number', false),
    field('accountNumber', 'Account Number', false),
    field('development', 'Development', false),
    field('address', 'Address', true),
    field('householdSize', 'Household Size', false),
    field('income', 'Income', false),
    field('documentDate', 'Document Date', false),
  ]
}

export function incomeAffidavitFields(): FieldSpec[] {
  return [
    field('name', 'Name', false),
    field('caseNumber', 'Case Number', false),
    field('address', 'Address', true),
    field('employer', 'Employer', false),
    field('grossWages', 'Gross Wages', false),
    field('ssiAmount', 'SSI Amount', false),
    field('publicAssistance', 'Public Assistance', false),
    field('income', 'Income', false),
    field('documentDate', 'Document Date', false),
  ]
}

export function assetDeclarationFields(): FieldSpec[] {
  return [
    field('name', 'Name', false),
    field('caseNumber', 'Case Number', false),
    field('address', 'Address', true),
    field('bankName', 'Bank Name', false),
    field('accountType', 'Account Type', false),
    field('balance', 'Balance', false),
    field('savingsBalance', 'Savings Balance', false),
    field('documentDate', 'Document Date', false),
  ]
}

export function applicationFields(): FieldSpec[] {
  return [
    field('name', 'Name', false),
    field('applicationNumber', 'Application Number', false),
    field('address', 'Address', true),
    field('householdSize', 'Household Size', false),
    field('income', 'Income', false),
    field('documentDate', 'Document Date', false),
  ]
}

export function householdChangeFields(): FieldSpec[] {
  return [
    field('name', 'Name', false),
    field('caseNumber', 'Case Number', false),
    field('address', 'Address', true),
    field('requestType', 'Request Type', false),
    field('memberName', 'Member Name', false),
    field('relation', 'Relation', false),
    field('householdSize', 'Household Size', false),
    field('documentDate', 'Document Date', false),
  ]
}

export function vendorInvoiceFields(): FieldSpec[] {
  return [
    field('vendorName', 'Vendor Name', false),
    field('invoiceNumber', 'Invoice Number', false),
    field('purchaseOrder', 'Purchase Order', false),
    field('development', 'Development', false),
    field('invoiceAmount', 'Invoice Amount', false),
    field('documentDate', 'Document Date', false),
  ]
}

export function payStatementFields(): FieldSpec[] {
  return [
    field('name', 'Name', false),
    field('employer', 'Employer', false),
    field('address', 'Address', true),
    field('payPeriod', 'Pay Period', false),
    field('grossWages', 'Gross Wages', false),
    field('netPay', 'Net Pay', false),
    field('documentDate', 'Document Date', false),
  ]
}

export function loadFields(): FieldSpec[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return suggestedFields()
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed) || parsed.length === 0) return suggestedFields()
    const fields = parsed.filter(isField).map((item) => ({
      id: item.id,
      key: item.key,
      label: item.label,
      multiline: item.multiline,
    }))
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
    typeof candidate.multiline === 'boolean'
  )
}
