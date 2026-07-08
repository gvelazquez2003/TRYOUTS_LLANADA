import { createWorker } from 'tesseract.js'
import { parseTryoutsOcrText } from './importers.js'

const OCR_LANGUAGE = 'eng'
const localLangPath = () => {
  if (typeof window === 'undefined') return './public/tessdata'
  const base = import.meta.env.BASE_URL || '/'
  return `${window.location.origin}${base.replace(/\/?$/, '/')}tessdata`
}

export async function parseTryoutsImageFile(file, onProgress) {
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

  try {
    await worker.setParameters({
      preserve_interword_spaces: '1',
      tessedit_pageseg_mode: '6',
    })
    const result = await worker.recognize(file)
    return {
      ...parseTryoutsOcrText(result.data.text),
      rawText: result.data.text,
      confidence: Math.round(result.data.confidence || 0),
    }
  } finally {
    await worker.terminate()
  }
}
