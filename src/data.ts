import type { AppData, Student, Invoice, Bill } from './types';

export function seedData(): AppData {
  const students: Student[] = [
    { id: 's1', name: 'Ananya Reddy', className: 'Class 8', subject: 'Maths', monthlyFee: 3000 },
    { id: 's2', name: 'Rohan Mehta', className: 'Class 10', subject: 'Science', monthlyFee: 3500 },
    { id: 's3', name: 'Kavya Nair', className: 'Class 6', subject: 'English', monthlyFee: 2000 },
    { id: 's4', name: 'Arjun Rao', className: 'Class 9', subject: 'Maths', monthlyFee: 3000 },
    { id: 's5', name: 'Sneha Kulkarni', className: 'Class 7', subject: 'All subjects', monthlyFee: 2500 },
    { id: 's6', name: 'Vikram Patel', className: 'Class 12', subject: 'Physics', monthlyFee: 4000 },
    { id: 's7', name: 'Ishita Gupta', className: 'Class 5', subject: 'Maths', monthlyFee: 1500 },
    { id: 's8', name: 'Aditya Singh', className: 'Class 11', subject: 'Chemistry', monthlyFee: 3500 },
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

  const bills: Bill[] = [
    { id: 'b-rent', name: 'Rent (study room)', amount: 8000, dayOfMonth: 1 },
    { id: 'b-electricity', name: 'Electricity', amount: 800, dayOfMonth: 5 },
    { id: 'b-internet', name: 'Internet', amount: 999, dayOfMonth: 10 },
    { id: 'b-materials', name: 'Study materials', amount: 1500, dayOfMonth: 15 },
    { id: 'b-transport', name: 'Transport', amount: 2000, dayOfMonth: 20 },
    { id: 'b-table', name: 'Study table plus whiteboard', amount: 6500, oneTimeDate: '2026-11-28' },
  ];

  return {
    version: 1,
    referenceDate: '2026-11-21',
    openingCash: 12000,
    safetyBuffer: 10000,
    students,
    invoices,
    bills,
  };
}
