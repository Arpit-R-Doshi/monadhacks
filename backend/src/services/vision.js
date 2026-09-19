import { createWorker } from 'tesseract.js';
import { Jimp } from 'jimp';

/**
 * Acts as the OpenCV processing layer before handing off to the LLM.
 * Processes the image to improve contrast/readability, then extracts 
 * the text information via OCR to be fed into language models like Gemma/Llama.
 * 
 * @param {string} base64Image - The raw base64 uploaded from frontend
 * @returns {Promise<string>} The extracted information
 */
export async function processImageAndExtractText(base64Image) {
  try {
    // 1. Clean base64 string
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    
    // 2. Preprocess with Jimp (OpenCV-like operations tailored for OCR)
    const image = await Jimp.read(buffer);
    
    // Convert to grayscale and increase contrast to help OCR recognition
    image.greyscale().contrast(0.2);
    
    const processedBuffer = await image.getBuffer('image/png');
    
    // 3. Extract information using Tesseract.js
    const worker = await createWorker('eng');
    const { data: { text } } = await worker.recognize(processedBuffer);
    await worker.terminate();
    
    return text.trim();
  } catch (err) {
    console.error('[Vision Service] Error:', err);
    throw new Error('Failed to process image layer: ' + err.message);
  }
}
