'use client'

import { useState } from 'react'
import { AdminLayout } from '@/components/layout/AdminLayout'
import {
  Settings as SettingsIcon,
  Palette,
  Upload,
  Users,
  GraduationCap,
  Layers,
  DollarSign,
  CreditCard,
  Bell,
  Shield,
  Zap
} from 'lucide-react'

// Import tab components
import { GeneralSettings } from './components/GeneralSettings'
import { BrandingSettings } from './components/BrandingSettings'
import { CoachesSettings } from './components/CoachesSettings'
import { ImportSettings } from './components/ImportSettings'
import { LevelsSettings } from './components/LevelsSettings'
import { FeeStructuresSettings } from './components/FeeStructuresSettings'
import { PaymentSettings } from './components/PaymentSettings'

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general')

  const tabs = [
    { id: 'general', name: 'General', icon: SettingsIcon, component: GeneralSettings },
    { id: 'branding', name: 'Branding', icon: Palette, component: BrandingSettings },
    { id: 'levels', name: 'Levels', icon: Layers, component: LevelsSettings },
    { id: 'fees', name: 'Fee Structures', icon: DollarSign, component: FeeStructuresSettings },
    { id: 'payments', name: 'Payment Methods', icon: CreditCard, component: PaymentSettings },
    { id: 'coaches', name: 'Coaches & Staff', icon: Users, component: CoachesSettings },
    { id: 'import', name: 'Data Import', icon: Upload, component: ImportSettings },
    // Future tabs
    // { id: 'classes', name: 'Classes', icon: GraduationCap },
    // { id: 'notifications', name: 'Notifications', icon: Bell },
    // { id: 'compliance', name: 'Compliance', icon: Shield },
    // { id: 'integrations', name: 'Integrations', icon: Zap },
  ]

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component

  return (
    <AdminLayout title="Settings" description="Manage your gymnastics club settings">
      <div className="space-y-6">
        {/* Tab Navigation */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="flex overflow-x-auto">
              {tabs.map((tab) => {
                const Icon = tab.icon
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
                      ${isActive
                        ? 'border-purple-600 text-purple-700 bg-purple-50'
                        : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }
                    `}
                  >
                    <Icon className="h-5 w-5" />
                    {tab.name}
                  </button>
                )
              })}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {ActiveComponent && <ActiveComponent />}
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
