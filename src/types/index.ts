import { User, Club, Child, Invoice, Payment, FeeStructure, UserRole, ChildStatus, InvoiceStatus, PaymentMethod, InvoiceItemType } from '@prisma/client'

// Extend Prisma types with computed properties
export interface UserWithRelations extends User {
  club: Club
  children: Child[]
}

export interface ChildWithRelations extends Child {
  parents: User[]
  club: Club
}

export interface InvoiceWithRelations extends Invoice {
  user: User
  club: Club
  items: InvoiceItemWithRelations[]
  payments: Payment[]
}

export interface InvoiceItemWithRelations {
  id: string
  invoiceId: string
  childId: string | null
  description: string
  amount: number
  quantity: number
  type: InvoiceItemType
  child?: Child
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Form types
export interface RegisterForm {
  firstName: string
  lastName: string
  email: string
  phone: string
  password: string
  confirmPassword: string
}

export interface LoginForm {
  email: string
  password: string
}

export interface ChildForm {
  firstName: string
  lastName: string
  dateOfBirth?: string
  level: string
  monthlyFee?: number
  notes?: string
}

export interface PaymentForm {
  amount: number
  method: PaymentMethod
  reference?: string
  notes?: string
}

// Dashboard types
export interface DashboardStats {
  totalChildren: number
  totalOutstanding: number
  totalOverdue: number
  totalPaidThisMonth: number
  recentPayments: Payment[]
  overdueInvoices: Invoice[]
}

export interface ParentDashboard {
  children: ChildWithRelations[]
  outstandingBalance: number
  recentInvoices: InvoiceWithRelations[]
  recentPayments: Payment[]
  nextPaymentDue?: Date
}

// Export Prisma enums for convenience
export { UserRole, ChildStatus, InvoiceStatus, PaymentMethod, InvoiceItemType }