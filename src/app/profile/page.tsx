'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ParentLayout } from '@/components/layout/ParentLayout'
import { Button } from '@/components/ui/button'
import { User, Phone, Mail, MapPin, Lock, Save, AlertCircle, CheckCircle, Heart, Users } from 'lucide-react'

interface UserProfile {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  address?: string
  emergencyContactName?: string
  emergencyContactPhone?: string
  emergencyContactRelation?: string
}

interface Child {
  id: string
  firstName: string
  lastName: string
  dateOfBirth: string
  doctorName?: string
  doctorPhone?: string
  medicalAidName?: string
  medicalAidNumber?: string
  allergies?: string
  medications?: string
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [children, setChildren] = useState<Child[]>([])
  const [selectedChild, setSelectedChild] = useState<string>('')
  const [isEditing, setIsEditing] = useState(false)
  const [isEditingChild, setIsEditingChild] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const router = useRouter()

  useEffect(() => {
    loadProfile()
    loadChildren()
  }, [])

  const loadProfile = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/login')
        return
      }

      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setProfile(data.data)
        }
      } else {
        router.push('/login')
      }
    } catch (error) {
      console.error('Error loading profile:', error)
      setMessage({ type: 'error', text: 'Failed to load profile' })
    }
  }

  const loadChildren = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/children', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && Array.isArray(data.data)) {
          setChildren(data.data)
          if (data.data.length > 0 && !selectedChild) {
            setSelectedChild(data.data[0].id)
          }
        }
      }
    } catch (error) {
      console.error('Error loading children:', error)
    }
  }

  const handleSaveProfile = async () => {
    if (!profile) return

    setIsSaving(true)
    setMessage(null)

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          firstName: profile.firstName,
          lastName: profile.lastName,
          phone: profile.phone,
          address: profile.address,
          emergencyContactName: profile.emergencyContactName,
          emergencyContactPhone: profile.emergencyContactPhone,
          emergencyContactRelation: profile.emergencyContactRelation
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setMessage({ type: 'success', text: 'Parent information updated successfully!' })
          setIsEditing(false)

          // Update localStorage
          const userData = localStorage.getItem('user')
          if (userData) {
            const user = JSON.parse(userData)
            localStorage.setItem('user', JSON.stringify({ ...user, ...profile }))
          }
        }
      } else {
        const errorData = await response.json()
        setMessage({ type: 'error', text: errorData.error || 'Failed to update profile' })
      }
    } catch (error) {
      console.error('Error saving profile:', error)
      setMessage({ type: 'error', text: 'Failed to update profile' })
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveChildMedical = async () => {
    const child = children.find(c => c.id === selectedChild)
    if (!child) return

    setIsSaving(true)
    setMessage(null)

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/children/${child.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          doctorName: child.doctorName,
          doctorPhone: child.doctorPhone,
          medicalAidName: child.medicalAidName,
          medicalAidNumber: child.medicalAidNumber,
          allergies: child.allergies,
          medications: child.medications
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setMessage({ type: 'success', text: 'Medical information updated successfully!' })
          setIsEditingChild(false)
          loadChildren()
        }
      } else {
        const errorData = await response.json()
        setMessage({ type: 'error', text: errorData.error || 'Failed to update medical information' })
      }
    } catch (error) {
      console.error('Error saving medical info:', error)
      setMessage({ type: 'error', text: 'Failed to update medical information' })
    } finally {
      setIsSaving(false)
    }
  }

  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' })
      return
    }

    if (passwordForm.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' })
      return
    }

    setIsSaving(true)
    setMessage(null)

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/users/change-password', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        })
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Password changed successfully!' })
        setShowPasswordModal(false)
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      } else {
        const errorData = await response.json()
        setMessage({ type: 'error', text: errorData.error || 'Failed to change password' })
      }
    } catch (error) {
      console.error('Error changing password:', error)
      setMessage({ type: 'error', text: 'Failed to change password' })
    } finally {
      setIsSaving(false)
    }
  }

  const selectedChildData = children.find(c => c.id === selectedChild)

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg text-gray-600">Loading profile...</div>
      </div>
    )
  }

  return (
    <ParentLayout title="Family Profile" description="Manage parent and children information">
      <div className="space-y-6">

          {/* Messages */}
          {message && (
            <div className={`p-4 rounded-lg flex items-center gap-3 ${
              message.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
            }`}>
              {message.type === 'success' ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600" />
              )}
              <span className={message.type === 'success' ? 'text-green-800' : 'text-red-800'}>
                {message.text}
              </span>
            </div>
          )}

          {/* SECTION 1: PARENT/GUARDIAN INFORMATION */}
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl shadow-sm border-2 border-purple-200 p-6">
            <div className="bg-purple-600 text-white rounded-lg px-4 py-2 inline-flex items-center gap-2 mb-4">
              <User className="h-5 w-5" />
              <span className="font-semibold">SECTION 1: PARENT/GUARDIAN CONTACT INFORMATION</span>
            </div>
            <p className="text-sm text-gray-700 mb-4">
              This is <strong>YOUR</strong> information as the parent/guardian. We use this to contact you regarding your child's activities, fees, and important updates.
            </p>

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Your Contact Details</h3>
                {!isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-purple-600 hover:text-purple-700 font-medium"
                  >
                    Edit
                  </button>
                )}
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Your First Name
                    </label>
                    <input
                      type="text"
                      value={profile.firstName}
                      onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                      disabled={!isEditing}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 disabled:bg-gray-50 disabled:text-gray-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Your Last Name
                    </label>
                    <input
                      type="text"
                      value={profile.lastName}
                      onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                      disabled={!isEditing}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 disabled:bg-gray-50 disabled:text-gray-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Your Email Address
                  </label>
                  <input
                    type="email"
                    value={profile.email}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Email cannot be changed. Contact admin if needed.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Your Phone Number
                  </label>
                  <input
                    type="tel"
                    value={profile.phone || ''}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    disabled={!isEditing}
                    placeholder="+27 12 345 6789"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Your Home Address
                  </label>
                  <textarea
                    value={profile.address || ''}
                    onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                    disabled={!isEditing}
                    rows={3}
                    placeholder="Enter your full home address"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>

                {isEditing && (
                  <div className="flex gap-3 pt-4 border-t">
                    <button
                      onClick={handleSaveProfile}
                      disabled={isSaving}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                    >
                      <Save className="h-4 w-4" />
                      {isSaving ? 'Saving...' : 'Save Parent Information'}
                    </button>
                    <button
                      onClick={() => {
                        setIsEditing(false)
                        loadProfile()
                      }}
                      disabled={isSaving}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 2: EMERGENCY CONTACT */}
          <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-xl shadow-sm border-2 border-orange-200 p-6">
            <div className="bg-orange-600 text-white rounded-lg px-4 py-2 inline-flex items-center gap-2 mb-4">
              <AlertCircle className="h-5 w-5" />
              <span className="font-semibold">SECTION 2: EMERGENCY CONTACT (If we can't reach you)</span>
            </div>
            <p className="text-sm text-gray-700 mb-4">
              Provide an <strong>alternative contact person</strong> we can reach if you are unavailable in case of an emergency.
            </p>

            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Emergency Contact Name
                </label>
                <input
                  type="text"
                  value={profile.emergencyContactName || ''}
                  onChange={(e) => setProfile({ ...profile, emergencyContactName: e.target.value })}
                  disabled={!isEditing}
                  placeholder="Full name of emergency contact"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 disabled:bg-gray-50 disabled:text-gray-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Emergency Contact Phone
                  </label>
                  <input
                    type="tel"
                    value={profile.emergencyContactPhone || ''}
                    onChange={(e) => setProfile({ ...profile, emergencyContactPhone: e.target.value })}
                    disabled={!isEditing}
                    placeholder="+27 12 345 6789"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Relationship to You
                  </label>
                  <input
                    type="text"
                    value={profile.emergencyContactRelation || ''}
                    onChange={(e) => setProfile({ ...profile, emergencyContactRelation: e.target.value })}
                    disabled={!isEditing}
                    placeholder="e.g., Spouse, Parent, Sibling"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: CHILD'S MEDICAL INFORMATION */}
          {children.length > 0 && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl shadow-sm border-2 border-green-200 p-6">
              <div className="bg-green-600 text-white rounded-lg px-4 py-2 inline-flex items-center gap-2 mb-4">
                <Heart className="h-5 w-5" />
                <span className="font-semibold">SECTION 3: YOUR CHILD'S MEDICAL INFORMATION</span>
              </div>
              <p className="text-sm text-gray-700 mb-4">
                This is <strong>YOUR CHILD'S</strong> medical information. We need this in case of a medical emergency during activities.
              </p>

              {children.length > 1 && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Child
                  </label>
                  <select
                    value={selectedChild}
                    onChange={(e) => setSelectedChild(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
                  >
                    {children.map((child) => (
                      <option key={child.id} value={child.id}>
                        {child.firstName} {child.lastName}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {selectedChildData && (
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Medical Info for: {selectedChildData.firstName} {selectedChildData.lastName}
                    </h3>
                    {!isEditingChild && (
                      <button
                        onClick={() => setIsEditingChild(true)}
                        className="text-green-600 hover:text-green-700 font-medium"
                      >
                        Edit
                      </button>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Doctor's Name
                        </label>
                        <input
                          type="text"
                          value={selectedChildData.doctorName || ''}
                          onChange={(e) => {
                            const updated = children.map(c =>
                              c.id === selectedChild ? { ...c, doctorName: e.target.value } : c
                            )
                            setChildren(updated)
                          }}
                          disabled={!isEditingChild}
                          placeholder="Dr. Smith"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:bg-gray-50 disabled:text-gray-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Doctor's Phone Number
                        </label>
                        <input
                          type="tel"
                          value={selectedChildData.doctorPhone || ''}
                          onChange={(e) => {
                            const updated = children.map(c =>
                              c.id === selectedChild ? { ...c, doctorPhone: e.target.value } : c
                            )
                            setChildren(updated)
                          }}
                          disabled={!isEditingChild}
                          placeholder="021 123 4567"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:bg-gray-50 disabled:text-gray-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Medical Aid Provider
                        </label>
                        <input
                          type="text"
                          value={selectedChildData.medicalAidName || ''}
                          onChange={(e) => {
                            const updated = children.map(c =>
                              c.id === selectedChild ? { ...c, medicalAidName: e.target.value } : c
                            )
                            setChildren(updated)
                          }}
                          disabled={!isEditingChild}
                          placeholder="Discovery Health"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:bg-gray-50 disabled:text-gray-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Medical Aid Number
                        </label>
                        <input
                          type="text"
                          value={selectedChildData.medicalAidNumber || ''}
                          onChange={(e) => {
                            const updated = children.map(c =>
                              c.id === selectedChild ? { ...c, medicalAidNumber: e.target.value } : c
                            )
                            setChildren(updated)
                          }}
                          disabled={!isEditingChild}
                          placeholder="1234567890"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:bg-gray-50 disabled:text-gray-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Allergies or Medical Conditions
                      </label>
                      <textarea
                        value={selectedChildData.allergies || ''}
                        onChange={(e) => {
                          const updated = children.map(c =>
                            c.id === selectedChild ? { ...c, allergies: e.target.value } : c
                          )
                          setChildren(updated)
                        }}
                        disabled={!isEditingChild}
                        rows={3}
                        placeholder="Please list any allergies, asthma, epilepsy, etc."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:bg-gray-50 disabled:text-gray-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Current Medications
                      </label>
                      <textarea
                        value={selectedChildData.medications || ''}
                        onChange={(e) => {
                          const updated = children.map(c =>
                            c.id === selectedChild ? { ...c, medications: e.target.value } : c
                          )
                          setChildren(updated)
                        }}
                        disabled={!isEditingChild}
                        rows={3}
                        placeholder="Please list any medications your child is currently taking"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:bg-gray-50 disabled:text-gray-500"
                      />
                    </div>

                    {isEditingChild && (
                      <div className="flex gap-3 pt-4 border-t">
                        <button
                          onClick={handleSaveChildMedical}
                          disabled={isSaving}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                        >
                          <Save className="h-4 w-4" />
                          {isSaving ? 'Saving...' : 'Save Medical Information'}
                        </button>
                        <button
                          onClick={() => {
                            setIsEditingChild(false)
                            loadChildren()
                          }}
                          disabled={isSaving}
                          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Security Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Lock className="h-5 w-5 text-red-600" />
                Account Security
              </h2>
            </div>
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">Password</h3>
                  <p className="text-sm text-gray-600">Change your account password</p>
                </div>
                <button
                  onClick={() => setShowPasswordModal(true)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Change Password
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Password Change Modal */}
        {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-xl font-semibold text-gray-900">Change Password</h3>
              <button
                onClick={() => {
                  setShowPasswordModal(false)
                  setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
                  setMessage(null)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Password
                </label>
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
              <button
                onClick={handleChangePassword}
                disabled={isSaving}
                className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                {isSaving ? 'Changing...' : 'Change Password'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ParentLayout>
  )
}
