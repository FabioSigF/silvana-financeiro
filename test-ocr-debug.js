const { createWorker, OEM } = require('tesseract.js');

const IMAGE_PATH = 'C:\\Users\\fabio\\.gemini\\antigravity\\brain\\61407bce-4a44-4eb4-b648-65e8d4bd625c\\media__1781980025292.jpg';

/**
 * Parse TSV from Tesseract to extract lines with bboxes
 * TSV columns: level, page_num, block_num, par_num, line_num, word_num, left, top, width, height, conf, text
 * level: 1=page, 2=block, 3=paragraph, 4=line, 5=word
 */
function parseTSVToLines(tsv) {
  if (!tsv) return [];
  
  const lines = tsv.split('\n');
  const header = lines[0].split('\t');
  
  const lineMap = new Map(); // key = "block_par_line" → line object
  
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split('\t');
    if (row.length < 12) continue;
    
    const level = parseInt(row[0]);
    const blockNum = parseInt(row[2]);
    const parNum = parseInt(row[3]);
    const lineNum = parseInt(row[4]);
    const wordNum = parseInt(row[5]);
    const left = parseInt(row[6]);
    const top = parseInt(row[7]);
    const width = parseInt(row[8]);
    const height = parseInt(row[9]);
    const conf = parseInt(row[10]);
    const text = row.slice(11).join('\t'); // everything after conf
    
    if (level === 4) {
      // This is a line-level entry
      const key = `${blockNum}-${parNum}-${lineNum}`;
      lineMap.set(key, {
        text: '',
        confidence: conf,
        bbox: { x0: left, y0: top, x1: left + width, y1: top + height },
      });
    } else if (level === 5 && text.trim()) {
      // This is a word — append to parent line
      const key = `${blockNum}-${parNum}-${lineNum}`;
      const line = lineMap.get(key);
      if (line) {
        line.text = (line.text + ' ' + text).trim();
        // Update confidence as average
        if (conf > 0 && line.confidence > 0) {
          line.confidence = Math.round((line.confidence + conf) / 2);
        } else if (conf > 0) {
          line.confidence = conf;
        }
      }
    }
  }
  
  return Array.from(lineMap.values()).filter(l => l.text.trim().length > 0);
}

async function run() {
  console.log('Testing with jobConfig to get TSV...');
  const worker = await createWorker('por+eng', OEM.LSTM_ONLY);
  
  await worker.setParameters({
    tessedit_pageseg_mode: '6',
    preserve_interword_spaces: "1",
  });
  
  // Try with outputType in recognize
  const result = await worker.recognize(IMAGE_PATH, {}, {
    text: true,
    blocks: true,
    hocr: true,
    tsv: true,
  });
  
  await worker.terminate();
  
  const data = result.data;
  
  console.log('Keys:', Object.keys(data));
  console.log('Has TSV:', typeof data.tsv);
  console.log('Has blocks:', typeof data.blocks);
  console.log('Has hocr:', typeof data.hocr !== 'undefined' ? 'yes' : 'no');
  
  if (data.tsv) {
    console.log('\n=== TSV (first 1500 chars) ===');
    console.log(data.tsv.slice(0, 1500));
    
    console.log('\n=== Parsed Lines from TSV ===');
    const lines = parseTSVToLines(data.tsv);
    console.log(`Total lines: ${lines.length}`);
    lines.forEach((l, i) => {
      console.log(`  [${i}] Conf=${l.confidence} bbox=${JSON.stringify(l.bbox)} text="${l.text}"`);
    });
  }
  
  if (data.blocks) {
    console.log('\n=== blocks (stringified) ===');
    console.log(JSON.stringify(data.blocks).slice(0, 2000));
  }
  
  if (data.hocr) {
    console.log('\n=== HOCR (first 1500 chars) ===');
    console.log(data.hocr.slice(0, 1500));
  }
}

run().catch(console.error);
