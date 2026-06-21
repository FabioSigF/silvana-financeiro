const { parseOCRText } = require('./src/lib/ocr/parser');

const rawText = "ão              dxden\nDolo.      Dinix  di                       x -\no5/06 I Tobol EO a NT\nUblob  fobel B yn\noto  eelf).              123\n30/ch  JxdoKs               TE\nJolof  AMRXO\n0/06  r  all\n-                 SP RES\n";

console.log('Parsing raw text...');
const rows = parseOCRText(rawText);

console.log('Resulting Rows:', JSON.stringify(rows, null, 2));
