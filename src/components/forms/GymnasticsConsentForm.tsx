'use client'

import { useState, useRef, useEffect } from 'react'
import { Check, X, FileText } from 'lucide-react'

interface GymnasticsConsentFormProps {
  clubName: string
  childName?: string
  childDateOfBirth?: string
  parentName?: string
  parentEmail?: string
  parentPhone?: string
  onSubmit: (data: ConsentFormData) => Promise<void>
  onCancel?: () => void
}

export interface ConsentFormData {
  // Child Information
  childFullName: string
  childDateOfBirth: string

  // Parent/Guardian Information
  parentGuardianName: string
  contactNumber: string
  email: string

  // Medical Information
  doctorName: string
  doctorPhone: string
  medicalAidProvider: string
  medicalAidNumber: string
  allergiesOrConditions: string
  medications: string

  // Consents
  participationConsent: boolean
  popiConsent: boolean
  mediaConsent: 'yes' | 'no' | ''
  emergencyConsent: boolean

  // Signature
  signature: string
  signatureDate: string
}

export function GymnasticsConsentForm({
  clubName,
  childName = '',
  childDateOfBirth = '',
  parentName = '',
  parentEmail = '',
  parentPhone = '',
  onSubmit,
  onCancel
}: GymnasticsConsentFormProps) {
  const [formData, setFormData] = useState<ConsentFormData>({
    childFullName: childName,
    childDateOfBirth: childDateOfBirth,
    parentGuardianName: parentName,
    contactNumber: parentPhone,
    email: parentEmail,
    doctorName: '',
    doctorPhone: '',
    medicalAidProvider: '',
    medicalAidNumber: '',
    allergiesOrConditions: '',
    medications: '',
    participationConsent: false,
    popiConsent: false,
    mediaConsent: '',
    emergencyConsent: false,
    signature: '',
    signatureDate: ''
  })

  const [isDrawing, setIsDrawing] = useState(false)
  const [isSigning, setIsSigning] = useState(false)
  const [showSignatureModal, setShowSignatureModal] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true)
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top

    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top

    ctx.lineTo(x, y)
    ctx.strokeStyle = '#000'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.stroke()
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const clearSignature = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  const saveSignature = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const signatureData = canvas.toDataURL('image/png')
    setFormData(prev => ({
      ...prev,
      signature: signatureData,
      signatureDate: new Date().toISOString()
    }))
    setShowSignatureModal(false)
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.childFullName.trim()) newErrors.childFullName = 'Child name is required'
    if (!formData.childDateOfBirth) newErrors.childDateOfBirth = 'Date of birth is required'
    if (!formData.parentGuardianName.trim()) newErrors.parentGuardianName = 'Parent/Guardian name is required'
    if (!formData.contactNumber.trim()) newErrors.contactNumber = 'Contact number is required'
    if (!formData.email.trim()) newErrors.email = 'Email is required'
    if (!formData.participationConsent) newErrors.participationConsent = 'Participation consent is required'
    if (!formData.popiConsent) newErrors.popiConsent = 'POPI consent is required'
    if (!formData.mediaConsent) newErrors.mediaConsent = 'Media consent selection is required'
    if (!formData.emergencyConsent) newErrors.emergencyConsent = 'Emergency consent is required'
    if (!formData.signature) newErrors.signature = 'Digital signature is required'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      alert('Please fill in all required fields and provide your signature.')
      return
    }

    setIsSigning(true)
    try {
      await onSubmit(formData)
    } catch (error) {
      console.error('Error submitting form:', error)
      alert('Failed to submit form. Please try again.')
    } finally {
      setIsSigning(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg p-8">
      <div className="text-center mb-8">
        <FileText className="h-16 w-16 mx-auto mb-4 text-purple-600" />
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          GYMNASTICS PARTICIPATION & POPI ACT CONSENT FORMS
        </h1>
        <p className="text-gray-600">{clubName}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Section 1: Parent Consent and Acknowledgement */}
        <div className="border-t-4 border-purple-600 bg-gray-50 p-6 rounded-lg">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Parent Consent and Acknowledgement</h2>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Child's Full Name *
                </label>
                <input
                  type="text"
                  value={formData.childFullName}
                  onChange={(e) => setFormData({ ...formData, childFullName: e.target.value })}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
                    errors.childFullName ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.childFullName && <p className="text-red-500 text-sm mt-1">{errors.childFullName}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date of Birth *
                </label>
                <input
                  type="date"
                  value={formData.childDateOfBirth}
                  onChange={(e) => setFormData({ ...formData, childDateOfBirth: e.target.value })}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
                    errors.childDateOfBirth ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.childDateOfBirth && <p className="text-red-500 text-sm mt-1">{errors.childDateOfBirth}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Parent/Guardian Name *
                </label>
                <input
                  type="text"
                  value={formData.parentGuardianName}
                  onChange={(e) => setFormData({ ...formData, parentGuardianName: e.target.value })}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
                    errors.parentGuardianName ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.parentGuardianName && <p className="text-red-500 text-sm mt-1">{errors.parentGuardianName}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Number *
                </label>
                <input
                  type="tel"
                  value={formData.contactNumber}
                  onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
                    errors.contactNumber ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.contactNumber && <p className="text-red-500 text-sm mt-1">{errors.contactNumber}</p>}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
                    errors.email ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-3">Participation Consent</h3>
              <p className="text-sm text-gray-700 mb-4">
                I, the undersigned parent/guardian, give permission for my child to participate in gymnastics classes and activities organized by {clubName}.
              </p>
              <p className="text-sm text-gray-700 mb-2">I understand that:</p>
              <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 mb-4">
                <li>Gymnastics is a physical activity that carries certain inherent risks of injury.</li>
                <li>All reasonable precautions will be taken to ensure my child's safety.</li>
                <li>I will not hold {clubName}, its coaches, or staff liable for injuries sustained during normal participation, except in cases of gross negligence.</li>
              </ul>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.participationConsent}
                  onChange={(e) => setFormData({ ...formData, participationConsent: e.target.checked })}
                  className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                />
                <span className="text-sm font-medium text-gray-900">
                  I agree to the participation consent terms *
                </span>
              </label>
              {errors.participationConsent && <p className="text-red-500 text-sm mt-2">{errors.participationConsent}</p>}
            </div>
          </div>
        </div>

        {/* Section 2: POPI Act Information Processing Consent */}
        <div className="border-t-4 border-blue-600 bg-gray-50 p-6 rounded-lg">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">2. POPI ACT INFORMATION PROCESSING CONSENT</h2>

          <div className="bg-white p-4 rounded-lg border border-gray-200 mb-4">
            <p className="text-sm text-gray-700 mb-4">
              In accordance with the Protection of Personal Information Act, 4 of 2013 (POPIA), we are committed to protecting your and your child's personal information.
            </p>

            <h3 className="font-semibold text-gray-900 mb-2">Purpose of Collection:</h3>
            <p className="text-sm text-gray-700 mb-2">The information collected will be used for:</p>
            <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 mb-4">
              <li>Class registration and scheduling</li>
              <li>Communication regarding training, events, and fees</li>
              <li>Emergency contact purposes</li>
              <li>Performance tracking and development</li>
            </ul>

            <h3 className="font-semibold text-gray-900 mb-2">Information We May Collect:</h3>
            <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 mb-4">
              <li>Child's name, age, date of birth</li>
              <li>Parent/guardian contact details</li>
              <li>Medical information relevant to participation</li>
              <li>Attendance and performance records</li>
              <li>Media (photos/videos) — only if separately consented below</li>
            </ul>

            <p className="text-sm text-gray-700 mb-4">
              I consent to {clubName} collecting, storing, and processing my and my child's personal information for the purposes stated above.
            </p>
            <p className="text-sm text-gray-600 mb-4">
              I understand that I may withdraw my consent at any time by submitting a written request.
            </p>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={formData.popiConsent}
                onChange={(e) => setFormData({ ...formData, popiConsent: e.target.checked })}
                className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
              />
              <span className="text-sm font-medium text-gray-900">
                I agree to the POPI Act information processing terms *
              </span>
            </label>
            {errors.popiConsent && <p className="text-red-500 text-sm mt-2">{errors.popiConsent}</p>}
          </div>
        </div>

        {/* Section 3: Media Consent */}
        <div className="border-t-4 border-green-600 bg-gray-50 p-6 rounded-lg">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">3. MEDIA CONSENT FORM</h2>

          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-700 mb-4">
              We occasionally take photographs or videos during training sessions, events, and competitions for promotional or social media purposes.
            </p>

            <p className="text-sm font-medium text-gray-900 mb-3">Please indicate your preference: *</p>

            <div className="space-y-3">
              <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="radio"
                  name="mediaConsent"
                  value="yes"
                  checked={formData.mediaConsent === 'yes'}
                  onChange={(e) => setFormData({ ...formData, mediaConsent: e.target.value as 'yes' })}
                  className="w-5 h-5 text-purple-600 border-gray-300 focus:ring-purple-500"
                />
                <span className="text-sm text-gray-900">
                  I consent to my child's image/video being used on social media, websites, and promotional material for {clubName}.
                </span>
              </label>

              <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="radio"
                  name="mediaConsent"
                  value="no"
                  checked={formData.mediaConsent === 'no'}
                  onChange={(e) => setFormData({ ...formData, mediaConsent: e.target.value as 'no' })}
                  className="w-5 h-5 text-purple-600 border-gray-300 focus:ring-purple-500"
                />
                <span className="text-sm text-gray-900">
                  I do not consent to my child's image/video being used publicly.
                </span>
              </label>
            </div>
            {errors.mediaConsent && <p className="text-red-500 text-sm mt-2">{errors.mediaConsent}</p>}
          </div>
        </div>

        {/* Section 4: Medical and Emergency Consent */}
        <div className="border-t-4 border-red-600 bg-gray-50 p-6 rounded-lg">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">4. MEDICAL AND EMERGENCY CONSENT FORM</h2>

          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">Medical Information</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Doctor's Name
                </label>
                <input
                  type="text"
                  value={formData.doctorName}
                  onChange={(e) => setFormData({ ...formData, doctorName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Medical Aid Provider
                </label>
                <input
                  type="text"
                  value={formData.medicalAidProvider}
                  onChange={(e) => setFormData({ ...formData, medicalAidProvider: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Allergies or Conditions
                </label>
                <textarea
                  value={formData.allergiesOrConditions}
                  onChange={(e) => setFormData({ ...formData, allergiesOrConditions: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Please list any allergies, medical conditions, or concerns we should be aware of"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Medications
                </label>
                <textarea
                  value={formData.medications}
                  onChange={(e) => setFormData({ ...formData, medications: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Please list any medications your child is currently taking"
                />
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-gray-200 mt-4">
              <h3 className="font-semibold text-gray-900 mb-3">Emergency Consent</h3>
              <p className="text-sm text-gray-700 mb-4">
                In the event of an emergency, I authorize the staff of {clubName} to obtain medical assistance or transport my child to a medical facility if necessary.
              </p>
              <p className="text-sm text-gray-700 mb-4">
                I accept full financial responsibility for any medical treatment incurred.
              </p>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.emergencyConsent}
                  onChange={(e) => setFormData({ ...formData, emergencyConsent: e.target.checked })}
                  className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                />
                <span className="text-sm font-medium text-gray-900">
                  I agree to the emergency consent terms *
                </span>
              </label>
              {errors.emergencyConsent && <p className="text-red-500 text-sm mt-2">{errors.emergencyConsent}</p>}
            </div>
          </div>
        </div>

        {/* Section 5: Declaration and Signature */}
        <div className="border-t-4 border-purple-600 bg-gray-50 p-6 rounded-lg">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">📄 DECLARATION</h2>

          <div className="bg-white p-4 rounded-lg border border-gray-200 mb-4">
            <p className="text-sm text-gray-700 mb-2">By signing this form, I confirm that:</p>
            <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
              <li>The information provided is true and correct.</li>
              <li>I have read and understood the POPIA notice and consent terms.</li>
              <li>I understand my rights to access, amend, or delete my personal data.</li>
            </ul>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Parent/Guardian Name
              </label>
              <input
                type="text"
                value={formData.parentGuardianName}
                readOnly
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Digital Signature *
              </label>
              {formData.signature ? (
                <div className="border border-gray-300 rounded-lg p-4 bg-white">
                  <img src={formData.signature} alt="Signature" className="max-h-32" />
                  <p className="text-xs text-gray-500 mt-2">
                    Signed on: {new Date(formData.signatureDate).toLocaleString()}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, signature: '', signatureDate: '' }))
                      setShowSignatureModal(true)
                    }}
                    className="mt-2 text-sm text-purple-600 hover:text-purple-700"
                  >
                    Change Signature
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowSignatureModal(true)}
                  className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors text-gray-600 hover:text-purple-600"
                >
                  Click to Sign
                </button>
              )}
              {errors.signature && <p className="text-red-500 text-sm mt-1">{errors.signature}</p>}
            </div>
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={isSigning}
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={isSigning}
            className="px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSigning ? (
              <>Processing...</>
            ) : (
              <>
                <Check className="h-5 w-5" />
                Submit Form
              </>
            )}
          </button>
        </div>
      </form>

      {/* Signature Modal */}
      {showSignatureModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-xl font-semibold text-gray-900">Digital Signature</h3>
              <button
                onClick={() => setShowSignatureModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="px-6 py-4">
              <p className="text-sm text-gray-600 mb-4">
                Please sign in the box below using your mouse or finger (on touch devices)
              </p>

              <canvas
                ref={canvasRef}
                width={600}
                height={200}
                className="w-full border-2 border-gray-300 rounded-lg cursor-crosshair bg-white"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />

              <div className="flex justify-between mt-4">
                <button
                  onClick={clearSignature}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Clear
                </button>
                <button
                  onClick={saveSignature}
                  className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
                >
                  Save Signature
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
