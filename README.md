# PDF field extractor

A React app that reads a PDF in the browser, lets you define the fields to pull out, and shows the result as JSON. No document is uploaded to a server.

Published site: https://divyarpanicker26.github.io/pdf-scanner/

## Use it

1. Drop a PDF on the page, or open the sample form.
2. Edit the field list. Each row is one JSON key.
3. The value is the text after a label such as `Case Number:`.
4. Use **Override value** to type a different value than the PDF.
5. Turn on **Continue on the next lines** for values such as a street address.
6. Copy or download the JSON.

Suggested fields are name, case number, address, income, and document date. Your edits are saved in this browser.

Text PDFs are read from the text layer. A page with almost no text is passed through English OCR in the browser. The first OCR run downloads language data.

## Scripts

GitHub Pages serves the built site from the `gh-pages` branch.

```bash
npm install
npm run dev
npm test
npm run build
npm run deploy
```

`npm run deploy` builds the app and publishes `dist`. The live site is https://divyarpanicker26.github.io/pdf-scanner/
