export type TemplateId = 'tutor' | 'designer' | 'salon';

export type Student = {
  id: string;
  name: string;
  className: string;
  subject: string;
  monthlyFee: number;
  // WhatsApp contact: the parent for students, the client for designer/salon.
  parentName: string;
  parentPhone: string; // digits with country code, e.g. '919848011101'
  billingDay: number; // day of the month invoices are due (5 for all templates)
  subjects: string[];
  active: boolean;
};

export type PaymentMethod = Payment['method'];

export type Payment = {
  amount: number;
  date: string; // ISO 'YYYY-MM-DD'
  method: 'Cash' | 'UPI' | 'Bank';
  ref?: string; // UPI ref / transaction id
  note?: string;
};

export type InvoiceStatus = 'draft' | 'sent' | 'partial' | 'paid';

export type Invoice = {
  id: string;
  studentId: string;
  subject: string;
  month: string; // e.g. '2026-11'
  amount: number;
  issueDate: string; // ISO 'YYYY-MM-DD'
  dueDate: string; // ISO 'YYYY-MM-DD'
  status: InvoiceStatus;
  payments: Payment[];
  reminders: string[]; // ISO dates
};

// Recurring bills carry dayOfMonth; one-time bills carry oneTimeDate.
export type Bill = {
  id: string;
  name: string;
  amount: number;
  kind: 'recurring' | 'one-time';
  dayOfMonth?: number;
  oneTimeDate?: string; // ISO 'YYYY-MM-DD'
};

export type BusinessProfile = {
  businessName: string;
  ownerName: string;
  tagline: string;
  upiId: string; // demo UPI id used for the QR deep link
  phone: string; // digits with country code
};

export type AppData = {
  version: 2;
  referenceDate: string; // ISO 'YYYY-MM-DD'
  openingCash: number;
  safetyBuffer: number;
  business: BusinessProfile;
  students: Student[];
  invoices: Invoice[];
  bills: Bill[];
};

export type TemplateData = {
  id: TemplateId;
  label: string;
  data: AppData;
};

export type ReminderTone = 'Polite' | 'Friendly' | 'Firm';

export type AppState = {
  version: 2;
  activeTemplateId: TemplateId;
  templates: Record<TemplateId, AppData>;
  reminders: Record<string, string>; // invoiceId -> last reminded ISO datetime
  snoozedAlerts: Record<string, string>; // alert key -> snoozed until ISO date
  dismissedAlerts: string[]; // alert keys
  tone: ReminderTone;
  dueDays: number; // days after issue date that invoices fall due (default 5)
  // M6: invoiceId -> date the parent promised to pay (Bad Day Mode).
  promisedDates: Record<string, string>;
  // M6: billId -> date the bill was marked paid (Bills tab toggle).
  paidBills: Record<string, string>;
};
