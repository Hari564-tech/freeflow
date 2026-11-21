import type { AppData, Invoice, Student, TemplateId } from './types';

// Demo contact numbers are synthetic (98480/98481/98482/98483 series).
// The tutor template below is the Level 1 seed data, values unchanged,
// so the forecast numbers stay exactly as reconciled (see BUILD_LOG.md).

function tutorTemplate(): AppData {
  const students: Student[] = [
    { id: 's1', name: 'Ananya Reddy', className: 'Class 8', subject: 'Maths', monthlyFee: 3000, parentName: 'Suresh Reddy', parentPhone: '919848011101', billingDay: 5, subjects: ['Maths'], active: true },
    { id: 's2', name: 'Rohan Mehta', className: 'Class 10', subject: 'Science', monthlyFee: 3500, parentName: 'Anita Mehta', parentPhone: '919848011102', billingDay: 5, subjects: ['Science'], active: true },
    { id: 's3', name: 'Kavya Nair', className: 'Class 6', subject: 'English', monthlyFee: 2000, parentName: 'Divya Nair', parentPhone: '919848011103', billingDay: 5, subjects: ['English'], active: true },
    { id: 's4', name: 'Arjun Rao', className: 'Class 9', subject: 'Maths', monthlyFee: 3000, parentName: 'Kiran Rao', parentPhone: '919848011104', billingDay: 5, subjects: ['Maths'], active: true },
    { id: 's5', name: 'Sneha Kulkarni', className: 'Class 7', subject: 'All subjects', monthlyFee: 2500, parentName: 'Meera Kulkarni', parentPhone: '919848011105', billingDay: 5, subjects: ['Maths', 'Science', 'English'], active: true },
    { id: 's6', name: 'Vikram Patel', className: 'Class 12', subject: 'Physics', monthlyFee: 4000, parentName: 'Rajesh Patel', parentPhone: '919848011106', billingDay: 5, subjects: ['Physics'], active: true },
    { id: 's7', name: 'Ishita Gupta', className: 'Class 5', subject: 'Maths', monthlyFee: 1500, parentName: 'Neha Gupta', parentPhone: '919848011107', billingDay: 5, subjects: ['Maths'], active: true },
    { id: 's8', name: 'Aditya Singh', className: 'Class 11', subject: 'Chemistry', monthlyFee: 3500, parentName: 'Amit Singh', parentPhone: '919848011108', billingDay: 5, subjects: ['Chemistry'], active: true },
  ];

  const invoices: Invoice[] = [
    // October 2026 - all paid, paid in early October (on or before 5 Oct)
    {
      id: 'inv-2026-10-s1', studentId: 's1', subject: 'Maths', month: '2026-10', amount: 3000,
      issueDate: '2026-09-25', dueDate: '2026-10-05', status: 'paid',
      payments: [{ amount: 3000, date: '2026-10-03', method: 'Cash' }], reminders: [],
    },
    {
      id: 'inv-2026-10-s2', studentId: 's2', subject: 'Science', month: '2026-10', amount: 3500,
      issueDate: '2026-09-25', dueDate: '2026-10-05', status: 'paid',
      payments: [{ amount: 3500, date: '2026-10-03', method: 'UPI' }], reminders: [],
    },
    {
      id: 'inv-2026-10-s3', studentId: 's3', subject: 'English', month: '2026-10', amount: 2000,
      issueDate: '2026-09-25', dueDate: '2026-10-05', status: 'paid',
      payments: [{ amount: 2000, date: '2026-10-03', method: 'Bank' }], reminders: [],
    },
    {
      id: 'inv-2026-10-s4', studentId: 's4', subject: 'Maths', month: '2026-10', amount: 3000,
      issueDate: '2026-09-25', dueDate: '2026-10-05', status: 'paid',
      payments: [{ amount: 3000, date: '2026-10-03', method: 'UPI' }], reminders: [],
    },
    {
      id: 'inv-2026-10-s5', studentId: 's5', subject: 'All subjects', month: '2026-10', amount: 2500,
      issueDate: '2026-09-25', dueDate: '2026-10-05', status: 'paid',
      payments: [{ amount: 2500, date: '2026-10-03', method: 'Cash' }], reminders: [],
    },
    {
      id: 'inv-2026-10-s6', studentId: 's6', subject: 'Physics', month: '2026-10', amount: 4000,
      issueDate: '2026-09-25', dueDate: '2026-10-05', status: 'paid',
      payments: [{ amount: 4000, date: '2026-10-03', method: 'Bank' }], reminders: [],
    },
    {
      id: 'inv-2026-10-s7', studentId: 's7', subject: 'Maths', month: '2026-10', amount: 1500,
      issueDate: '2026-09-25', dueDate: '2026-10-05', status: 'paid',
      payments: [{ amount: 1500, date: '2026-10-03', method: 'UPI' }], reminders: [],
    },
    {
      id: 'inv-2026-10-s8', studentId: 's8', subject: 'Chemistry', month: '2026-10', amount: 3500,
      issueDate: '2026-09-25', dueDate: '2026-10-05', status: 'paid',
      payments: [{ amount: 3500, date: '2026-10-03', method: 'Cash' }], reminders: [],
    },

    // November 2026
    {
      id: 'inv-2026-11-s1', studentId: 's1', subject: 'Maths', month: '2026-11', amount: 3000,
      issueDate: '2026-11-01', dueDate: '2026-11-05', status: 'sent',
      payments: [], reminders: [],
    },
    {
      id: 'inv-2026-11-s2', studentId: 's2', subject: 'Science', month: '2026-11', amount: 3500,
      issueDate: '2026-11-01', dueDate: '2026-11-05', status: 'paid',
      payments: [{ amount: 3500, date: '2026-11-02', method: 'UPI' }], reminders: [],
    },
    {
      id: 'inv-2026-11-s3', studentId: 's3', subject: 'English', month: '2026-11', amount: 2000,
      issueDate: '2026-11-01', dueDate: '2026-11-05', status: 'paid',
      payments: [{ amount: 2000, date: '2026-11-03', method: 'Bank' }], reminders: [],
    },
    {
      id: 'inv-2026-11-s4', studentId: 's4', subject: 'Maths', month: '2026-11', amount: 3000,
      issueDate: '2026-11-01', dueDate: '2026-11-25', status: 'sent',
      payments: [], reminders: [],
    },
    {
      id: 'inv-2026-11-s5', studentId: 's5', subject: 'All subjects', month: '2026-11', amount: 2500,
      issueDate: '2026-11-01', dueDate: '2026-11-05', status: 'paid',
      payments: [{ amount: 2500, date: '2026-11-02', method: 'Cash' }], reminders: [],
    },
    {
      id: 'inv-2026-11-s6', studentId: 's6', subject: 'Physics', month: '2026-11', amount: 4000,
      issueDate: '2026-11-01', dueDate: '2026-11-05', status: 'sent',
      payments: [], reminders: [],
    },
    {
      id: 'inv-2026-11-s7', studentId: 's7', subject: 'Maths', month: '2026-11', amount: 1500,
      issueDate: '2026-11-01', dueDate: '2026-11-05', status: 'paid',
      payments: [{ amount: 1500, date: '2026-11-03', method: 'UPI' }], reminders: [],
    },
    {
      id: 'inv-2026-11-s8', studentId: 's8', subject: 'Chemistry', month: '2026-11', amount: 3500,
      issueDate: '2026-11-01', dueDate: '2026-11-25', status: 'sent',
      payments: [], reminders: [],
    },
  ];

  return {
    version: 2,
    referenceDate: '2026-11-21',
    openingCash: 12000,
    safetyBuffer: 10000,
    business: {
      businessName: 'Priya Sharma — Home Tuition',
      ownerName: 'Priya Sharma',
      tagline: 'Maths and Science tuition, Classes 5 to 12',
      upiId: 'priyasharma@okhdfc',
      phone: '919848011100',
    },
    students,
    invoices,
    bills: [
      { id: 'b-rent', name: 'Rent (study room)', amount: 8000, kind: 'recurring', dayOfMonth: 1 },
      { id: 'b-electricity', name: 'Electricity', amount: 800, kind: 'recurring', dayOfMonth: 5 },
      { id: 'b-internet', name: 'Internet', amount: 999, kind: 'recurring', dayOfMonth: 10 },
      { id: 'b-materials', name: 'Study materials', amount: 1500, kind: 'recurring', dayOfMonth: 15 },
      { id: 'b-transport', name: 'Transport', amount: 2000, kind: 'recurring', dayOfMonth: 20 },
      { id: 'b-table', name: 'Study table plus whiteboard', amount: 6500, kind: 'one-time', oneTimeDate: '2026-11-28' },
    ],
  };
}

function designerTemplate(): AppData {
  const students: Student[] = [
    { id: 'c1', name: 'Asha Verma', className: 'Brand Design', subject: 'Logo and brand kit', monthlyFee: 3500, parentName: '', parentPhone: '919848022201', billingDay: 5, subjects: ['Logo Design', 'Brand Kit'], active: true },
    { id: 'c2', name: 'Kiran Rao', className: 'Web Design', subject: 'Website design', monthlyFee: 5000, parentName: '', parentPhone: '919848022202', billingDay: 5, subjects: ['Website Design'], active: true },
    { id: 'c3', name: 'Neha Gupta', className: 'Social Media', subject: 'Social media creatives', monthlyFee: 4000, parentName: '', parentPhone: '919848022203', billingDay: 5, subjects: ['Social Media Creatives'], active: true },
    { id: 'c4', name: 'Arjun Nair', className: 'UI/UX', subject: 'App UI design', monthlyFee: 6000, parentName: '', parentPhone: '919848022204', billingDay: 5, subjects: ['App UI Design'], active: true },
    { id: 'c5', name: 'Divya Menon', className: 'Print Design', subject: 'Brochures and print', monthlyFee: 4500, parentName: '', parentPhone: '919848022205', billingDay: 5, subjects: ['Brochures', 'Print Design'], active: true },
  ];

  const invoices: Invoice[] = [
    // October 2026 - Asha paid 3000 of 3500 (Partial, balance 500);
    // the rest paid in full in early October.
    {
      id: 'inv-d-2026-10-c1', studentId: 'c1', subject: 'Logo and brand kit', month: '2026-10', amount: 3500,
      issueDate: '2026-09-25', dueDate: '2026-10-05', status: 'partial',
      payments: [{ amount: 3000, date: '2026-10-28', method: 'UPI', ref: 'UPI-ASH-1028' }], reminders: [],
    },
    {
      id: 'inv-d-2026-10-c2', studentId: 'c2', subject: 'Website design', month: '2026-10', amount: 5000,
      issueDate: '2026-09-25', dueDate: '2026-10-05', status: 'paid',
      payments: [{ amount: 5000, date: '2026-10-03', method: 'Bank' }], reminders: [],
    },
    {
      id: 'inv-d-2026-10-c3', studentId: 'c3', subject: 'Social media creatives', month: '2026-10', amount: 4000,
      issueDate: '2026-09-25', dueDate: '2026-10-05', status: 'paid',
      payments: [{ amount: 4000, date: '2026-10-04', method: 'UPI' }], reminders: [],
    },
    {
      id: 'inv-d-2026-10-c4', studentId: 'c4', subject: 'App UI design', month: '2026-10', amount: 6000,
      issueDate: '2026-09-25', dueDate: '2026-10-05', status: 'paid',
      payments: [{ amount: 6000, date: '2026-10-03', method: 'Bank' }], reminders: [],
    },
    {
      id: 'inv-d-2026-10-c5', studentId: 'c5', subject: 'Brochures and print', month: '2026-10', amount: 4500,
      issueDate: '2026-09-25', dueDate: '2026-10-05', status: 'paid',
      payments: [{ amount: 4500, date: '2026-10-05', method: 'Cash' }], reminders: [],
    },

    // November 2026
    {
      id: 'inv-d-2026-11-c1', studentId: 'c1', subject: 'Logo and brand kit', month: '2026-11', amount: 3500,
      issueDate: '2026-11-01', dueDate: '2026-11-05', status: 'sent',
      payments: [], reminders: [],
    },
    {
      id: 'inv-d-2026-11-c2', studentId: 'c2', subject: 'Website design', month: '2026-11', amount: 5000,
      issueDate: '2026-11-01', dueDate: '2026-11-05', status: 'paid',
      payments: [{ amount: 5000, date: '2026-11-02', method: 'UPI' }], reminders: [],
    },
    {
      id: 'inv-d-2026-11-c3', studentId: 'c3', subject: 'Social media creatives', month: '2026-11', amount: 4000,
      issueDate: '2026-11-01', dueDate: '2026-11-05', status: 'paid',
      payments: [{ amount: 4000, date: '2026-11-03', method: 'Bank' }], reminders: [],
    },
    {
      id: 'inv-d-2026-11-c4', studentId: 'c4', subject: 'App UI design', month: '2026-11', amount: 6000,
      issueDate: '2026-11-01', dueDate: '2026-11-25', status: 'sent',
      payments: [], reminders: [],
    },
    {
      id: 'inv-d-2026-11-c5', studentId: 'c5', subject: 'Brochures and print', month: '2026-11', amount: 4500,
      issueDate: '2026-11-01', dueDate: '2026-11-05', status: 'paid',
      payments: [{ amount: 4500, date: '2026-11-02', method: 'Cash' }], reminders: [],
    },
  ];

  return {
    version: 2,
    referenceDate: '2026-11-21',
    openingCash: 25000,
    safetyBuffer: 15000,
    business: {
      businessName: 'Rohan Mehta Design Studio',
      ownerName: 'Rohan Mehta',
      tagline: 'Brand, web and UI design for small businesses',
      upiId: 'rohanmehta@okhdfc',
      phone: '919848022200',
    },
    students,
    invoices,
    bills: [
      { id: 'b-cowork', name: 'Co-working space', amount: 6000, kind: 'recurring', dayOfMonth: 1 },
      { id: 'b-software', name: 'Design software', amount: 1499, kind: 'recurring', dayOfMonth: 5 },
      { id: 'b-internet', name: 'Internet', amount: 999, kind: 'recurring', dayOfMonth: 10 },
    ],
  };
}

function salonTemplate(): AppData {
  const students: Student[] = [
    { id: 'k1', name: 'Lakshmi', className: 'Hair Care', subject: 'Haircut and colour', monthlyFee: 3000, parentName: '', parentPhone: '919848033301', billingDay: 5, subjects: ['Haircut', 'Colour'], active: true },
    { id: 'k2', name: 'Anitha', className: 'Skin Care', subject: 'Facial and cleanup', monthlyFee: 2500, parentName: '', parentPhone: '919848033302', billingDay: 5, subjects: ['Facial', 'Cleanup'], active: true },
    { id: 'k3', name: 'Rekha', className: 'Bridal', subject: 'Bridal package', monthlyFee: 3500, parentName: '', parentPhone: '919848033303', billingDay: 5, subjects: ['Bridal Package'], active: true },
    { id: 'k4', name: 'Sunita', className: 'Hair Care', subject: 'Hair spa', monthlyFee: 2000, parentName: '', parentPhone: '919848033304', billingDay: 5, subjects: ['Hair Spa'], active: true },
    { id: 'k5', name: 'Meena', className: 'Skin Care', subject: 'Facial and waxing', monthlyFee: 3000, parentName: '', parentPhone: '919848033305', billingDay: 5, subjects: ['Facial', 'Waxing'], active: true },
    { id: 'k6', name: 'Priya', className: 'Hair Care', subject: 'Haircut and styling', monthlyFee: 2800, parentName: '', parentPhone: '919848033306', billingDay: 5, subjects: ['Haircut', 'Styling'], active: true },
  ];

  const invoices: Invoice[] = [
    // October 2026 - all paid in early October
    {
      id: 'inv-s-2026-10-k1', studentId: 'k1', subject: 'Haircut and colour', month: '2026-10', amount: 3000,
      issueDate: '2026-09-25', dueDate: '2026-10-05', status: 'paid',
      payments: [{ amount: 3000, date: '2026-10-03', method: 'Cash' }], reminders: [],
    },
    {
      id: 'inv-s-2026-10-k2', studentId: 'k2', subject: 'Facial and cleanup', month: '2026-10', amount: 2500,
      issueDate: '2026-09-25', dueDate: '2026-10-05', status: 'paid',
      payments: [{ amount: 2500, date: '2026-10-04', method: 'UPI' }], reminders: [],
    },
    {
      id: 'inv-s-2026-10-k3', studentId: 'k3', subject: 'Bridal package', month: '2026-10', amount: 3500,
      issueDate: '2026-09-25', dueDate: '2026-10-05', status: 'paid',
      payments: [{ amount: 3500, date: '2026-10-03', method: 'Bank' }], reminders: [],
    },
    {
      id: 'inv-s-2026-10-k4', studentId: 'k4', subject: 'Hair spa', month: '2026-10', amount: 2000,
      issueDate: '2026-09-25', dueDate: '2026-10-05', status: 'paid',
      payments: [{ amount: 2000, date: '2026-10-05', method: 'Cash' }], reminders: [],
    },
    {
      id: 'inv-s-2026-10-k5', studentId: 'k5', subject: 'Facial and waxing', month: '2026-10', amount: 3000,
      issueDate: '2026-09-25', dueDate: '2026-10-05', status: 'paid',
      payments: [{ amount: 3000, date: '2026-10-03', method: 'UPI' }], reminders: [],
    },
    {
      id: 'inv-s-2026-10-k6', studentId: 'k6', subject: 'Haircut and styling', month: '2026-10', amount: 2800,
      issueDate: '2026-09-25', dueDate: '2026-10-05', status: 'paid',
      payments: [{ amount: 2800, date: '2026-10-04', method: 'Cash' }], reminders: [],
    },

    // November 2026
    {
      id: 'inv-s-2026-11-k1', studentId: 'k1', subject: 'Haircut and colour', month: '2026-11', amount: 3000,
      issueDate: '2026-11-01', dueDate: '2026-11-05', status: 'sent',
      payments: [], reminders: [],
    },
    {
      id: 'inv-s-2026-11-k2', studentId: 'k2', subject: 'Facial and cleanup', month: '2026-11', amount: 2500,
      issueDate: '2026-11-01', dueDate: '2026-11-05', status: 'paid',
      payments: [{ amount: 2500, date: '2026-11-02', method: 'Cash' }], reminders: [],
    },
    {
      id: 'inv-s-2026-11-k3', studentId: 'k3', subject: 'Bridal package', month: '2026-11', amount: 3500,
      issueDate: '2026-11-01', dueDate: '2026-11-05', status: 'paid',
      payments: [{ amount: 3500, date: '2026-11-03', method: 'UPI' }], reminders: [],
    },
    {
      id: 'inv-s-2026-11-k4', studentId: 'k4', subject: 'Hair spa', month: '2026-11', amount: 2000,
      issueDate: '2026-11-01', dueDate: '2026-11-05', status: 'sent',
      payments: [], reminders: [],
    },
    {
      id: 'inv-s-2026-11-k5', studentId: 'k5', subject: 'Facial and waxing', month: '2026-11', amount: 3000,
      issueDate: '2026-11-01', dueDate: '2026-11-05', status: 'paid',
      payments: [{ amount: 3000, date: '2026-11-02', method: 'Bank' }], reminders: [],
    },
    {
      id: 'inv-s-2026-11-k6', studentId: 'k6', subject: 'Haircut and styling', month: '2026-11', amount: 2800,
      issueDate: '2026-11-01', dueDate: '2026-11-25', status: 'sent',
      payments: [], reminders: [],
    },
  ];

  return {
    version: 2,
    referenceDate: '2026-11-21',
    openingCash: 18000,
    safetyBuffer: 12000,
    business: {
      businessName: 'Kavya Studio',
      ownerName: 'Kavya Reddy',
      tagline: 'Neighbourhood salon — hair, skin and bridal',
      upiId: 'kavyastudio@okhdfc',
      phone: '919848033300',
    },
    students,
    invoices,
    bills: [
      { id: 'b-shoprent', name: 'Shop rent', amount: 12000, kind: 'recurring', dayOfMonth: 1 },
      { id: 'b-electricity', name: 'Electricity', amount: 1200, kind: 'recurring', dayOfMonth: 5 },
      { id: 'b-internet', name: 'Internet', amount: 799, kind: 'recurring', dayOfMonth: 10 },
      { id: 'b-supplies', name: 'Salon supplies', amount: 2500, kind: 'recurring', dayOfMonth: 15 },
    ],
  };
}

export function seedTemplates(): Record<TemplateId, AppData> {
  return {
    tutor: tutorTemplate(),
    designer: designerTemplate(),
    salon: salonTemplate(),
  };
}

// Backwards-compatible: the home-tutor template is the default data set.
export function seedData(): AppData {
  return tutorTemplate();
}

// PATCH (b): paid + balance must always equal the invoice amount.
// Returns an error message, or null when the invoice is consistent.
export function validateInvoiceAmounts(inv: Invoice): string | null {
  const paid = inv.payments.reduce((sum, p) => sum + p.amount, 0);
  if (paid < 0) {
    return 'Payment total cannot be negative.';
  }
  if (paid > inv.amount) {
    return `Overpayment: paid ${paid} is more than the invoice amount ${inv.amount}.`;
  }
  if (inv.status === 'paid' && paid !== inv.amount) {
    return 'A paid invoice must be paid in full.';
  }
  if (inv.status === 'partial' && (paid <= 0 || paid >= inv.amount)) {
    return 'A partial invoice needs a payment between 1 and the full amount.';
  }
  if ((inv.status === 'draft' || inv.status === 'sent') && paid > 0 && paid < inv.amount) {
    return 'An invoice with a part payment must be marked Partial.';
  }
  return null;
}
