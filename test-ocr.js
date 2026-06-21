const { createWorker, OEM } = require('tesseract.js');

const IMAGE_PATH = 'C:\\Users\\fabio\\.gemini\\antigravity\\brain\\61407bce-4a44-4eb4-b648-65e8d4bd625c\\media__1781980025292.jpg';

/**
 * Extrai linhas do resultado do Tesseract de forma robusta.
 * Tenta data.lines primeiro, depois desce por blocks > paragraphs > lines.
 */
function extractLines(data) {
  // Tenta a propriedade direta `lines`
  if (data.lines && Array.isArray(data.lines) && data.lines.length > 0) {
    return data.lines;
  }
  
  // Fallback: percorre blocks > paragraphs > lines
  const lines = [];
  if (data.blocks && Array.isArray(data.blocks)) {
    for (const block of data.blocks) {
      if (block.paragraphs) {
        for (const para of block.paragraphs) {
          if (para.lines) {
            for (const line of para.lines) {
              lines.push({
                text: line.text,
                confidence: line.confidence,
                bbox: line.bbox,
              });
            }
          }
        }
      }
    }
  }
  
  return lines;
}

/**
 * Simulação do fixOCRDigits do parser
 */
const DIGIT_FIXES = { O: '0', o: '0', l: '1', I: '1', '|': '1', B: '8', S: '5', s: '5', G: '6', g: '9', Z: '2', z: '2' };
function fixOCRDigits(str) {
  return str.split('').map(ch => DIGIT_FIXES[ch] ?? ch).join('');
}

/**
 * Simulação da lógica worthIncluding NOVA do parser
 */
function worthIncluding(line) {
  const text = line.text.trim();
  const fixed = fixOCRDigits(text);
  
  const hasDate = !!/\b(\d{1,2})[\/\-\.](\d{1,2})\b/.test(fixed) ||
                  /^([oO0IlB1-9]{1,2})[\/\-\.](\d{1,2})/.test(text);
  const hasAmount = !!/\b\d+(?:[.,]\d{2})?\b/.test(fixed);
  const descLen = text.replace(/\d/g, '').replace(/[\/\-\.]/g, '').trim().length;
  const hasDesc = descLen >= 4;
  
  // Nova lógica: muito mais permissiva
  return hasDate || hasAmount || hasDesc || (line.confidence >= 15);
}

async function runWithPSM(psmMode, label) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`PSM ${psmMode} — ${label}`);
  console.log('='.repeat(60));
  
  const worker = await createWorker('por+eng', OEM.LSTM_ONLY);
  
  await worker.setParameters({
    tessedit_pageseg_mode: String(psmMode),
    tessedit_char_whitelist:
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz" +
      "ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇáàâãäéèêëíìîïóòôõöúùûüç" +
      "0123456789.,;:/-+()RrSs$% \n\t",
    preserve_interword_spaces: "1",
  });
  
  const { data } = await worker.recognize(IMAGE_PATH);
  await worker.terminate();
  
  console.log(`Confiança geral: ${data.confidence}`);
  console.log(`Texto bruto: ${JSON.stringify(data.text)}`);
  
  const lines = extractLines(data);
  console.log(`\nTotal de linhas detectadas: ${lines.length}`);
  
  const passing = [];
  const filtered = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const text = line.text?.trim() || '';
    if (!text) continue;
    
    const fixed = fixOCRDigits(text);
    const include = worthIncluding(line);
    
    const entry = { i, conf: Math.round(line.confidence), text, fixed };
    if (include) passing.push(entry);
    else filtered.push(entry);
  }
  
  console.log(`\n✅ LINHAS QUE PASSAM NO FILTRO (${passing.length}):`);
  for (const e of passing) {
    console.log(`  [${e.i}] Conf=${e.conf} | "${e.text}" → fixado: "${e.fixed}"`);
  }
  
  if (filtered.length > 0) {
    console.log(`\n❌ LINHAS FILTRADAS (${filtered.length}):`);
    for (const e of filtered) {
      console.log(`  [${e.i}] Conf=${e.conf} | "${e.text}"`);
    }
  }
  
  return { confidence: data.confidence, linesPassing: passing.length, linesTotal: lines.length };
}

async function run() {
  try {
    const psm6  = await runWithPSM(6, 'Bloco uniforme (tabelas)');
    const psm11 = await runWithPSM(11, 'Texto esparso');
    const psm4  = await runWithPSM(4, 'Coluna única');
    
    console.log('\n' + '='.repeat(60));
    console.log('RESUMO COMPARATIVO');
    console.log('='.repeat(60));
    console.log(`PSM 6:  Confiança=${psm6.confidence}%  Linhas incluídas=${psm6.linesPassing}/${psm6.linesTotal}`);
    console.log(`PSM 11: Confiança=${psm11.confidence}%  Linhas incluídas=${psm11.linesPassing}/${psm11.linesTotal}`);
    console.log(`PSM 4:  Confiança=${psm4.confidence}%  Linhas incluídas=${psm4.linesPassing}/${psm4.linesTotal}`);
  } catch (err) {
    console.error('Erro:', err);
  }
}

run();
