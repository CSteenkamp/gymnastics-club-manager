import { z } from 'zod'

// User validation schemas
export const registerSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Phone number must be at least 10 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
})

// Child validation schemas
export const childSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  dateOfBirth: z.string().optional(),
  gender: z.enum(['MALE', 'FEMALE']).optional(),
  level: z.string().min(1, 'Level is required'),
  monthlyFee: z.number().positive().optional(),
  notes: z.string().optional()
})

// Payment validation schemas
export const paymentSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  method: z.enum(['EFT', 'CASH', 'CARD', 'ONLINE', 'PAYFAST', 'YOCO', 'OZOW', 'OTHER']),
  reference: z.string().optional(),
  notes: z.string().optional()
})

// Club validation schemas
export const clubSchema = z.object({
  name: z.string().min(1, 'Club name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  address: z.string().optional()
})

// Fee structure validation
export const feeStructureSchema = z.object({
  level: z.string().min(1, 'Level is required'),
  monthlyFee: z.number().positive('Monthly fee must be positive'),
  description: z.string().optional()
})

// Utility functions
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function validatePhoneNumber(phone: string): boolean {
  // South African phone number validation
  const phoneRegex = /^(\+27|0)[0-9]{9}$/
  return phoneRegex.test(phone.replace(/\s/g, ''))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR'
  }).format(amount)
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('en-ZA').format(d)
}

export function generateInvoiceNumber(clubId: string, year: number, month: number): string {
  const clubCode = clubId.substring(0, 3).toUpperCase()
  const yearCode = year.toString().slice(-2)
  const monthCode = month.toString().padStart(2, '0')
  const timestamp = Date.now().toString().slice(-4)
  
  return `INV-${clubCode}-${yearCode}${monthCode}-${timestamp}`
}