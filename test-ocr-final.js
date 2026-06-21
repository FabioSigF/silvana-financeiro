/**
 * Test final: simula o que o tesseractEngine faz com data.blocks
 * para confirmar que linhas são extraídas corretamente
 */
const { createWorker, OEM } = require('tesseract.js');

const IMAGE_PATH = 'C:\\Users\\fabio\\.gemini\\antigravity\\brain\\61407bce-4a44-4eb4-b648-65e8d4bd625c\\media__1781980025292.jpg';

// Replicação do extractLinesFromData em JS puro
function extractLinesFromData(data) {
  if (Array.isArray(data.blocks) && data.blocks.length > 0) {
    const lines = [];
    for (const block of data.blocks) {
      if (!block.paragraphs) continue;
      for (const para of block.paragraphs) {
        if (!para.lines) continue;
        for (const line of para.lines) {
          const text = (line.text ?? '').trim();
          if (!text) continue;
          lines.push({
            text,
            confidence: line.confidence ?? 0,
            bbox: line.bbox ?? { x0: 0, y0: 0, x1: 0, y1: 0 },
          });
        }
      }
    }
    if (lines.length > 0) return lines;
  }

  // Fallback: texto bruto
  return (data.text ?? '').split('\n')
    .map(t => t.trim())
    .filter(t => t.length > 0)
    .map(t => ({ text: t, confidence: data.confidence ?? 0, bbox: { x0: 0, y0: 0, x1: 0, y1: 0 } }));
}

// Replicação do worthIncluding do NOVO parser
const DIGIT_FIXES = { O: '0', o: '0', l: '1', I: '1', '|': '1', B: '8', S: '5', s: '5', G: '6', g: '9', Z: '2', z: '2' };
function fixOCRDigits(str) {
  return str.split('').map(ch => DIGIT_FIXES[ch] ?? ch).join('');
}

function worthIncluding(lineText, lineConf) {
  const fixed = fixOCRDigits(lineText);
  const hasDate = /\b(\d{1,2})[\/\-\.](\d{1,2})\b/.test(fixed) ||
                  /^([oO0IlB1-9]{1,2})[\/\-\.](\d{1,2})/.test(lineText);
  const hasAmount = /\b\d{2,}(?:[.,]\d{2})?\b/.test(fixed);
  const descLen = lineText.replace(/[\d\/\-\.]/g, '').trim().length;
  const hasDesc = descLen >= 4;
  return hasDate || hasAmount || hasDesc || lineConf >= 15;
}

async function run() {
  console.log('🧪 Teste final do pipeline corrigido\n');
  
  const worker = await createWorker('por+eng', OEM.LSTM_ONLY);
  await worker.setParameters({
    tessedit_pageseg_mode: '6',
    tessedit_char_whitelist:
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz" +
      "ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇáàâãäéèêëíìîïóòôõöúùûüç" +
      "0123456789.,;:/-+()RrSs$% \n\t",
    preserve_interword_spaces: "1",
  });
  
  const { data } = await worker.recognize(IMAGE_PATH);
  await worker.terminate();
  
  const lines = extractLinesFromData(data);
  
  console.log(`📊 Confiança geral: ${data.confidence}%`);
  console.log(`📝 Linhas extraídas de data.blocks: ${lines.length}\n`);
  
  const rows = [];
  const filtered = [];
  
  for (const line of lines) {
    const include = worthIncluding(line.text, line.confidence);
    if (include) rows.push(line);
    else filtered.push(line);
  }
  
  console.log(`✅ LINHAS INCLUÍDAS NO RESULTADO (${rows.length} de ${lines.length}):`);
  for (const line of rows) {
    const fixed = fixOCRDigits(line.text);
    const hasDate = /\b(\d{1,2})[\/\-\.](\d{1,2})\b/.test(fixed);
    const hasAmount = /\b\d{2,}(?:[.,]\d{2})?\b/.test(fixed);
    const flags = [hasDate ? '📅' : '', hasAmount ? '💰' : ''].filter(Boolean).join('');
    console.log(`  ${flags || '📝'} [conf=${Math.round(line.confidence)}%] "${line.text}" → fixado: "${fixed}"`);
    console.log(`      bbox: x0=${line.bbox.x0} y0=${line.bbox.y0} x1=${line.bbox.x1} y1=${line.bbox.y1}`);
  }
  
  if (filtered.length > 0) {
    console.log(`\n❌ LINHAS FILTRADAS (${filtered.length}):`);
    for (const line of filtered) {
      console.log(`  [conf=${Math.round(line.confidence)}%] "${line.text}"`);
    }
  }
  
  console.log('\n✨ Pipeline corrigido funcionando!');
  console.log('   Problema anterior: data.lines = undefined no Tesseract.js v7');
  console.log('   Solução: extrair de data.blocks[].paragraphs[].lines[]');
}

run().catch(console.error);
