import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { applyOverrides, extractValues } from './extract.ts'
import {
  applicationFields,
  assetDeclarationFields,
  clearSavedFields,
  householdChangeFields,
  incomeAffidavitFields,
  loadFields,
  payStatementFields,
  recertificationFields,
  saveFields,
  suggestedFields,
  vendorInvoiceFields,
} from './fields.ts'
import { readPdf } from './pdfText.ts'
import type { FieldSpec } from './types.ts'

const MAX_BYTES = 25 * 1024 * 1024

const DEMO_DOCUMENTS = [
  { file: 'sample.pdf', label: 'Simple form', fields: suggestedFields },
  { file: 'samples/nycha-annual-recertification.pdf', label: 'Recertification', fields: recertificationFields },
  { file: 'samples/nycha-affidavit-of-income.pdf', label: 'Income affidavit', fields: incomeAffidavitFields },
  { file: 'samples/nycha-asset-declaration.pdf', label: 'Asset declaration', fields: assetDeclarationFields },
  { file: 'samples/housing-application.pdf', label: 'Housing application', fields: applicationFields },
  { file: 'samples/household-change-request.pdf', label: 'Household change', fields: householdChangeFields },
  { file: 'samples/vendor-invoice.pdf', label: 'Vendor invoice', fields: vendorInvoiceFields },
  { file: 'samples/earnings-statement.pdf', label: 'Pay statement', fields: payStatementFields },
]

type DocumentState = {
  fileName: string
  pageCount: number
  text: string
  method: 'text' | 'text+ocr'
  previews: string[]
}

export default function App() {
  const [fields, setFields] = useState<FieldSpec[]>(() => loadFields())
  const [documentState, setDocumentState] = useState<DocumentState | null>(null)
  const [status, setStatus] = useState('Upload a PDF or open the sample form.')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [copied, setCopied] = useState(false)
  const [overrides, setOverrides] = useState<Record<string, string>>({})
  const requestId = useRef(0)
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    saveFields(fields)
  }, [fields])

  const extraction = useMemo(
    () => extractValues(documentState?.text ?? '', fields),
    [documentState, fields],
  )

  const values = useMemo(
    () => applyOverrides(extraction.values, fields, overrides),
    [extraction.values, fields, overrides],
  )

  const payload = useMemo(() => {
    if (!documentState) return null
    return {
      fileName: documentState.fileName,
      pageCount: documentState.pageCount,
      method: documentState.method,
      values,
    }
  }, [documentState, values])

  const json = payload ? JSON.stringify(payload, null, 2) : ''
  const foundCount = Object.values(values).filter(Boolean).length
  const valueCount = Object.keys(values).length
  const overriddenKeys = fields
    .filter((field) => field.key.trim() && overrides[field.id]?.trim())
    .map((field) => field.key.trim())

  async function openFile(file: File) {
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setError('Choose a PDF file.')
      return
    }
    if (file.size > MAX_BYTES) {
      setError('This PDF is larger than 25 MB.')
      return
    }

    const id = requestId.current + 1
    requestId.current = id
    setBusy(true)
    setError('')
    setCopied(false)
    setOverrides({})
    setStatus(`Reading ${file.name}`)

    try {
      const result = await readPdf(await file.arrayBuffer(), (message) => {
        if (requestId.current === id) setStatus(message)
      })
      if (requestId.current !== id) return
      setDocumentState({ fileName: file.name, ...result })
      setStatus(
        result.method === 'text+ocr'
          ? 'Finished. Some pages were read with on-device OCR.'
          : 'Finished. Values update as you edit the fields.',
      )
    } catch (caught) {
      if (requestId.current !== id) return
      setDocumentState(null)
      setError(caught instanceof Error ? caught.message : 'The PDF could not be read.')
      setStatus('')
    } finally {
      if (requestId.current === id) setBusy(false)
    }
  }

  async function openSample(fileName: string, nextFields?: FieldSpec[]) {
    setError('')
    setStatus(`Loading ${fileName}`)
    if (nextFields) {
      setCopied(false)
      setOverrides({})
      setFields(nextFields)
    }
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}${fileName}`)
      if (!response.ok) throw new Error('The sample PDF could not be loaded.')
      const blob = await response.blob()
      const baseName = fileName.slice(fileName.lastIndexOf('/') + 1)
      await openFile(new File([blob], baseName, { type: 'application/pdf' }))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The sample PDF could not be loaded.')
      setStatus('')
    }
  }

  function updateField(id: string, patch: Partial<FieldSpec>) {
    setCopied(false)
    setFields((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }

  async function copyJson() {
    if (!json) return
    await navigator.clipboard.writeText(json)
    setCopied(true)
  }

  function downloadJson() {
    if (!json || !documentState) return
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = documentState.fileName.replace(/\.pdf$/i, '') + '.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="app">
      <header className="header">
        <div>
          <p className="eyebrow">Local document workspace</p>
          <h1>PDF field extractor</h1>
          <p className="lede">
            Upload a PDF, name the values you need, and copy them as JSON. Reading happens in this browser. The file is not sent to a server.
          </p>
        </div>
      </header>

      <div className="workspace">
        <section className="panel">
          <div className="panel-head">
            <h2>Document</h2>
          </div>
          <div
            className={dragOver ? 'dropzone hot' : 'dropzone'}
            onDragOver={(event) => {
              event.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(event) => {
              event.preventDefault()
              setDragOver(false)
              const file = event.dataTransfer.files[0]
              if (file) void openFile(file)
            }}
          >
            <strong>Drop a PDF here</strong>
            <span className="hint">
              Text-based forms are read directly. Sparse or scanned pages use English OCR in the browser.
              The demo PDFs are fictional inbound documents, including recertification, applications, and vendor paperwork.
            </span>
            <div className="button-row">
              <button className="file-button" type="button" onClick={() => fileInput.current?.click()} disabled={busy}>
                Choose PDF
              </button>
              <label className="demo-picker">
                Demo PDF
                <select
                  aria-label="Open a demo PDF"
                  disabled={busy}
                  defaultValue=""
                  onChange={(event) => {
                    const chosen = DEMO_DOCUMENTS.find((item) => item.file === event.target.value)
                    event.target.value = ''
                    if (chosen) void openSample(chosen.file, chosen.fields())
                  }}
                >
                  <option value="" disabled>
                    Choose a sample
                  </option>
                  {DEMO_DOCUMENTS.map((item) => (
                    <option key={item.file} value={item.file}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <input
              ref={fileInput}
              className="hidden-input"
              type="file"
              accept="application/pdf,.pdf"
              aria-label="PDF file"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) void openFile(file)
                event.target.value = ''
              }}
            />
          </div>
          <p className={error ? 'status error' : 'status'} role="status">
            {error || status}
          </p>
          {documentState && documentState.previews.length > 0 && (
            <div className="preview">
              {documentState.previews.map((src, index) => (
                <img key={src.slice(0, 48) + index} src={src} alt={`Page ${index + 1} of ${documentState.fileName}`} />
              ))}
              {documentState.pageCount > documentState.previews.length && (
                <p className="hint">
                  Showing {documentState.previews.length} of {documentState.pageCount} pages. Every page is still included in the extraction.
                </p>
              )}
            </div>
          )}
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>Fields to extract</h2>
            <button
              className="text-button"
              type="button"
              onClick={() => {
                clearSavedFields()
                setCopied(false)
                setOverrides({})
                setFields(suggestedFields())
              }}
            >
              Restore suggested
            </button>
          </div>
          <div className="field-list">
            {fields.map((field) => (
              <article className="field-card" key={field.id}>
                <div className="field-grid">
                  <label>
                    JSON key
                    <input
                      type="text"
                      value={field.key}
                      aria-label={`JSON key for ${field.key || 'new field'}`}
                      onChange={(event) => updateField(field.id, { key: event.target.value })}
                    />
                  </label>
                  <label>
                    Label in the document
                    <input
                      type="text"
                      value={field.label}
                      placeholder="Case Number"
                      aria-label={`Label for ${field.key || 'new field'}`}
                      onChange={(event) => updateField(field.id, { label: event.target.value })}
                    />
                  </label>
                </div>
                <label>
                  Regular expression, optional
                  <input
                    type="text"
                    value={field.pattern}
                    placeholder="Case Number:\s*(SR-\d+)"
                    spellCheck={false}
                    aria-label={`Regular expression for ${field.key || 'new field'}`}
                    onChange={(event) => updateField(field.id, { pattern: event.target.value })}
                  />
                </label>
                <label>
                  Override value, optional
                  <input
                    type="text"
                    value={overrides[field.id] ?? ''}
                    placeholder={extraction.values[field.key.trim()] ?? 'Leave empty to keep the PDF value'}
                    aria-label={`Override value for ${field.key || 'new field'}`}
                    onChange={(event) => {
                      setCopied(false)
                      const next = event.target.value
                      setOverrides((current) => {
                        if (!next) {
                          const { [field.id]: _, ...rest } = current
                          return rest
                        }
                        return { ...current, [field.id]: next }
                      })
                    }}
                  />
                </label>
                <div className="field-options">
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={field.multiline}
                      onChange={(event) => updateField(field.id, { multiline: event.target.checked })}
                    />
                    Continue on the next lines
                  </label>
                  <button
                    className="text-button"
                    type="button"
                    onClick={() => {
                      setCopied(false)
                      setOverrides((current) => {
                        const { [field.id]: _, ...rest } = current
                        return rest
                      })
                      setFields((current) => current.filter((item) => item.id !== field.id))
                    }}
                  >
                    Remove
                  </button>
                </div>
                {extraction.fieldErrors[field.id] && (
                  <p className="field-error">{extraction.fieldErrors[field.id]}</p>
                )}
              </article>
            ))}
          </div>
          <div className="actions">
            <button
              className="primary"
              type="button"
              onClick={() => {
                setCopied(false)
                setFields((current) => [
                  ...current,
                  { id: crypto.randomUUID(), key: '', label: '', pattern: '', multiline: false },
                ])
              }}
            >
              Add field
            </button>
          </div>
          <p className="help">
            With no regular expression, the value is the text after the label. A regex picks a piece of that text. Use Override to type a different value than the PDF.
          </p>
        </section>
      </div>

      <section className="panel json-panel">
        <div className="panel-head">
          <h2>JSON</h2>
          <div className="json-actions">
            <button className="ghost" type="button" onClick={() => void copyJson()} disabled={!json}>
              {copied ? 'Copied' : 'Copy JSON'}
            </button>
            <button className="ghost" type="button" onClick={downloadJson} disabled={!json}>
              Download
            </button>
          </div>
        </div>
        {payload ? (
          <>
            <div className="summary">
              <span className="pill">
                {foundCount} of {valueCount} fields found
              </span>
              <span className="pill">{documentState?.method === 'text+ocr' ? 'Text and OCR' : 'Text layer'}</span>
              {overriddenKeys.map((key) => (
                <span className="pill" key={`overridden-${key}`}>
                  {key} overridden
                </span>
              ))}
              {Object.entries(values)
                .filter(([, value]) => !value)
                .map(([key]) => (
                  <span className="pill missing" key={key}>
                    {key} missing
                  </span>
                ))}
            </div>
            <pre className="json-view">{json}</pre>
          </>
        ) : (
          <p className="hint">The JSON appears here after a PDF is read.</p>
        )}
        {documentState && (
          <details className="raw-text">
            <summary>Text read from the PDF</summary>
            <pre>{documentState.text || 'No text was found.'}</pre>
          </details>
        )}
      </section>
    </div>
  )
}
