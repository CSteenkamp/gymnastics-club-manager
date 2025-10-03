'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface NotificationConfig {
  email: {
    configured: boolean
    host: string
    user: string
    from: string
  }
  sms: {
    configured: boolean
    provider: string
    apiKey: string
    username: string
  }
  recommendations: string[]
}

export default function NotificationsPage() {
  const [user, setUser] = useState<any>(null)
  const [config, setConfig] = useState<NotificationConfig | null>(null)
  const [testResults, setTestResults] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [testForm, setTestForm] = useState({
    type: 'email',
    to: '',
    message: 'This is a test notification from the gymnastics club management system.'
  })
  const router = useRouter()

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')
    
    if (!token || !userData) {
      router.push('/login')
      return
    }

    const parsedUser = JSON.parse(userData)
    if (parsedUser.role !== 'ADMIN' && parsedUser.role !== 'FINANCE_ADMIN') {
      router.push('/dashboard')
      return
    }

    setUser(parsedUser)
    loadNotificationConfig()
  }, [router])

  const loadNotificationConfig = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/notifications/test', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setConfig(data.data)
      }
    } catch (error) {
      console.error('Failed to load notification config:', error)
    }
  }

  const handleTestNotification = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setTestResults(null)

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(testForm)
      })

      const data = await response.json()
      setTestResults(data)
    } catch (error) {
      console.error('Test notification failed:', error)
      setTestResults({
        success: false,
        error: 'Network error occurred'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      router.push('/login')
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Notification Management
              </h1>
              <p className="text-gray-600">Configure and test email & SMS notifications</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/admin')}
                className="text-purple-600 hover:text-purple-700 transition-colors"
              >
                ← Back to Dashboard
              </button>
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0 space-y-8">
          
          {/* Configuration Status */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Configuration Status</h2>
            </div>
            <div className="p-6">
              {config ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Email Configuration */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center mb-3">
                      <span className="text-2xl mr-3">📧</span>
                      <h3 className="text-lg font-semibold">Email</h3>
                      <span className={`ml-auto px-2 py-1 rounded-full text-xs font-medium ${
                        config.email.configured 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {config.email.configured ? 'Configured' : 'Not Configured'}
                      </span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div><strong>Host:</strong> {config.email.host}</div>
                      <div><strong>User:</strong> {config.email.user}</div>
                      <div><strong>From:</strong> {config.email.from}</div>
                    </div>
                  </div>

                  {/* SMS Configuration */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center mb-3">
                      <span className="text-2xl mr-3">📱</span>
                      <h3 className="text-lg font-semibold">SMS</h3>
                      <span className={`ml-auto px-2 py-1 rounded-full text-xs font-medium ${
                        config.sms.configured 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {config.sms.configured ? 'Configured' : 'Not Configured'}
                      </span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div><strong>Provider:</strong> {config.sms.provider}</div>
                      <div><strong>API Key:</strong> {config.sms.apiKey}</div>
                      <div><strong>Username:</strong> {config.sms.username}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-500">Loading configuration...</div>
                </div>
              )}

              {/* Recommendations */}
              {config && config.recommendations.length > 0 && (
                <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-semibold text-yellow-800 mb-2">⚠️ Configuration Recommendations:</h4>
                  <ul className="list-disc list-inside text-yellow-700 space-y-1">
                    {config.recommendations.map((rec, index) => (
                      <li key={index}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Test Notifications */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Test Notifications</h2>
            </div>
            <div className="p-6">
              <form onSubmit={handleTestNotification} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notification Type
                    </label>
                    <select
                      value={testForm.type}
                      onChange={(e) => setTestForm(prev => ({ ...prev, type: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    >
                      <option value="email">Email Only</option>
                      <option value="sms">SMS Only</option>
                      <option value="both">Both Email & SMS</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {testForm.type === 'email' ? 'Email Address' : testForm.type === 'sms' ? 'Phone Number' : 'Email or Phone'}
                    </label>
                    <input
                      type={testForm.type === 'email' ? 'email' : 'text'}
                      value={testForm.to}
                      onChange={(e) => setTestForm(prev => ({ ...prev, to: e.target.value }))}
                      placeholder={testForm.type === 'email' ? 'test@example.com' : testForm.type === 'sms' ? '+27123456789' : 'email@example.com or +27123456789'}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                        isLoading
                          ? 'bg-gray-400 cursor-not-allowed text-white'
                          : 'bg-purple-600 hover:bg-purple-700 text-white'
                      }`}
                    >
                      {isLoading ? 'Sending...' : 'Send Test'}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Test Message
                  </label>
                  <textarea
                    value={testForm.message}
                    onChange={(e) => setTestForm(prev => ({ ...prev, message: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="Enter a custom test message..."
                  />
                </div>
              </form>

              {/* Test Results */}
              {testResults && (
                <div className="mt-6">
                  <h3 className="font-semibold text-gray-900 mb-3">Test Results:</h3>
                  <div className={`p-4 rounded-lg border ${
                    testResults.success 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-red-50 border-red-200'
                  }`}>
                    {testResults.success ? (
                      <div>
                        <div className="flex items-center text-green-800 mb-2">
                          <span className="text-xl mr-2">✅</span>
                          <span className="font-semibold">Test notifications sent successfully!</span>
                        </div>
                        {testResults.data.email && (
                          <div className="text-green-700 mb-1">
                            📧 Email sent to: {testResults.data.email.recipient}
                          </div>
                        )}
                        {testResults.data.sms && (
                          <div className="text-green-700">
                            📱 SMS sent to: {testResults.data.sms.recipient}
                            {testResults.data.sms.messageId && (
                              <span className="text-sm ml-2">(ID: {testResults.data.sms.messageId})</span>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center text-red-800 mb-2">
                          <span className="text-xl mr-2">❌</span>
                          <span className="font-semibold">Test failed</span>
                        </div>
                        <div className="text-red-700">{testResults.error}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Usage Instructions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Configuration Instructions</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">📧 Email Setup</h3>
                  <div className="text-sm text-gray-600 space-y-2">
                    <p>Add these environment variables to your <code className="bg-gray-100 px-1 rounded">.env</code> file:</p>
                    <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto">
{`EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=noreply@ceresgymnastics.co.za`}
                    </pre>
                    <p><strong>Note:</strong> For Gmail, use an App Password, not your regular password.</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">📱 SMS Setup</h3>
                  <div className="text-sm text-gray-600 space-y-2">
                    <p>Choose a South African SMS provider and add to <code className="bg-gray-100 px-1 rounded">.env</code>:</p>
                    <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto">
{`# For Clickatell
SMS_PROVIDER=clickatell
SMS_API_KEY=your-clickatell-api-key

# For BulkSMS
SMS_PROVIDER=bulksms
SMS_USERNAME=your-bulksms-username
SMS_API_KEY=your-bulksms-password`}
                    </pre>
                    <p><strong>Supported providers:</strong> Clickatell, BulkSMS</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}