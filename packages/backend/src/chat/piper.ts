import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { Server } from 'socket.io';
import { getIO } from '../socket/index.js';
import { FastifyInstance } from 'fastify';
import extractZip from 'extract-zip';
import crypto from 'crypto';
import os from 'os';

// Config
const PIPER_WIN_URL = 'https://github.com/rhasspy/piper/releases/download/2023.11.14-2/piper_windows_amd64.zip';

const MODELS: Record<string, { onnx: string, json: string }> = {
  es: {
    onnx: 'https://huggingface.co/rhasspy/piper-voices/resolve/main/es/es_ES/davefx/medium/es_ES-davefx-medium.onnx',
    json: 'https://huggingface.co/rhasspy/piper-voices/resolve/main/es/es_ES/davefx/medium/es_ES-davefx-medium.onnx.json'
  },
  en: {
    onnx: 'https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/ryan/high/en_US-ryan-high.onnx',
    json: 'https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/ryan/high/en_US-ryan-high.onnx.json'
  }
};

const DATA_DIR = process.env.DATA_DIR || path.resolve(process.cwd(), 'data');
const PIPER_DIR = path.join(DATA_DIR, 'piper');
const PIPER_EXE = path.join(PIPER_DIR, 'piper', 'piper.exe');

const downloadPromises: Record<string, Promise<void> | null> = {};

async function downloadFile(url: string, dest: string, io?: Server, stageName?: string) {
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`Failed to download ${url}: ${res.statusText}`);
  
  const totalBytes = parseInt(res.headers.get('content-length') || '0', 10);
  let downloaded = 0;
  
  const fileStream = fs.createWriteStream(dest);
  
  // Use Readable stream iteration (node 18+)
  for await (const chunk of res.body as any) {
    downloaded += chunk.length;
    fileStream.write(chunk);
    
    if (io && totalBytes > 0) {
      const percent = Math.round((downloaded / totalBytes) * 100);
      io.emit('tts:piper-download-progress', { stage: stageName, percent });
    }
  }
  
  fileStream.end();
  
  return new Promise<void>((resolve, reject) => {
    fileStream.on('finish', resolve);
    fileStream.on('error', reject);
  });
}

export async function downloadPiperIfNeeded(lang: 'es' | 'en' = 'es', io?: Server): Promise<void> {
  const downloadKey = `piper_${lang}`;
  if (downloadPromises[downloadKey]) return downloadPromises[downloadKey];
  
  downloadPromises[downloadKey] = (async () => {
    if (!fs.existsSync(PIPER_DIR)) {
      fs.mkdirSync(PIPER_DIR, { recursive: true });
    }

    const modelPath = path.join(PIPER_DIR, `${lang}_v2.onnx`);
    const configPath = path.join(PIPER_DIR, `${lang}_v2.onnx.json`);

    const hasPiper = fs.existsSync(PIPER_EXE);
    const hasModel = fs.existsSync(modelPath) && fs.existsSync(configPath);

    if (hasPiper && hasModel) {
      if (io) io.emit('tts:piper-download-progress', { stage: 'done', percent: 100 });
      return;
    }

    if (!hasPiper) {
      const zipPath = path.join(PIPER_DIR, 'piper.zip');
      console.log('[Piper] Downloading Piper binary...');
      await downloadFile(PIPER_WIN_URL, zipPath, io, 'piper');
      
      if (io) io.emit('tts:piper-download-progress', { stage: 'extracting', percent: 0 });
      console.log('[Piper] Extracting...');
      await extractZip(zipPath, { dir: PIPER_DIR });
      fs.unlinkSync(zipPath);
    }

    if (!hasModel) {
      console.log(`[Piper] Downloading model for ${lang}...`);
      await downloadFile(MODELS[lang].onnx, modelPath, io, `model_${lang}`);
      await downloadFile(MODELS[lang].json, configPath, io, `model_${lang}`);
    }

    if (io) io.emit('tts:piper-download-progress', { stage: 'done', percent: 100 });
    console.log(`[Piper] Ready (lang: ${lang}).`);
  })();
  
  try {
    await downloadPromises[downloadKey];
  } finally {
    downloadPromises[downloadKey] = null;
  }
}

export async function generateAudio(text: string, lang: 'es' | 'en' = 'es'): Promise<Buffer> {
  await downloadPiperIfNeeded(lang);
  const modelPath = path.join(PIPER_DIR, `${lang}_v2.onnx`);
  
  const tempFileName = path.join(os.tmpdir(), `piper_${crypto.randomUUID()}.wav`);
  
  return new Promise((resolve, reject) => {
    const piper = spawn(PIPER_EXE, [
      '-m', modelPath,
      '-f', tempFileName
    ]);
    
    piper.stderr.on('data', (err) => {
      // debug logs
    });
    
    piper.on('close', (code) => {
      if (code !== 0) {
        if (fs.existsSync(tempFileName)) fs.unlinkSync(tempFileName);
        return reject(new Error(`Piper exited with code ${code}`));
      }
      
      try {
        const audioBuffer = fs.readFileSync(tempFileName);
        fs.unlinkSync(tempFileName);
        resolve(audioBuffer);
      } catch (err) {
        if (fs.existsSync(tempFileName)) fs.unlinkSync(tempFileName);
        reject(err);
      }
    });
    
    // piper reads from stdin
    piper.stdin.write(text + '\n');
    piper.stdin.end();
  });
}

export function setupPiper(app: FastifyInstance) {
  app.get('/api/tts/piper', async (req, reply) => {
    const query = req.query as { text?: string; lang?: 'es' | 'en' };
    if (!query.text) {
      return reply.status(400).send({ error: 'Missing text parameter' });
    }
    
    const lang = query.lang === 'en' ? 'en' : 'es';
    
    try {
      const io = getIO();
      await downloadPiperIfNeeded(lang, io);
      const audioBuffer = await generateAudio(query.text, lang);
      
      reply.header('Content-Type', 'audio/wav');
      return reply.send(audioBuffer);
    } catch (err: any) {
      console.error('[Piper TTS] Error:', err);
      return reply.status(500).send({ error: 'TTS Generation Failed', details: err.message });
    }
  });
}
