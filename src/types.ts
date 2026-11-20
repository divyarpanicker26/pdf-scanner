export type FieldSpec = {
  id: string
  key: string
  label: string
  multiline: boolean
}

export type ExtractionResult = {
  values: Record<string, string | null>
  fieldErrors: Record<string, string>
}
