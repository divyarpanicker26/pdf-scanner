import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { extractValues } from './extract.ts'
import { clearSavedFields, loadFields, saveFields, suggestedFields } from './fields.ts'
import { readPdf } from './pdfText.ts'
import type { FieldSpec } from './types.ts'

const MAX_BYTES = 25 * 1024 * 1024

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
  const requestId = useRef(0)
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    saveFields(fields)
  }, [fields])

  const extraction = useMemo(
    () => extractValues(documentState?.text ?? '', fields),
    [documentState, fields],
  )

  const payload = useMemo(() => {
    if (!documentState) return null
    return {
      fileName: documentState.fileName,
      pageCount: documentState.pageCount,
      method: documentState.method,
      values: extraction.values,
    }
  }, [documentState, extraction.values])

  const json = payload ? JSON.stringify(payload, null, 2) : ''
  const foundCount = Object.values(extraction.values).filter(Boolean).length
  const valueCount = Object.keys(extraction.values).length

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

  async function openSample() {
    setError('')
    setStatus('Loading the sample form')
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}sample.pdf`)
      if (!response.ok) throw new Error('The sample PDF could not be loaded.')
      const blob = await response.blob()
      await openFile(new File([blob], 'sample.pdf', { type: 'application/pdf' }))
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
            <span className="hint">Text-based forms are read directly. Sparse or scanned pages use English OCR in the browser.</span>
            <div className="button-row">
              <button className="file-button" type="button" onClick={() => fileInput.current?.click()} disabled={busy}>
                Choose PDF
              </button>
              <button className="ghost" type="button" onClick={() => void openSample()} disabled={busy}>
                Open sample
              </button>
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
            With no regular expression, the value is the text after the label. A regex replaces that rule, and its first capture group becomes the JSON value.
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
              {Object.entries(extraction.values)
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
