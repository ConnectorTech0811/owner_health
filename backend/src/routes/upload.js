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
  if (pdfParse) {
    try {
      const pdfData = await pdfParse(dataBuffer);
      if (pdfData && pdfData.text && pdfData.text.trim().length > 0) {
        text = pdfData.text.replace(/\s+/g, ' ').trim();
      }
    } catch (err) {
      console.warn('pdfParse notice:', err.message);
    }
  }

  if (!text || text.length < 3) {
    try {
      const bufferStr = dataBuffer.toString('binary');
      const streamRegex = /stream[\r\n]+([\s\S]*?)endstream/g;
      let match;
      const foundTexts = [];

      while ((match = streamRegex.exec(bufferStr)) !== null) {
        const streamData = Buffer.from(match[1], 'binary');
        let uncompressed = '';
        try {
          uncompressed = zlib.inflateSync(streamData).toString('utf-8');
        } catch {
          uncompressed = streamData.toString('binary');
        }

        // Match hex strings <005400450053...>
        const hexRegex = /<([0-9A-Fa-f]{8,})>/g;
        let hm;
        while ((hm = hexRegex.exec(uncompressed)) !== null) {
          const decoded = decodePdfHex(hm[1]);
          if (decoded && decoded.length >= 2 && !decoded.includes('Identity') && !decoded.includes('Font')) {
            foundTexts.push(decoded);
          }
        }

        // Match literal strings (text)
        const literalRegex = /\(([a-zA-Z0-9\sÁÉÍÓÚáéíóúÀàÃãÕõÇç\-:,.]{2,})\)/g;
        let tm;
        while ((tm = literalRegex.exec(uncompressed)) !== null) {
          const str = tm[1].trim();
          if (str && !str.includes('Identity') && !str.includes('Font') && !str.includes('Adobe') && !str.includes('Microsoft')) {
            foundTexts.push(str);
          }
        }
      }

      if (foundTexts.length > 0) {
        text = Array.from(new Set(foundTexts)).join(' ');
      }
    } catch (e) {
      console.warn('Stream extraction notice:', e.message);
    }
  }

  return text.trim();
}

router.post('/', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado' });
  }

  const fileUrl = `/uploads/${req.file.filename}`;
  const filePath = req.file.path;
  const isPdf = req.file.mimetype === 'application/pdf' || req.file.originalname.toLowerCase().endsWith('.pdf');
  
  let extractedText = '';

  try {
    const dataBuffer = fs.readFileSync(filePath);

    if (isPdf) {
      extractedText = await extractPdfText(dataBuffer);
    } else {
      const strContent = dataBuffer.toString('utf-8');
      const cleanText = strContent.replace(/[^\x20-\x7E\x0A\x0D\xC0-\xFF]/g, ' ').replace(/\s+/g, ' ').trim();
      if (cleanText.length > 5) {
        extractedText = cleanText.slice(0, 3000);
      }
    }
  } catch (e) {
    console.error('Aviso na leitura do arquivo:', e.message);
  }

  const finalExtracted = extractedText && extractedText.length > 0
    ? extractedText
    : `DOCUMENTO DIGITALIZADO (${req.file.originalname}): O arquivo foi anexado com sucesso.`;

  // Grava permanentemente na tabela arquivos_upload do MySQL
  let uploadId = null;
  try {
    const [inserted] = await db('arquivos_upload').insert({
      filename: req.file.filename,
      original_name: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      url: fileUrl,
      texto_extraido: finalExtracted,
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
    extractedText: finalExtracted
  });
});

module.exports = router;
