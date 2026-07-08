import { createWorker } from 'tesseract.js'
import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url'
import { parseTryoutsOcrText } from './importers.js'

const OCR_LANGUAGE = 'eng'
const PDF_RENDER_SCALE = 2.4

const localLangPath = () => {
  if (typeof window === 'undefined') return './public/tessdata'
  const base = import.meta.env.BASE_URL || '/'
  return `${window.location.origin}${base.replace(/\/?$/, '/')}tessdata`
}

async function createOcrWorker(onProgress) {
  const worker = await createWorker(OCR_LANGUAGE, undefined, {
    langPath: localLangPath(),
    logger: (message) => {
      if (!message?.status) return
      onProgress?.({
        status: message.status,
        progress: Number.isFinite(message.progress) ? Math.round(message.progress * 100) : null,
      })
    },
  })
  await worker.setParameters({
    preserve_interword_spaces: '1',
    tessedit_pageseg_mode: '6',
  })
  return worker
}

async function recognizeWithWorker(worker, image) {
  const result = await worker.recognize(image)
  return {
    text: result.data.text,
    confidence: Math.round(result.data.confidence || 0),
  }
}

export async function parseTryoutsImageFile(file, onProgress) {
  const worker = await createOcrWorker(onProgress)

  try {
    const result = await recognizeWithWorker(worker, file)
    return {
      ...parseTryoutsOcrText(result.text),
      rawText: result.text,
      confidence: result.confidence,
    }
  } finally {
    await worker.terminate()
  }
}

function groupTextItemsByLine(items) {
  const lineMap = new Map()
  items
    .filter((item) => String(item.str || '').trim())
    .forEach((item) => {
      const [, , , , x, y] = item.transform
      const lineKey = Math.round(y / 4) * 4
      const current = lineMap.get(lineKey) || []
      current.push({ x, text: item.str })
      lineMap.set(lineKey, current)
    })

  return Array.from(lineMap.entries())
    .sort(([a], [b]) => b - a)
    .map(([, line]) => line.sort((a, b) => a.x - b.x).map(({ text }) => text).join(' '))
}

async function extractPdfText(pdf, onProgress) {
  const pages = []
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    onProgress?.({ status: `leyendo texto PDF página ${pageNumber}/${pdf.numPages}`, progress: null })
    const page = await pdf.getPage(pageNumber)
    const content = await page.getTextContent()
    pages.push(...groupTextItemsByLine(content.items))
  }
  return pages.join('\n')
}

async function renderPdfPageToBlob(page) {
  const viewport = page.getViewport({ scale: PDF_RENDER_SCALE })
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d', { willReadFrequently: true })
  canvas.width = Math.ceil(viewport.width)
  canvas.height = Math.ceil(viewport.height)
  await page.render({ canvasContext: context, viewport }).promise
  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob((value) => {
      if (value) resolve(value)
      else reject(new Error('No se pudo convertir la página del PDF en imagen.'))
    }, 'image/png')
  })
  canvas.width = 0
  canvas.height = 0
  return blob
}

export async function parseTryoutsPdfFile(file, onProgress) {
  if (typeof document === 'undefined') throw new Error('La lectura de PDF necesita ejecutarse en el navegador.')
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

  const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise
  const textFromPdf = await extractPdfText(pdf, onProgress)
  const parsedFromText = parseTryoutsOcrText(textFromPdf)
  if (parsedFromText.campers.length) {
    return {
      ...parsedFromText,
      rawText: textFromPdf,
      confidence: 100,
      pages: pdf.numPages,
      source: 'pdf-text',
    }
  }

  const worker = await createOcrWorker(onProgress)
  const pageTexts = []
  const confidences = []
  try {
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      onProgress?.({ status: `preparando página ${pageNumber}/${pdf.numPages} para OCR`, progress: null })
      const page = await pdf.getPage(pageNumber)
      const pageImage = await renderPdfPageToBlob(page)
      onProgress?.({ status: `leyendo OCR página ${pageNumber}/${pdf.numPages}`, progress: null })
      const result = await recognizeWithWorker(worker, pageImage)
      pageTexts.push(result.text)
      confidences.push(result.confidence)
    }
  } finally {
    await worker.terminate()
  }

  const rawText = pageTexts.join('\n')
  return {
    ...parseTryoutsOcrText(rawText),
    rawText,
    confidence: confidences.length ? Math.round(confidences.reduce((total, value) => total + value, 0) / confidences.length) : 0,
    pages: pdf.numPages,
    source: 'pdf-ocr',
  }
}
