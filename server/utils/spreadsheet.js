import { readSheet } from 'read-excel-file/node';
import { parse } from 'csv-parse/sync';

export async function readSpreadsheetRows(file) {
  const mime = file?.mimetype || '';
  const name = file?.originalname || '';

  if (mime === 'text/csv' || name.toLowerCase().endsWith('.csv')) {
    const text = file.buffer.toString('utf8').replace(/^\uFEFF/, '');
    return parse(text, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });
  }

  const sheetRows = await readSheet(file.buffer);
  if (!sheetRows || sheetRows.length === 0) {
    return [];
  }

  const headers = sheetRows[0].map(value => String(value ?? '').trim());
  const records = [];

  for (let rowIndex = 1; rowIndex < sheetRows.length; rowIndex += 1) {
    const source = sheetRows[rowIndex];
    const record = {};
    headers.forEach((header, index) => {
      if (!header) return;
      record[header] = source[index] ?? '';
    });
    records.push(record);
  }

  return records;
}
