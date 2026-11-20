import { mkdir, writeFile } from 'node:fs/promises'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

const outDir = new URL('../public/samples/', import.meta.url)

const ink = rgb(0.11, 0.13, 0.16)
const muted = rgb(0.32, 0.35, 0.4)
const navy = rgb(0.09, 0.16, 0.32)
const rule = rgb(0.7, 0.74, 0.78)
const wash = rgb(0.94, 0.95, 0.97)
const white = rgb(1, 1, 1)

const household = {
  name: 'Maria Santos',
  caseNumber: 'NYC-0001842',
  development: 'Sample Houses',
  borough: 'Brooklyn',
  phone: '718-555-0148',
  size: '3',
  income: '$3,260.00',
  date: 'September 18, 2026',
  period: 'January 1, 2027 to December 31, 2027',
}

const members = [
  ['Maria Santos', 'Head of Household', 'April 12, 1984'],
  ['Luis Santos', 'Son', 'June 3, 2012'],
  ['Elena Santos', 'Daughter', 'November 19, 2015'],
]

await mkdir(outDir, { recursive: true })

const annual = await PDFDocument.create()
const affidavit = await PDFDocument.create()
const assets = await PDFDocument.create()

const fonts = {
  regular: await annual.embedFont(StandardFonts.Helvetica),
  bold: await annual.embedFont(StandardFonts.HelveticaBold),
}

setMeta(annual, 'Sample annual recertification')
setMeta(affidavit, 'Sample affidavit of income')
setMeta(assets, 'Sample declaration of assets')

function setMeta(document, title) {
  document.setTitle(title)
  document.setAuthor('PDF field extractor samples')
  document.setSubject('Fictional sample styled after a public-housing recertification. Not an official NYCHA form.')
  document.setCreator('scripts/make-nycha-samples.mjs')
}

function drawAnnual(document, face) {
  const page = sheet(document, face, 'Annual Recertification of Family Income and Composition')
  page.note('Fictional sample styled after a public-housing annual review. Not an official NYCHA form.')
  page.section('Part A. Tenant identification')
  page.fields([
    ['Development', household.development],
    ['Borough', household.borough],
    ['Name', household.name],
    ['Head of Household', household.name],
    ['Case Number', household.caseNumber],
    ['Account Number', household.caseNumber],
    ['Address', '100 Sample Court'],
  ])
  page.continuation('Apartment 4B')
  page.continuation('Brooklyn, NY 11201')
  page.fields([
    ['Telephone', household.phone],
    ['Household Size', household.size],
    ['Recertification Period', household.period],
    ['Income', household.income],
    ['Document Date', household.date],
  ])
  page.section('Part B. Household composition')
  page.table(['Member', 'Relation', 'Date of Birth'], members)
  page.note('List every person who lives in the apartment. Dates of birth are fictional.')

  const next = sheet(document, face, 'Annual Recertification of Family Income and Composition')
  next.note('Page 2 of the fictional recertification sample.')
  next.section('Part C. Household questions')
  next.fields([
    ['Full-Time Student', 'No'],
    ['Expected Family Changes', 'None reported'],
    ['Absent Household Members', 'None'],
    ['Live-in Aide', 'No'],
  ])
  next.section('Part D. Certification')
  next.paragraph(
    'The head of household states that the people and dollar amounts in this sample are fictional answers for testing a document reader. This page is not an official New York City Housing Authority affidavit.',
  )
  next.fields([
    ['Printed Name', household.name],
    ['Signed Date', household.date],
    ['Document Date', household.date],
  ])
  next.signatureLine()
}

function drawAffidavit(document, face) {
  const page = sheet(document, face, 'Affidavit of Income')
  page.note('Fictional income statement for the same sample household. Not an official NYCHA form.')
  page.section('Part A. Tenant identification')
  page.fields([
    ['Name', household.name],
    ['Head of Household', household.name],
    ['Case Number', household.caseNumber],
    ['Account Number', household.caseNumber],
    ['Address', '100 Sample Court'],
  ])
  page.continuation('Apartment 4B')
  page.continuation('Brooklyn, NY 11201')
  page.field('Borough', household.borough)
  page.section('Part B. Wages')
  page.fields([
    ['Employer', 'Harbor Kitchen LLC'],
    ['Employer Address', '140 Test Wharf, Brooklyn, NY 11231'],
    ['Gross Wages', '$2,840.00'],
    ['Pay Frequency', 'Monthly'],
  ])
  page.section('Part C. Benefits and other income')
  page.fields([
    ['SSI Amount', '$420.00'],
    ['Public Assistance', 'None'],
    ['Child Support', '$0.00'],
    ['Other Income', '$0.00'],
    ['Income', household.income],
    ['Total Household Income', household.income],
    ['Document Date', household.date],
  ])
  page.paragraph(
    'Wages are the monthly amount before taxes. SSI is listed for Elena Santos. Add the wage and benefit lines to reach the household total.',
  )
}

function drawApplication(document, face) {
  const page = sheet(document, face, 'Application for Public Housing', {
    subtitle: 'Inbound application sample',
  })
  page.note('Fictional housing application for extractor testing. Not an official NYCHA form.')
  page.section('Part A. Applicant')
  page.fields([
    ['Name', 'David Chen'],
    ['Application Number', 'APP-22091'],
    ['Case Number', 'APP-22091'],
    ['Telephone', '347-555-0194'],
    ['Address', '42 Maple Avenue'],
  ])
  page.continuation('Apartment 2C')
  page.continuation('Queens, NY 11354')
  page.fields([
    ['Borough', 'Queens'],
    ['Household Size', '2'],
    ['Income', '$2,910.00'],
    ['Document Date', 'October 2, 2026'],
  ])
  page.section('Part B. Household')
  page.table(
    ['Member', 'Relation', 'Date of Birth'],
    [
      ['David Chen', 'Head of Household', 'March 8, 1991'],
      ['Grace Chen', 'Spouse', 'July 22, 1993'],
    ],
  )
  page.fields([
    ['Preferred Development', 'Sample Houses'],
    ['Need Accessible Unit', 'No'],
  ])
}

function drawHouseholdChange(document, face) {
  const page = sheet(document, face, 'Request to Change Household Composition', {
    subtitle: 'Inbound household change sample',
  })
  page.note('Fictional request to add a household member. Not an official NYCHA form.')
  page.section('Part A. Tenant identification')
  page.fields([
    ['Name', household.name],
    ['Case Number', household.caseNumber],
    ['Account Number', household.caseNumber],
    ['Development', household.development],
    ['Address', '100 Sample Court'],
  ])
  page.continuation('Apartment 4B')
  page.continuation('Brooklyn, NY 11201')
  page.section('Part B. Request')
  page.fields([
    ['Request Type', 'Add household member'],
    ['Member Name', 'Ana Ruiz'],
    ['Relation', 'Sister'],
    ['Date of Birth', 'August 9, 1990'],
    ['Household Size', '4'],
    ['Document Date', 'October 21, 2026'],
  ])
  page.paragraph(
    'The head of household asks to add Ana Ruiz to the lease. Dates and names are fictional and are for testing the document reader only.',
  )
}

function drawVendorInvoice(document, face) {
  const page = sheet(document, face, 'Vendor Invoice', {
    banner: 'SAMPLE ONLY  -  NOT AN OFFICIAL INVOICE',
    subtitle: 'Inbound vendor paperwork sample',
  })
  page.note('Fictional contractor invoice for extractor testing. Not a real bill.')
  page.section('Part A. Vendor')
  page.fields([
    ['Vendor Name', 'North Line Maintenance Inc'],
    ['Vendor Address', '88 Service Road, Bronx, NY 10451'],
    ['Telephone', '718-555-0170'],
  ])
  page.section('Part B. Invoice')
  page.fields([
    ['Invoice Number', 'INV-88421'],
    ['Purchase Order', 'PO-11038'],
    ['Invoice Date', 'October 6, 2026'],
    ['Development', 'Sample Houses'],
    ['Invoice Amount', '$4,875.00'],
    ['Document Date', 'October 6, 2026'],
  ])
  page.section('Part C. Work described')
  page.paragraph(
    'Repair of common-area lighting on floors 2 through 4. Labor and materials are listed as one amount on this sample.',
  )
}

function drawPayStatement(document, face) {
  const page = sheet(document, face, 'Earnings Statement', {
    banner: 'SAMPLE ONLY  -  NOT A REAL PAY STUB',
    subtitle: 'Inbound income proof sample',
  })
  page.note('Fictional pay statement for Maria Santos. Not an official payroll document.')
  page.section('Part A. Employee')
  page.fields([
    ['Name', household.name],
    ['Case Number', household.caseNumber],
    ['Employer', 'Harbor Kitchen LLC'],
    ['Address', '100 Sample Court'],
  ])
  page.continuation('Apartment 4B')
  page.continuation('Brooklyn, NY 11201')
  page.section('Part B. Pay')
  page.fields([
    ['Pay Period', 'September 1, 2026 to September 30, 2026'],
    ['Gross Wages', '$2,840.00'],
    ['Net Pay', '$2,210.00'],
    ['Income', '$2,840.00'],
    ['Document Date', 'October 1, 2026'],
  ])
  page.paragraph('Gross wages are the monthly amount before taxes. Use this sample to show income proof, not a recertification form.')
}

function drawAssets(document, face) {
  const page = sheet(document, face, 'Declaration of Assets')
  page.note('Fictional asset list for the same sample household. Not an official NYCHA form.')
  page.section('Part A. Tenant identification')
  page.fields([
    ['Name', household.name],
    ['Head of Household', household.name],
    ['Case Number', household.caseNumber],
    ['Account Number', household.caseNumber],
    ['Address', '100 Sample Court'],
  ])
  page.continuation('Apartment 4B')
  page.continuation('Brooklyn, NY 11201')
  page.field('Borough', household.borough)
  page.section('Part B. Bank accounts')
  page.fields([
    ['Bank Name', 'Metro Community Bank'],
    ['Account Type', 'Checking'],
    ['Balance', '$1,180.00'],
    ['Savings Bank', 'Metro Community Bank'],
    ['Savings Balance', '$640.00'],
  ])
  page.section('Part C. Other property')
  page.fields([
    ['Real Property', 'None'],
    ['Stocks or Bonds', 'None'],
    ['Document Date', household.date],
  ])
  page.paragraph(
    'Balances are fictional and are not a complete financial record. Retirement accounts and cash on hand are not listed on this sample.',
  )
}

function sheet(document, face, title, options = {}) {
  const page = document.addPage([612, 792])
  page.drawRectangle({ x: 0, y: 748, width: 612, height: 44, color: navy })
  page.drawText(options.banner ?? 'SAMPLE ONLY  -  NOT AN OFFICIAL NYCHA FORM', {
    x: 36,
    y: 766,
    size: 11,
    font: face.bold,
    color: white,
  })
  page.drawText(options.subtitle ?? 'Public housing annual review', {
    x: 36,
    y: 718,
    size: 9,
    font: face.bold,
    color: navy,
  })
  page.drawText(title, {
    x: 36,
    y: 696,
    size: 15,
    font: face.bold,
    color: ink,
  })
  page.drawLine({
    start: { x: 36, y: 686 },
    end: { x: 576, y: 686 },
    thickness: 1,
    color: navy,
  })
  page.drawText('Fictional tenant data for extractor testing', {
    x: 36,
    y: 28,
    size: 8,
    font: face.regular,
    color: muted,
  })

  return new Sheet(page, face, 668)
}

class Sheet {
  constructor(page, face, y) {
    this.page = page
    this.face = face
    this.y = y
  }

  note(text) {
    this.page.drawText(text, {
      x: 36,
      y: this.y,
      size: 9,
      font: this.face.regular,
      color: muted,
    })
    this.y -= 22
  }

  section(text) {
    this.y -= 6
    this.page.drawRectangle({
      x: 36,
      y: this.y - 6,
      width: 540,
      height: 20,
      color: wash,
    })
    this.page.drawText(text, {
      x: 44,
      y: this.y,
      size: 10,
      font: this.face.bold,
      color: navy,
    })
    this.y -= 28
  }

  fields(rows) {
    for (const [label, value] of rows) this.field(label, value)
  }

  field(label, value) {
    const labelWidth = this.face.bold.widthOfTextAtSize(`${label}:`, 11)
    if (44 + labelWidth > 242) {
      throw new Error(`Label is too wide for the value column: ${label}`)
    }
    this.page.drawText(`${label}:`, {
      x: 44,
      y: this.y,
      size: 11,
      font: this.face.bold,
      color: ink,
    })
    this.page.drawText(value, {
      x: 250,
      y: this.y,
      size: 11,
      font: this.face.regular,
      color: ink,
    })
    this.y -= 18
  }

  continuation(text) {
    this.page.drawText(text, {
      x: 250,
      y: this.y,
      size: 11,
      font: this.face.regular,
      color: ink,
    })
    this.y -= 18
  }

  table(headers, rows) {
    const columns = [44, 250, 420]
    this.page.drawRectangle({
      x: 36,
      y: this.y - 8 - rows.length * 20,
      width: 540,
      height: 22 + rows.length * 20,
      borderColor: rule,
      borderWidth: 1,
    })
    headers.forEach((header, index) => {
      this.page.drawText(header, {
        x: columns[index],
        y: this.y,
        size: 9,
        font: this.face.bold,
        color: muted,
      })
    })
    this.y -= 18
    for (const row of rows) {
      row.forEach((cell, index) => {
        this.page.drawText(cell, {
          x: columns[index],
          y: this.y,
          size: 11,
          font: this.face.regular,
          color: ink,
        })
      })
      this.y -= 20
    }
    this.y -= 8
  }

  paragraph(text) {
    const words = text.split(' ')
    let line = ''
    const lines = []
    for (const word of words) {
      const next = line ? `${line} ${word}` : word
      if (this.face.regular.widthOfTextAtSize(next, 10) > 520) {
        lines.push(line)
        line = word
      } else {
        line = next
      }
    }
    if (line) lines.push(line)
    for (const row of lines) {
      this.page.drawText(row, {
        x: 44,
        y: this.y,
        size: 10,
        font: this.face.regular,
        color: ink,
      })
      this.y -= 14
    }
    this.y -= 8
  }

  signatureLine() {
    this.y -= 12
    this.page.drawText('Signature:', {
      x: 44,
      y: this.y,
      size: 11,
      font: this.face.bold,
      color: ink,
    })
    this.page.drawLine({
      start: { x: 250, y: this.y },
      end: { x: 460, y: this.y },
      thickness: 0.8,
      color: ink,
    })
  }
}

drawAnnual(annual, fonts)
drawAffidavit(affidavit, {
  regular: await affidavit.embedFont(StandardFonts.Helvetica),
  bold: await affidavit.embedFont(StandardFonts.HelveticaBold),
})
drawAssets(assets, {
  regular: await assets.embedFont(StandardFonts.Helvetica),
  bold: await assets.embedFont(StandardFonts.HelveticaBold),
})

const application = await PDFDocument.create()
const householdChange = await PDFDocument.create()
const invoice = await PDFDocument.create()
const payStatement = await PDFDocument.create()
setMeta(application, 'Sample housing application')
setMeta(householdChange, 'Sample household change request')
setMeta(invoice, 'Sample vendor invoice')
setMeta(payStatement, 'Sample earnings statement')
drawApplication(application, {
  regular: await application.embedFont(StandardFonts.Helvetica),
  bold: await application.embedFont(StandardFonts.HelveticaBold),
})
drawHouseholdChange(householdChange, {
  regular: await householdChange.embedFont(StandardFonts.Helvetica),
  bold: await householdChange.embedFont(StandardFonts.HelveticaBold),
})
drawVendorInvoice(invoice, {
  regular: await invoice.embedFont(StandardFonts.Helvetica),
  bold: await invoice.embedFont(StandardFonts.HelveticaBold),
})
drawPayStatement(payStatement, {
  regular: await payStatement.embedFont(StandardFonts.Helvetica),
  bold: await payStatement.embedFont(StandardFonts.HelveticaBold),
})

await writeFile(new URL('nycha-annual-recertification.pdf', outDir), await annual.save())
await writeFile(new URL('nycha-affidavit-of-income.pdf', outDir), await affidavit.save())
await writeFile(new URL('nycha-asset-declaration.pdf', outDir), await assets.save())
await writeFile(new URL('housing-application.pdf', outDir), await application.save())
await writeFile(new URL('household-change-request.pdf', outDir), await householdChange.save())
await writeFile(new URL('vendor-invoice.pdf', outDir), await invoice.save())
await writeFile(new URL('earnings-statement.pdf', outDir), await payStatement.save())
