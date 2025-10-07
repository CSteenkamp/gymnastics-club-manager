# Database Update for Extra Lessons Feature

## Required Schema Changes

To support the extra lessons booking feature on the calendar, you need to add an `isExtraLesson` field to the `schedules` table.

### Option 1: Using Prisma Migrate (Recommended)

1. Update your `schema.prisma` file to add the new field to the `Schedule` model:

```prisma
model Schedule {
  id          String    @id @default(cuid())
  clubId      String
  classId     String?
  name        String
  description String?
  level       String
  dayOfWeek   String
  startTime   String
  endTime     String
  maxCapacity Int       @default(20)
  venue       String
  coachId     String?
  isExtraLesson Boolean @default(false)  // <-- ADD THIS LINE
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  // ... rest of the model
  @@map("schedules")
}
```

2. Create and apply the migration:

```bash
npx prisma migrate dev --name add_is_extra_lesson_to_schedules
```

### Option 2: Direct SQL (For Development/Testing)

If you're in development mode and using `prisma db push`, run this SQL command directly in your PostgreSQL database:

```sql
ALTER TABLE schedules
ADD COLUMN "isExtraLesson" BOOLEAN NOT NULL DEFAULT false;
```

Then regenerate the Prisma client:

```bash
npx prisma generate
```

### Option 3: Using Prisma DB Push (Development Only)

1. Add the field to your `schema.prisma` as shown in Option 1
2. Push the changes:

```bash
npx prisma db push
```

## How to Mark Classes as Extra Lessons

### Via SQL

To mark specific classes as extra lessons (make them bookable via calendar):

```sql
-- Mark specific schedules as extra lessons
UPDATE schedules
SET "isExtraLesson" = true
WHERE id IN ('schedule-id-1', 'schedule-id-2');

-- Or mark by name pattern (e.g., all "Extra" classes)
UPDATE schedules
SET "isExtraLesson" = true
WHERE name LIKE '%Extra%' OR name LIKE '%Make-up%';
```

### Via Admin Interface (Future Enhancement)

You can add a toggle in your admin panel to mark classes as extra lessons. For now, use SQL to set this field.

## Testing the Feature

1. After applying the schema change, create a test schedule marked as an extra lesson:

```sql
INSERT INTO schedules (
  id, "clubId", name, level, "dayOfWeek", "startTime", "endTime",
  "maxCapacity", venue, "isExtraLesson", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid()::text,
  'your-club-id',
  'Extra Session - Level 1',
  'Level 1',
  'Saturday',
  '10:00',
  '11:00',
  15,
  'Main Gym',
  true,
  NOW(),
  NOW()
);
```

2. Log in as a parent and view the dashboard
3. The extra lesson should appear in green on the calendar
4. Click on it and book it for one of your children
5. Check your console logs for the email notification output

## Email Notification Setup

The booking system currently logs email notifications to the console. To enable actual email sending:

### Option 1: SendGrid

```bash
npm install @sendgrid/mail
```

Create `.env` entry:
```env
SENDGRID_API_KEY=your-sendgrid-api-key
EMAIL_FROM=noreply@yourclub.com
```

Update `/src/app/api/schedules/book-extra-lesson/route.ts`:

```typescript
import sgMail from '@sendgrid/mail'

async function sendEmailNotification(to: string, subject: string, html: string) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY!)

  await sgMail.send({
    to,
    from: process.env.EMAIL_FROM!,
    subject,
    html
  })
}
```

### Option 2: Nodemailer (SMTP)

```bash
npm install nodemailer
```

Create `.env` entries:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=noreply@yourclub.com
```

Update `/src/app/api/schedules/book-extra-lesson/route.ts`:

```typescript
import nodemailer from 'nodemailer'

async function sendEmailNotification(to: string, subject: string, html: string) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT!),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  })

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject,
    html
  })
}
```

## Verifying Everything Works

1. ✅ Database has `isExtraLesson` column
2. ✅ Some schedules are marked as extra lessons
3. ✅ Calendar displays on dashboard as first item
4. ✅ Enrolled classes highlighted in purple
5. ✅ Extra lessons shown in green
6. ✅ Clicking extra lesson opens booking modal
7. ✅ Can select child and confirm booking
8. ✅ Email notification sent (check console or email inbox)
9. ✅ Calendar updates to show child enrolled in the lesson

## Troubleshooting

### Calendar not showing
- Check browser console for errors
- Verify API endpoint `/api/schedules/calendar` returns data
- Check that user has active children

### Extra lessons not appearing
- Verify `isExtraLesson` is set to `true` in database
- Check that the schedule's day matches calendar dates
- Ensure max capacity isn't reached

### Booking fails
- Check that child belongs to the logged-in parent
- Verify schedule isn't full
- Check that child isn't already enrolled

### Email not sending
- If using console logging: check terminal output
- If using email service: verify API keys and credentials
- Check that club has admin users with `emailNotifications: true`
