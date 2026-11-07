export interface BankCsvTransaction {
  transactionId: string;
  description: string;
  date: string;
  amount: number;
  type: 'expense' | 'income';
}

export interface BankCsvTotals {
  debits: number;
  credits: number;
}

function parseRows(text: string): string[][] {
  const delimiter = (text.split(/\r?\n/, 1)[0].match(/;/g) || []).length > (text.split(/\r?\n/, 1)[0].match(/,/g) || []).length ? ';' : ',';
  const rows: string[][] = [];
  let row: string[] = [];
  let value = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') { value += '"'; i += 1; }
      else quoted = !quoted;
    } else if (char === delimiter && !quoted) {
      row.push(value.trim()); value = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[i + 1] === '\n') i += 1;
      row.push(value.trim()); value = '';
      if (row.some((cell) => cell !== '')) rows.push(row);
      row = [];
    } else value += char;
  }
  row.push(value.trim());
  if (row.some((cell) => cell !== '')) rows.push(row);
  if (quoted) throw new Error('This CSV has an unfinished quoted field.');
  return rows;
}

function normalizeHeader(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function parseDate(value: string): Date | null {
  const input = value.trim();
  const iso = input.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  const dmy = input.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/);
  if (dmy) {
    let year = Number(dmy[3]);
    if (year < 100) year += year >= 70 ? 1900 : 2000;
    return new Date(year, Number(dmy[2]) - 1, Number(dmy[1]));
  }
  const parsed = new Date(input);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseMoney(value: string): number | null {
  const cleaned = value.trim().replace(/[₹$€£\s,]/g, '').replace(/[()]/g, (c) => c === '(' ? '-' : '');
  if (!cleaned) return null;
  const amount = Number(cleaned);
  return Number.isFinite(amount) ? amount : null;
}

function fingerprint(date: string, description: string, amount: number, type: string): string {
  const raw = [date.slice(0, 10), description.toLowerCase().replace(/\s+/g, ' ').trim(), amount.toFixed(2), type].join('|');
  let hash = 2166136261;
  for (let i = 0; i < raw.length; i += 1) hash = Math.imul(hash ^ raw.charCodeAt(i), 16777619);
  return 'bankcsv-' + (hash >>> 0).toString(16);
}

export function parseBankCsv(text: string): { transactions: BankCsvTransaction[]; totals: BankCsvTotals; rowCount: number } {
  if (text.length > 10 * 1024 * 1024) throw new Error('Choose a CSV smaller than 10 MB.');
  const rows = parseRows(text.replace(/^\uFEFF/, ''));
  if (rows.length < 2) throw new Error('The CSV needs a header row and at least one transaction.');
  const headers = rows[0].map(normalizeHeader);
  const find = (aliases: string[]) => headers.findIndex((header) => aliases.includes(header));
  const dateCol = find(['date', 'transactiondate', 'valuedate', 'postingdate', 'bookingdate']);
  const descriptionCol = find(['description', 'narration', 'details', 'particulars', 'transactiondetails', 'merchant']);
  const debitCol = find(['debit', 'debitamount', 'withdrawal', 'withdrawals', 'withdrawalamount', 'paidout', 'dr']);
  const creditCol = find(['credit', 'creditamount', 'deposit', 'deposits', 'depositamount', 'paidin', 'cr']);
  const amountCol = find(['amount', 'transactionamount']);
  const typeCol = find(['type', 'transactiontype', 'drcr']);
  if (dateCol < 0 || descriptionCol < 0 || (amountCol < 0 && debitCol < 0 && creditCol < 0)) {
    throw new Error('Could not identify the CSV columns. Include Date, Description, and Amount or Debit/Credit columns.');
  }

  const transactions: BankCsvTransaction[] = [];
  const occurrences = new Map<string, number>();
  let debits = 0;
  let credits = 0;
  let rowCount = 0;
  for (const cells of rows.slice(1)) {
    const hasValue = cells.some((cell) => cell.trim() !== '');
    if (!hasValue) continue;
    rowCount += 1;
    const date = parseDate(cells[dateCol] || '');
    const description = (cells[descriptionCol] || '').trim();
    if (!date || !description) throw new Error('Row ' + (rowCount + 1) + ' is missing a valid date or description.');
    let amount: number;
    let type: 'expense' | 'income';
    const debit = debitCol >= 0 ? parseMoney(cells[debitCol] || '') : null;
    const credit = creditCol >= 0 ? parseMoney(cells[creditCol] || '') : null;
    if (debitCol >= 0 || creditCol >= 0) {
      if ((debit ?? 0) !== 0) { amount = Math.abs(debit!); type = 'expense'; }
      else if ((credit ?? 0) !== 0) { amount = Math.abs(credit!); type = 'income'; }
      else if (amountCol >= 0) {
        const raw = parseMoney(cells[amountCol] || '');
        if (raw === null || raw === 0) throw new Error('Row ' + (rowCount + 1) + ' has no transaction amount.');
        const isCredit = /credit|deposit|received|cr/i.test((cells[typeCol] || '') + ' ' + description);
        amount = Math.abs(raw); type = raw < 0 || !isCredit ? 'expense' : 'income';
      } else throw new Error('Row ' + (rowCount + 1) + ' has no debit or credit amount.');
    } else {
      const raw = parseMoney(cells[amountCol] || '');
      if (raw === null || raw === 0) throw new Error('Row ' + (rowCount + 1) + ' has no transaction amount.');
      const kind = (cells[typeCol] || '').toLowerCase();
      type = raw < 0 || /debit|withdraw|paid|dr/.test(kind) ? 'expense' : /credit|deposit|received|cr/.test(kind) ? 'income' : 'expense';
      amount = Math.abs(raw);
    }
    const isoDate = date.toISOString();
    const baseId = fingerprint(isoDate, description, amount, type);
    const occurrence = occurrences.get(baseId) || 0;
    occurrences.set(baseId, occurrence + 1);
    const id = baseId + '-' + occurrence;
    if (type === 'expense') debits += amount; else credits += amount;
    transactions.push({ transactionId: id, date: isoDate, description, amount, type });
  }
  if (!transactions.length) throw new Error('No transactions could be read from the CSV.');
  return { transactions, totals: { debits, credits }, rowCount };
}
