'use client'

import { ParentLayout } from '@/components/layout/ParentLayout'
import { ParentCreditAccount } from '@/components/credits/ParentCreditAccount'

export default function CreditsPage() {
  return (
    <ParentLayout title="Credit Account" description="Manage your prepayments and credit balance">
      <ParentCreditAccount />
    </ParentLayout>
  )
}