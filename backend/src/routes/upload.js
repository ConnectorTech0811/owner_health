const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const zlib = require('zlib');
const db = require('../../knexfile');

let pdfParse;
try {
  pdfParse = require('pdf-parse');
} catch (e) {
  console.warn('pdf-parse não foi carregado:', e.message);
}

const uploadsDir = process.env.VERCEL ? '/tmp' : path.join(__dirname, '../../uploads');
try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
} catch (e) {
  console.warn('Aviso: Não foi possível criar pasta de uploads:', e.message);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({ storage, limits: { fileSize: 25 * 1024 * 1024 } });

function decodePdfHex(hexStr) {
  let result = '';
  const pairs = hexStr.match(/.{1,4}/g) || [];
  for (const pair of pairs) {
    const code = parseInt(pair, 16);
    if (code >= 32 && code <= 126) {
      result += String.fromCharCode(code);
    } else if (code === 10 || code === 13 || code === 32) {
      result += ' ';
    }
  }
  return result.trim();
}

async function extractPdfText(dataBuffer) {
  let text = '';

  // 1. Tenta pdf-parse com suporte a v1 e v2 (PDFParse class)
  if (pdfParse) {
    try {
      if (typeof pdfParse === 'function') {
        const pdfData = await pdfParse(dataBuffer);
        if (pdfData && pdfData.text) text = pdfData.text;
      } else if (pdfParse.PDFParse) {
        const uint8 = new Uint8Array(dataBuffer);
        const parser = new pdfParse.PDFParse(uint8);
        const data = await parser.getText();
        if (data && data.text) text = data.text;
      }
    } catch (err) {
      console.warn('pdf-parse notice:', err.message);
    }
  }

  // Limpa marcadores de página do pdf-parse como '-- 1 of 1 --'
  if (text) {
    text = text.replace(/--\s*\d+\s*of\s*\d+\s*--/gi, '')
              .replace(/\r\n/g, '\n')
              .replace(/[ \t]+/g, ' ')
              .trim();
  }

  // 2. Fallback: Descompacta streams FlateDecode e extrai apenas texto imprimível válido
  if (!text || text.length < 2) {
    try {
      const bufferStr = dataBuffer.toString('binary');
      const streamRegex = /stream[\r\n]+([\s\S]*?)endstream/g;
      let match;
      const foundTexts = [];

      while ((match = streamRegex.exec(bufferStr)) !== null) {
        const rawStream = Buffer.from(match[1], 'binary');
        let uncompressed = '';
        try {
          uncompressed = zlib.inflateSync(rawStream).toString('utf-8');
        } catch {
          continue;
        }

        if (uncompressed) {
          const literalMatches = uncompressed.match(/\(([^()]{2,100})\)/g) || [];
          for (const m of literalMatches) {
            const inner = m.slice(1, -1).trim();
            if (/^[a-zA-Z0-9ÁÉÍÓÚáéíóúÀàÃãÕõÇç\s\-_:;,.()]{2,100}$/.test(inner)) {
              if (!inner.includes('Font') && !inner.includes('Identity') && !inner.includes('Adobe') && !inner.includes('ProcSet')) {
                foundTexts.push(inner);
              }
            }
          }
        }
      }

      if (foundTexts.length > 0) {
        text = Array.from(new Set(foundTexts)).join(' ');
      }
    } catch (e) {
      console.warn('Fallback stream extraction notice:', e.message);
    }
  }

  // Garante a remoção de qualquer caractere binário não imprimível
  return text.replace(/[^\x20-\x7E\x0A\x0D\xC0-\xFF]/g, ' ').replace(/\s+/g, ' ').trim();
}

function analyzeMedicalDocument(text, fileName = '') {
  const fullContent = (fileName + ' ' + text).toLowerCase();
  const warnings = [];

  let tipo = '';
  if (fullContent.includes('hemograma')) tipo = 'Hemograma Completo';
  else if (fullContent.includes('glicem') || fullContent.includes('glicose')) tipo = 'Glicemia em Jejum';
  else if (fullContent.includes('colesterol') || fullContent.includes('lipid')) tipo = 'Perfil Lipídico';
  else if (fullContent.includes('urina') || fullContent.includes('eas')) tipo = 'Ureia e Creatinina';
  else if (fullContent.includes('raio-x') || fullContent.includes('raio x') || fullContent.includes('radiograf')) tipo = 'Raio-X';
  else if (fullContent.includes('eletro') || fullContent.includes('ecg')) tipo = 'Eletrocardiograma';
  else if (fullContent.includes('ultrasson')) tipo = 'Ultrassonografia';
  else if (text.trim().length > 0) tipo = 'Outro';

  let data = '';
  const dateMatch = text.match(/(\d{2})[\/.-](\d{2})[\/.-](\d{4})/);
  if (dateMatch) {
    const [_, d, m, y] = dateMatch;
    data = `${y}-${m}-${d}`;
  }

  let laboratorio = '';
  const labMatch = text.match(/(?:laborat[óo]rio|lab|cl[íi]nica)\s*:?\s*([A-Za-z0-9ÁÉÍÓÚáéíóú\s]{3,30})/i);
  if (labMatch) laboratorio = labMatch[1].trim();

  let medico = '';
  const medMatch = text.match(/(?:dr\.?|dra\.?|m[ée]dico\s*solicitante)\s*:?\s*([A-Za-z0-9ÁÉÍÓÚáéíóú\s]{3,30})/i);
  if (medMatch) medico = medMatch[1].trim();

  if (!text || text.trim().length < 2) {
    warnings.push('⚠️ Nenhuma camada de texto pesquisável foi encontrada no arquivo. Certifique-se de que o documento não é uma foto sem OCR.');
  } else {
    if (!laboratorio) warnings.push('ℹ️ Nome do Laboratório não foi identificado automaticamente no documento.');
    if (!medico) warnings.push('ℹ️ Nome do Médico Solicitante não foi identificado automaticamente no documento.');
    if (!data) warnings.push('ℹ️ Data do Exame não foi identificada automaticamente no documento.');
  }

  return { tipo, data, laboratorio, medico_solicitante: medico, laudo: text.trim(), warnings };
}

// Endpoint GET para download/servimento resiliente de arquivo via DB MySQL
router.get('/file/:filename', async (req, res) => {
  const { filename } = req.params;
  const localFile = path.join(uploadsDir, filename);

  if (fs.existsSync(localFile)) {
    return res.sendFile(localFile);
  }

  try {
    const record = await db('arquivos_upload').where({ filename }).first();
    if (record && record.conteudo_base64) {
      const buffer = Buffer.from(record.conteudo_base64, 'base64');
      res.type(record.mimetype || 'application/octet-stream');
      return res.send(buffer);
    }
  } catch (err) {
    console.error('Erro ao buscar arquivo do MySQL:', err.message);
  }

  return res.status(404).json({ error: 'Arquivo não encontrado' });
});

router.post('/', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado' });
  }

  const fileUrl = `/api/upload/file/${req.file.filename}`;
  const filePath = req.file.path;
  const isPdf = req.file.mimetype === 'application/pdf' || req.file.originalname.toLowerCase().endsWith('.pdf');
  
  let extractedText = '';
  let dataBuffer;

  try {
    dataBuffer = fs.readFileSync(filePath);

    if (isPdf) {
      extractedText = await extractPdfText(dataBuffer);
    } else {
      const strContent = dataBuffer.toString('utf-8');
      const cleanText = strContent.replace(/[^\x20-\x7E\x0A\x0D\xC0-\xFF]/g, ' ').replace(/\s+/g, ' ').trim();
      if (cleanText.length > 3) {
        extractedText = cleanText.slice(0, 5000);
      }
    }
  } catch (e) {
    console.error('Aviso na leitura do arquivo:', e.message);
  }

  const cleanText = extractedText && extractedText.trim().length > 0 ? extractedText.trim() : '';
  const analysis = analyzeMedicalDocument(cleanText, req.file.originalname);

  // Armazena Base64 no MySQL para persistência completa
  let base64Content = null;
  if (dataBuffer && dataBuffer.length < 20 * 1024 * 1024) {
    base64Content = dataBuffer.toString('base64');
  }

  let uploadId = null;
  try {
    const [inserted] = await db('arquivos_upload').insert({
      filename: req.file.filename,
      original_name: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      url: fileUrl,
      texto_extraido: cleanText,
      conteudo_base64: base64Content,
      criado_em: new Date().toISOString()
    });
    uploadId = inserted;
  } catch (dbErr) {
    console.error('Erro ao gravar arquivo no MySQL:', dbErr.message);
  }

  return res.json({
    id: uploadId,
    url: fileUrl,
    filename: req.file.filename,
    original_name: req.file.originalname,
    mimetype: req.file.mimetype,
    size: req.file.size,
    extractedText: cleanText,
    analysis
  });
});

module.exports = router;
