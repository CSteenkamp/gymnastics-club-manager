'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import SignatureCanvas from 'react-signature-canvas'
import { Check, X, AlertCircle, FileText, Shield, Camera, Heart } from 'lucide-react'

interface Child {
  id: string
  firstName: string
  lastName: string
  dateOfBirth: string
}

interface ConsentData {
  participationConsent: boolean
  dataProcessingConsent: boolean
  mediaConsent: boolean
  emergencyMedicalConsent: boolean
  doctorName: string
  doctorPhone: string
  medicalAidName: string
  medicalAidNumber: string
  allergies: string
  medications: string
  signedByName: string
}

export default function POPIConsentPage() {
  const router = useRouter()
  const signaturePadRef = useRef<SignatureCanvas>(null)

  const [children, setChildren] = useState<Child[]>([])
  const [selectedChild, setSelectedChild] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [formData, setFormData] = useState<ConsentData>({
    participationConsent: false,
    dataProcessingConsent: false,
    mediaConsent: false,
    emergencyMedicalConsent: false,
    doctorName: '',
    doctorPhone: '',
    medicalAidName: '',
    medicalAidNumber: '',
    allergies: '',
    medications: '',
    signedByName: ''
  })

  const [clubName, setClubName] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const token = localStorage.getItem('token')

      // Load children
      const childrenRes = await fetch('/api/children', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      const childrenData = await childrenRes.json()
      if (childrenData.success && Array.isArray(childrenData.data)) {
        setChildren(childrenData.data)
        if (childrenData.data.length > 0) {
          setSelectedChild(childrenData.data[0].id)
        }
      }

      // Load club branding
      const brandingRes = await fetch('/api/clubs/branding', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const brandingData = await brandingRes.json()
      if (brandingData.success) {
        setClubName(brandingData.data.name)
      }

      setLoading(false)
    } catch (err) {
      setError('Failed to load data')
      setLoading(false)
    }
  }

  const clearSignature = () => {
    signaturePadRef.current?.clear()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedChild) {
      setError('Please select a child')
      return
    }

    if (!formData.participationConsent || !formData.dataProcessingConsent || !formData.emergencyMedicalConsent) {
      setError('You must consent to participation, data processing, and emergency medical treatment')
      return
    }

    if (signaturePadRef.current?.isEmpty()) {
      setError('Please provide your signature')
      return
    }

    if (!formData.signedByName.trim()) {
      setError('Please enter your full name')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const token = localStorage.getItem('token')
      const signatureData = signaturePadRef.current?.toDataURL()

      const response = await fetch('/api/consent/popi', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          childId: selectedChild,
          ...formData,
          signatureData
        })
      })

      const data = await response.json()

      if (data.success) {
        setSuccess(true)
        setTimeout(() => {
          router.push('/dashboard')
        }, 3000)
      } else {
        setError(data.error || 'Failed to submit consent form')
      }
    } catch (err) {
      setError('Failed to submit consent form')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Consent Form Submitted</h2>
          <p className="text-gray-600">Thank you for completing the POPI Act consent form. Redirecting to dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border-2 border-purple-200 p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            GYMNASTICS PARTICIPATION & POPI ACT CONSENT FORMS
          </h1>
          <p className="text-gray-600">
            This form must be completed annually for each child. All sections are required for continued participation.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-800">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Child Selection */}
          <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Child *
            </label>
            <select
              value={selectedChild}
              onChange={(e) => setSelectedChild(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              required
            >
              <option value="">-- Select a child --</option>
              {children.map((child) => (
                <option key={child.id} value={child.id}>
                  {child.firstName} {child.lastName}
                </option>
              ))}
            </select>
          </div>

          {/* Section 1: Participation Consent */}
          <div className="bg-white rounded-xl shadow-sm border-2 border-purple-200 p-6">
            <div className="flex items-start gap-3 mb-4">
              <FileText className="h-6 w-6 text-purple-600 flex-shrink-0" />
              <div>
                <h2 className="text-xl font-bold text-gray-900">1. Parent Consent and Acknowledgement</h2>
                <p className="text-sm text-gray-600 mt-1">Gym Name: {clubName}</p>
              </div>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-700 leading-relaxed">
                I, the undersigned parent/guardian, give permission for my child to participate in gymnastics classes and activities organized by {clubName}.
              </p>
              <p className="text-sm text-gray-700 leading-relaxed mt-3">
                I understand that:
              </p>
              <ul className="list-disc list-inside text-sm text-gray-700 mt-2 space-y-1 ml-4">
                <li>Gymnastics is a physical activity that carries certain inherent risks of injury.</li>
                <li>All reasonable precautions will be taken to ensure my child's safety.</li>
                <li>I will not hold {clubName}, its coaches, or staff liable for injuries sustained during normal participation, except in cases of gross negligence.</li>
              </ul>
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.participationConsent}
                onChange={(e) => setFormData({ ...formData, participationConsent: e.target.checked })}
                className="mt-1 h-5 w-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                required
              />
              <span className="text-sm text-gray-700">
                I consent to my child's participation in gymnastics activities *
              </span>
            </label>
          </div>

          {/* Section 2: POPI Data Processing */}
          <div className="bg-white rounded-xl shadow-sm border-2 border-blue-200 p-6">
            <div className="flex items-start gap-3 mb-4">
              <Shield className="h-6 w-6 text-blue-600 flex-shrink-0" />
              <div>
                <h2 className="text-xl font-bold text-gray-900">2. POPI ACT INFORMATION PROCESSING CONSENT</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Protection of Personal Information Act, 4 of 2013 (POPIA)
                </p>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-sm font-medium text-gray-900 mb-2">Purpose of Collection:</p>
              <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 ml-4">
                <li>Class registration and scheduling</li>
                <li>Communication regarding training, events, and fees</li>
                <li>Emergency contact purposes</li>
                <li>Performance tracking and development</li>
              </ul>

              <p className="text-sm font-medium text-gray-900 mt-4 mb-2">Information We May Collect:</p>
              <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 ml-4">
                <li>Child's name, age, date of birth</li>
                <li>Parent/guardian contact details</li>
                <li>Medical information relevant to participation</li>
                <li>Attendance and performance records</li>
                <li>Media (photos/videos) — only if separately consented below</li>
              </ul>

              <p className="text-sm text-gray-600 mt-4 italic">
                You may withdraw your consent at any time by submitting a written request.
              </p>
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.dataProcessingConsent}
                onChange={(e) => setFormData({ ...formData, dataProcessingConsent: e.target.checked })}
                className="mt-1 h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                required
              />
              <span className="text-sm text-gray-700">
                I consent to {clubName} collecting, storing, and processing my and my child's personal information for the purposes stated above *
              </span>
            </label>
          </div>

          {/* Section 3: Media Consent */}
          <div className="bg-white rounded-xl shadow-sm border-2 border-emerald-200 p-6">
            <div className="flex items-start gap-3 mb-4">
              <Camera className="h-6 w-6 text-emerald-600 flex-shrink-0" />
              <div>
                <h2 className="text-xl font-bold text-gray-900">3. MEDIA CONSENT FORM</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Photos and videos for promotional purposes
                </p>
              </div>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-700">
                We occasionally take photographs or videos during training sessions, events, and competitions for promotional or social media purposes.
              </p>
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.mediaConsent}
                onChange={(e) => setFormData({ ...formData, mediaConsent: e.target.checked })}
                className="mt-1 h-5 w-5 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
              />
              <span className="text-sm text-gray-700">
                I consent to my child's image/video being used on social media, websites, and promotional material for {clubName}
              </span>
            </label>
          </div>

          {/* Section 4: Medical Information */}
          <div className="bg-white rounded-xl shadow-sm border-2 border-orange-200 p-6">
            <div className="flex items-start gap-3 mb-4">
              <Heart className="h-6 w-6 text-orange-600 flex-shrink-0" />
              <div>
                <h2 className="text-xl font-bold text-gray-900">4. MEDICAL AND EMERGENCY CONSENT FORM</h2>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Doctor's Name
                </label>
                <input
                  type="text"
                  value={formData.doctorName}
                  onChange={(e) => setFormData({ ...formData, doctorName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Dr. Smith"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Doctor's Phone
                </label>
                <input
                  type="tel"
                  value={formData.doctorPhone}
                  onChange={(e) => setFormData({ ...formData, doctorPhone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="021 123 4567"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Medical Aid Provider
                </label>
                <input
                  type="text"
                  value={formData.medicalAidName}
                  onChange={(e) => setFormData({ ...formData, medicalAidName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Discovery Health"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Medical Aid Number
                </label>
                <input
                  type="text"
                  value={formData.medicalAidNumber}
                  onChange={(e) => setFormData({ ...formData, medicalAidNumber: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="1234567890"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Allergies or Medical Conditions
                </label>
                <textarea
                  value={formData.allergies}
                  onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  rows={2}
                  placeholder="Please list any allergies, asthma, epilepsy, etc."
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Medications
                </label>
                <textarea
                  value={formData.medications}
                  onChange={(e) => setFormData({ ...formData, medications: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  rows={2}
                  placeholder="Please list any medications your child is currently taking"
                />
              </div>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
              <p className="text-sm font-medium text-gray-900 mb-2">Emergency Consent:</p>
              <p className="text-sm text-gray-700">
                In the event of an emergency, I authorize the staff of {clubName} to obtain medical assistance or transport my child to a medical facility if necessary. I accept full financial responsibility for any medical treatment incurred.
              </p>
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.emergencyMedicalConsent}
                onChange={(e) => setFormData({ ...formData, emergencyMedicalConsent: e.target.checked })}
                className="mt-1 h-5 w-5 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                required
              />
              <span className="text-sm text-gray-700">
                I authorize emergency medical treatment and accept financial responsibility *
              </span>
            </label>
          </div>

          {/* Digital Signature */}
          <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Digital Signature</h2>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Parent/Guardian Full Name *
              </label>
              <input
                type="text"
                value={formData.signedByName}
                onChange={(e) => setFormData({ ...formData, signedByName: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="Enter your full name"
                required
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Signature *
              </label>
              <div className="border-2 border-gray-300 rounded-lg overflow-hidden bg-white">
                <SignatureCanvas
                  ref={signaturePadRef}
                  canvasProps={{
                    className: 'w-full h-48'
                  }}
                />
              </div>
              <button
                type="button"
                onClick={clearSignature}
                className="mt-2 text-sm text-purple-600 hover:text-purple-700 font-medium"
              >
                Clear Signature
              </button>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-900 mb-2">Declaration:</p>
              <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 ml-4">
                <li>The information provided is true and correct</li>
                <li>I have read and understood the POPIA notice and consent terms</li>
                <li>I understand my rights to access, amend, or delete my personal data</li>
                <li>This consent is valid for the current calendar year ({new Date().getFullYear()})</li>
              </ul>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Submitting...' : 'Submit Consent Form'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
