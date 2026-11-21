export type Student = {
  id: string;
  name: string;
  className: string;
  subject: string;
  monthlyFee: number;
};

export type PaymentMethod = Payment['method'];

export type Payment = {
  amount: number;
  date: string; // ISO 'YYYY-MM-DD'
  method: 'Cash' | 'UPI' | 'Bank';
};

export type Invoice = {
  id: string;
  studentId: string;
  subject: string;
  month: string; // e.g. '2026-11'
  amount: number;
  issueDate: string; // ISO 'YYYY-MM-DD'
  dueDate: string; // ISO 'YYYY-MM-DD'
  status: 'draft' | 'sent' | 'paid';
  payments: Payment[];
  reminders: string[]; // ISO dates
};

// Recurring bills carry dayOfMonth; one-time bills carry oneTimeDate.
export type Bill = {
  id: string;
  name: string;
  amount: number;
  dayOfMonth?: number;
  oneTimeDate?: string; // ISO 'YYYY-MM-DD'
};

export type AppData = {
  version: 1;
  referenceDate: string; // ISO 'YYYY-MM-DD'
  openingCash: number;
  safetyBuffer: number;
  students: Student[];
  invoices: Invoice[];
  bills: Bill[];
};
