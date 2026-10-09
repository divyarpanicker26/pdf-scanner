import { writeFile } from 'node:fs/promises'
import { PDFDocument, StandardFonts } from 'pdf-lib'

const document = await PDFDocument.create()
const page = document.addPage([612, 792])
const font = await document.embedFont(StandardFonts.Helvetica)
const lines = [
  ['Application form', 20],
  ['', 12],
  ['Name: Jordan Hale', 13],
  ['Case Number: SR-10482', 13],
  ['Address: 18 Harbor Street', 13],
  ['Boston, MA 02110', 13],
  ['Income: $4,250.00', 13],
  ['Document Date: March 14, 2026', 13],
]

let y = 720
for (const [line, size] of lines) {
  if (line) page.drawText(line, { x: 72, y, size, font })
  y -= size + 14
}

await writeFile(new URL('../public/sample.pdf', import.meta.url), await document.save())
