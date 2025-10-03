# Gymnastics Club Management System

A comprehensive web-based management system designed for gymnastics clubs, starting with Ceres Gymnastics Club. The system provides parent-friendly frontend access and a powerful admin backend for managing fees, tracking payments, issuing invoices, and simplifying club workflows.

## 🚀 Features

### Core Features (Implemented)
- **Multi-tenant Architecture** - Supports multiple clubs with data isolation
- **User Management** - Parent/guardian and admin accounts with role-based access
- **Child Management** - Track children's details, levels, and status
- **Flexible Fee Management** - Configurable fee structures per level
- **Invoice Generation** - Automated monthly invoicing with PDF support
- **Payment Tracking** - Manual payment entry and reconciliation
- **Authentication** - Secure JWT-based authentication
- **Parent Dashboard** - View children, invoices, and balances

### Extended Features (Planned)
- **Online Payments** - South African payment gateway integration
- **Notification System** - Email and SMS notifications
- **Class Scheduling** - Manage classes and timetables
- **Reporting & Analytics** - Financial reports and insights
- **Document Management** - POPI Act compliance documents
- **Mobile Optimization** - Progressive Web App (PWA)
- **White-label Support** - Customizable branding per club

## 🛠️ Technology Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, React Hook Form
- **Backend**: Node.js, Express.js API routes
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT tokens with bcrypt password hashing
- **Infrastructure**: Docker, Redis (for caching/queues)
- **UI Components**: Radix UI primitives with shadcn/ui styling

## 📋 Prerequisites

- Node.js 18+ 
- PostgreSQL 15+
- Redis (optional, for production)
- Docker & Docker Compose (recommended)

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd gymnastics-club-manager
npm install
```

### 2. Environment Setup

```bash
cp .env.example .env
```

Update the `.env` file with your database credentials and configuration.

### 3. Database Setup

**Option A: Using Docker (Recommended)**
```bash
docker-compose up -d postgres redis
```

**Option B: Local PostgreSQL**
Ensure PostgreSQL is running and create a database named `gymnastics_club_manager`.

### 4. Database Migration and Seeding

```bash
# Generate Prisma client
npm run db:generate

# Run database migrations
npm run db:migrate

# Seed the database with sample data
npm run db:seed
```

### 5. Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

## 👥 Default Login Credentials

After seeding the database, you can log in with:

**Admin User:**
- Email: `admin@ceresgymnastics.co.za`
- Password: `admin123`

**Demo Parent:**
- Email: `parent@example.com`
- Password: `parent123`

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   ├── dashboard/         # Parent dashboard
│   ├── login/            # Authentication pages
│   └── register/
├── components/            # Reusable UI components
│   └── ui/               # Base UI components
├── lib/                  # Utility libraries
│   ├── auth.ts           # Authentication utilities
│   ├── invoice.ts        # Invoice generation logic
│   └── prisma.ts         # Database client
├── types/                # TypeScript type definitions
└── utils/                # Helper functions and validation
```

## 🗄️ Database Schema

The system uses a multi-tenant architecture with the following core entities:

- **Clubs** - Multi-tenant club management
- **Users** - Parents/guardians and admin users
- **Children** - Student information and status
- **FeeStructures** - Configurable fees per level
- **Invoices** - Monthly billing with line items
- **Payments** - Payment tracking and reconciliation
- **Classes & Schedules** - Class management
- **Documents** - Policy and form management
- **AuditLogs** - Activity tracking

## 🔧 Development Commands

```bash
# Development
npm run dev              # Start development server
npm run build            # Build for production
npm run start            # Start production server

# Database
npm run db:generate      # Generate Prisma client
npm run db:migrate       # Run database migrations
npm run db:studio        # Open Prisma Studio
npm run db:seed          # Seed database with sample data

# Utilities
npm run lint             # Run ESLint
```

## 🐳 Docker Development

Start the full development environment:

```bash
docker-compose up -d
```

This will start:
- PostgreSQL database on port 5432
- Redis on port 6379
- Application on port 3000

## 🔐 Security Features

- **Password Hashing** - bcrypt with salt rounds
- **JWT Authentication** - Secure token-based auth
- **Role-based Access** - Parent/Admin permission levels
- **Multi-tenant Isolation** - Data separation per club
- **POPI Act Compliance** - South African data protection
- **Audit Logging** - Track all administrative actions

## 🏗️ Architecture Decisions

### Multi-tenancy
The system uses a **single database, multi-tenant** approach where:
- All data includes a `clubId` field for isolation
- Row-level security ensures data separation
- Shared infrastructure reduces operational complexity

### Authentication
- JWT tokens stored in localStorage (consider httpOnly cookies for production)
- Middleware-based route protection
- Role-based access control (RBAC)

### Invoice Generation
- Automated monthly invoice creation
- Flexible fee structures per club and level
- Support for discounts, adjustments, and one-off items

## 🚧 Roadmap

### Phase 1: Core System ✅
- Basic user management and authentication
- Fee management and invoice generation
- Payment tracking
- Parent dashboard

### Phase 2: Enhanced Features (In Progress)
- Admin dashboard with advanced management
- Email/SMS notification system
- Class scheduling and management
- Financial reporting

### Phase 3: Scalability & Integration
- South African payment gateway integration
- Multi-club onboarding system
- White-label branding capabilities
- Mobile app (React Native)

### Phase 4: Advanced Features
- Accounting software integration (Xero, Sage)
- Advanced analytics and reporting
- Automated bank reconciliation
- API for third-party integrations

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is proprietary software developed for Ceres Gymnastics Club and licensed partners.

## 📞 Support

For support and questions, please contact:
- Email: info@ceresgymnastics.co.za
- Phone: +27 123 456 789

---

**Built with ❤️ for the South African gymnastics community**
