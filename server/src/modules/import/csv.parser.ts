export interface CsvRow {
  line: number;
  cells: string[];
}

export class CsvFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CsvFormatError';
  }
}

export function parseCsv(input: string): CsvRow[] {
  const text = input.replace(/^\uFEFF/, '');
  const rows: CsvRow[] = [];
  let cells: string[] = [];
  let cell = '';
  let quoted = false;
  let afterQuote = false;
  let line = 1;
  let rowLine = 1;

  function finishRow() {
    cells.push(cell);
    if (cells.some((value) => value.trim() !== '')) rows.push({ line: rowLine, cells });
    cells = [];
    cell = '';
    afterQuote = false;
    rowLine = line + 1;
  }

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
        afterQuote = true;
      } else if (character === '\r' && text[index + 1] === '\n') {
        cell += '\n';
        index += 1;
        line += 1;
      } else if (character === '\r' || character === '\n') {
        cell += '\n';
        line += 1;
      } else {
        cell += character;
      }
    } else if (character === '"') {
      if (cell || afterQuote) throw new CsvFormatError(`第 ${line} 行引号位置不合法`);
      quoted = true;
    } else if (character === ',') {
      cells.push(cell);
      cell = '';
      afterQuote = false;
    } else if (character === '\n' || character === '\r') {
      if (character === '\r' && text[index + 1] === '\n') index += 1;
      finishRow();
      line += 1;
    } else {
      if (afterQuote && character !== ' ' && character !== '\t') {
        throw new CsvFormatError(`第 ${line} 行引号后包含非法字符`);
      }
      if (!afterQuote) cell += character;
    }
  }

  if (quoted) throw new CsvFormatError(`第 ${line} 行引号未闭合`);
  if (cells.length > 0 || cell) finishRow();
  return rows;
}
