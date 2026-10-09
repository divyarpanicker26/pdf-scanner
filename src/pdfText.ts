import {
  getDocument,
  GlobalWorkerOptions,
  PasswordException,
  type PDFPageProxy,
} from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import type { Worker } from 'tesseract.js'

GlobalWorkerOptions.workerSrc = workerUrl

const SPARSE_TEXT_LENGTH = 25
const MAX_PREVIEW_PAGES = 6

export type PdfReadResult = {
  pageCount: number
  text: string
  method: 'text' | 'text+ocr'
  previews: string[]
}

type PositionedText = {
  str: string
  x: number
  y: number
  width: number
}

export async function readPdf(
  data: ArrayBuffer,
  onProgress: (message: string) => void,
): Promise<PdfReadResult> {
  const bytes = new Uint8Array(data.byteLength)
  bytes.set(new Uint8Array(data))
  const loadingTask = getDocument({ data: bytes })

  let pdf
  try {
    pdf = await loadingTask.promise
  } catch (error) {
    await loadingTask.destroy()
    if (error instanceof PasswordException) {
      throw new Error('This PDF is password-protected. Remove the password and try again.')
    }
    throw new Error('This file could not be read as a PDF.')
  }

  const pageTexts: string[] = []
  const previews: string[] = []
  let worker: Worker | null = null
  let usedOcr = false

  try {
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      onProgress(`Reading page ${pageNumber} of ${pdf.numPages}`)
      const page = await pdf.getPage(pageNumber)
      const content = await page.getTextContent()
      let text = itemsToText(content.items)

      if (text.replace(/\s/g, '').length < SPARSE_TEXT_LENGTH) {
        onProgress(`Recognizing page ${pageNumber} of ${pdf.numPages}`)
        worker ??= await createOcrWorker()
        const recognized = await recognizePage(page, worker)
        if (recognized) {
          text = recognized
          usedOcr = true
        }
      }

      pageTexts.push(text)
      if (previews.length < MAX_PREVIEW_PAGES) {
        previews.push(await renderPreview(page))
      }
    }
  } finally {
    await worker?.terminate()
    await loadingTask.destroy()
  }

  return {
    pageCount: pageTexts.length,
    text: pageTexts.filter(Boolean).join('\n'),
    method: usedOcr ? 'text+ocr' : 'text',
    previews,
  }
}

function itemsToText(items: unknown[]): string {
  const positioned: PositionedText[] = []
  for (const item of items) {
    if (!isTextItem(item) || !item.str.trim()) continue
    positioned.push({
      str: item.str,
      x: item.transform[4] ?? 0,
      y: item.transform[5] ?? 0,
      width: item.width ?? 0,
    })
  }

  positioned.sort((left, right) => right.y - left.y || left.x - right.x)

  const lines: PositionedText[][] = []
  for (const item of positioned) {
    const current = lines.at(-1)
    if (!current || Math.abs(current[0].y - item.y) > 3) {
      lines.push([item])
    } else {
      current.push(item)
    }
  }

  return lines
    .map((line) => joinLine(line.sort((left, right) => left.x - right.x)))
    .filter(Boolean)
    .join('\n')
}

function joinLine(items: PositionedText[]): string {
  let text = ''
  let cursor = 0
  for (const item of items) {
    if (text) {
      const gap = item.x - cursor
      if (gap > 1.5) text += ' '
    }
    text += item.str
    cursor = item.x + item.width
  }
  return text.replace(/\s+/g, ' ').trim()
}

function isTextItem(item: unknown): item is { str: string; transform: number[]; width?: number } {
  return (
    typeof item === 'object' &&
    item !== null &&
    'str' in item &&
    typeof item.str === 'string' &&
    'transform' in item &&
    Array.isArray(item.transform)
  )
}

async function createOcrWorker(): Promise<Worker> {
  const tesseract = await import('tesseract.js')
  return tesseract.createWorker('eng')
}

async function recognizePage(page: PDFPageProxy, worker: Worker): Promise<string> {
  const viewport = page.getViewport({ scale: 2 })
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(viewport.width)
  canvas.height = Math.ceil(viewport.height)
  await page.render({ canvas, viewport }).promise
  const result = await worker.recognize(canvas)
  return result.data.text.trim()
}

async function renderPreview(page: PDFPageProxy): Promise<string> {
  const base = page.getViewport({ scale: 1 })
  const viewport = page.getViewport({ scale: Math.min(1.35, 920 / base.width) })
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(viewport.width)
  canvas.height = Math.ceil(viewport.height)
  await page.render({ canvas, viewport }).promise
  return canvas.toDataURL('image/jpeg', 0.82)
}
