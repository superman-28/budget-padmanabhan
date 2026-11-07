import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export interface GooglePayStatementTransaction {
  transactionId: string;
  description: string;
  date: string;
  amount: number;
  type: 'expense' | 'income';
  selfTransfer: boolean;
}

export interface GooglePayStatementTotals {
  sent: number;
  received: number;
}

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

const GOOGLE_PAY_ROW = /(\d{1,2}\s+[A-Za-z]{3},?\s+\d{4}\s+\d{1,2}:\d{2}\s*(?:AM|PM))\s+(Paid to|Received from|Self transfer to)\s+([\s\S]*?)\s+UPI\s+Transaction\s+ID:\s*(\d+)\s+(?:Paid by|Paid to)\s+([\s\S]*?)\s+₹\s*([\d,]+(?:\.\d{1,2})?)/gi;

function parseStatementDate(value: string): Date | null {
  const match = value.match(/^(\d{1,2})\s+([A-Za-z]{3}),?\s+(\d{4})\s+(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;
  const month = MONTHS[match[2].toLowerCase()];
  if (month === undefined) return null;
  const hour12 = Number(match[4]) % 12;
  const hour = hour12 + (match[6].toUpperCase() === 'PM' ? 12 : 0);
  const date = new Date(Number(match[3]), month, Number(match[1]), hour, Number(match[5]), 0, 0);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function parseGooglePayStatement(file: File): Promise<{
  transactions: GooglePayStatementTransaction[];
  selfTransfersSkipped: number;
  summaryTotals: GooglePayStatementTotals | null;
  parsedTotals: GooglePayStatementTotals;
}> {
  if (file.size > 20 * 1024 * 1024) {
    throw new Error('Choose a PDF smaller than 20 MB.');
  }

  const loadingTask = getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
    useSystemFonts: true,
  });
  const pdf = await loadingTask.promise;

  try {
    if (pdf.numPages > 50) {
      throw new Error('This statement has more than 50 pages and cannot be imported in one pass.');
    }

    const transactions: GooglePayStatementTransaction[] = [];
    const seenIds = new Set<string>();
    let selfTransfersSkipped = 0;
    let totalStatementRows = 0;
    let summaryTotals: GooglePayStatementTotals | null = null;

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const text = content.items
        .map((item) => ('str' in item ? item.str : ''))
        .filter(Boolean)
        .join(' ')
        .replace(/\s+/g, ' ');

      if (pageNumber === 1 && !/transaction\s+statement/i.test(text)) {
        throw new Error('This does not look like a Google Pay transaction statement.');
      }

      if (!summaryTotals) {
        const totalsMatch = text.match(/\bSent\s+₹\s*([\d,]+(?:\.\d{1,2})?)\s+Received\s+₹\s*([\d,]+(?:\.\d{1,2})?)/i);
        if (totalsMatch) {
          summaryTotals = {
            sent: Number(totalsMatch[1].replace(/,/g, '')),
            received: Number(totalsMatch[2].replace(/,/g, '')),
          };
        }
      }

      totalStatementRows += (text.match(/UPI\s+Transaction\s+ID\s*:/gi) || []).length;
      const rowPattern = new RegExp(GOOGLE_PAY_ROW.source, GOOGLE_PAY_ROW.flags);
      for (const match of text.matchAll(rowPattern)) {
        const [, dateText, action, merchantText, transactionId, , amountText] = match;
        const date = parseStatementDate(dateText);
        const amount = Number(amountText.replace(/,/g, ''));
        if (!date || !Number.isFinite(amount) || amount <= 0 || seenIds.has(transactionId)) continue;
        seenIds.add(transactionId);

        if (/^Self transfer to$/i.test(action)) {
          selfTransfersSkipped += 1;
          continue;
        }

        const counterparty = merchantText.replace(/\s+/g, ' ').trim();
        transactions.push({
          transactionId,
          description: /^Received from$/i.test(action)
            ? 'Received from ' + counterparty
            : 'Paid to ' + counterparty,
          date: date.toISOString(),
          amount,
          type: /^Received from$/i.test(action) ? 'income' : 'expense',
          selfTransfer: false,
        });
      }
      page.cleanup();
    }

    if (totalStatementRows === 0) {
      throw new Error('No Google Pay transactions were found. Use a downloaded, text-based PDF statement.');
    }
    if (transactions.length + selfTransfersSkipped !== totalStatementRows) {
      throw new Error('Some statement rows could not be read accurately. No transactions were imported.');
    }
    const parsedTotals = transactions.reduce<GooglePayStatementTotals>(
      (totals, transaction) => {
        if (transaction.type === 'expense') totals.sent += transaction.amount;
        else totals.received += transaction.amount;
        return totals;
      },
      { sent: 0, received: 0 }
    );

    return { transactions, selfTransfersSkipped, summaryTotals, parsedTotals };
  } finally {
    await pdf.destroy();
  }
}
