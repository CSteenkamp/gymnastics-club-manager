'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'

interface Document {
  id: string
  title: string
  description?: string
  category: string
  fileName: string
  requiresSignature: boolean
  userDocument?: {
    id: string
    viewedAt?: string
    signedAt?: string
    isAcknowledged: boolean
  }
  isSigned: boolean
}

interface User {
  id: string
  firstName: string
  lastName: string
  email: string
}

export default function SignDocumentPage() {
  const [user, setUser] = useState<User | null>(null)
  const [document, setDocument] = useState<Document | null>(null)
  const [loading, setLoading] = useState(true)
  const [signing, setSigning] = useState(false)
  const [signatureType, setSignatureType] = useState<'TYPED' | 'DRAWN'>('TYPED')
  const [typedSignature, setTypedSignature] = useState('')
  const [isDrawing, setIsDrawing] = useState(false)
  const [consentData, setConsentData] = useState({
    emailMarketing: false,
    smsMarketing: false,
    photoVideo: false,
    socialMedia: false
  })
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const router = useRouter()
  const params = useParams()
  const documentId = params.id as string

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')
    
    if (!token || !userData) {
      router.push('/login')
      return
    }

    const parsedUser = JSON.parse(userData)
    if (parsedUser.role !== 'PARENT') {
      router.push('/dashboard')
      return
    }

    setUser(parsedUser)
    setTypedSignature(`${parsedUser.firstName} ${parsedUser.lastName}`)
    loadDocument()
  }, [router, documentId])

  const loadDocument = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/documents/${documentId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setDocument(data.data)
          
          // If already signed, redirect back
          if (data.data.isSigned) {
            router.push('/documents')
          }
        }
      }
    } catch (error) {
      console.error('Error loading document:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleViewDocument = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/documents/${documentId}?action=view`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        window.open(url, '_blank')
      }
    } catch (error) {
      console.error('Error viewing document:', error)
    }
  }

  // Canvas drawing functions
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    setIsDrawing(true)
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.beginPath()
      ctx.moveTo(x, y)
    }
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.lineTo(x, y)
      ctx.stroke()
    }
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
  }

  const getSignatureData = () => {
    if (signatureType === 'TYPED') {
      return typedSignature
    } else {
      const canvas = canvasRef.current
      if (!canvas) return ''
      return canvas.toDataURL()
    }
  }

  const handleSign = async () => {
    if (!document || !user) return

    const signature = getSignatureData()
    if (!signature || (signatureType === 'TYPED' && !typedSignature.trim())) {
      alert('Please provide a signature')
      return
    }

    setSigning(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/documents/${documentId}/sign`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          signatureType,
          signature,
          isAcknowledged: true,
          consentData
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setShowSuccessModal(true)
        }
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to sign document')
      }
    } catch (error) {
      console.error('Error signing document:', error)
      alert('Failed to sign document')
    } finally {
      setSigning(false)
    }
  }

  const handleSuccessClose = () => {
    setShowSuccessModal(false)
    router.push('/documents')
  }

  if (!user || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    )
  }

  if (!document) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900">Document not found</h3>
          <button
            onClick={() => router.push('/documents')}
            className="mt-4 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg"
          >
            Back to Documents
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                ✍️ Sign Document
              </h1>
              <p className="text-gray-600">{document.title}</p>
            </div>
            <button
              onClick={() => router.push('/documents')}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              ← Cancel
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0 space-y-6">
          
          {/* Document Preview */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Document to Sign</h3>
            </div>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="font-medium text-gray-900">{document.title}</h4>
                  {document.description && (
                    <p className="text-gray-600 mt-1">{document.description}</p>
                  )}
                  <p className="text-sm text-gray-500 mt-2">
                    Category: {document.category.replace('_', ' ')} • File: {document.fileName}
                  </p>
                </div>
                <button
                  onClick={handleViewDocument}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  📄 View Document
                </button>
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start">
                  <span className="text-yellow-600 text-xl mr-3">⚠️</span>
                  <div>
                    <h5 className="font-medium text-yellow-800">Please Read Carefully</h5>
                    <p className="text-yellow-700 text-sm mt-1">
                      Please read the document carefully before signing. By signing, you acknowledge that you have read, understood, and agree to the terms outlined in this document.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Signature Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Your Signature</h3>
            </div>
            <div className="p-6">
              {/* Signature Type Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">Signature Type</label>
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="signatureType"
                      value="TYPED"
                      checked={signatureType === 'TYPED'}
                      onChange={(e) => setSignatureType(e.target.value as 'TYPED')}
                      className="mr-2"
                    />
                    ⌨️ Typed Signature
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="signatureType"
                      value="DRAWN"
                      checked={signatureType === 'DRAWN'}
                      onChange={(e) => setSignatureType(e.target.value as 'DRAWN')}
                      className="mr-2"
                    />
                    ✏️ Draw Signature
                  </label>
                </div>
              </div>

              {/* Typed Signature */}
              {signatureType === 'TYPED' && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type your full name
                  </label>
                  <input
                    type="text"
                    value={typedSignature}
                    onChange={(e) => setTypedSignature(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                  <div className="mt-2 p-4 bg-gray-50 border rounded-lg">
                    <p className="text-gray-600 text-sm mb-2">Preview:</p>
                    <div className="text-2xl font-cursive text-purple-600" style={{ fontFamily: 'cursive' }}>
                      {typedSignature || 'Your signature will appear here'}
                    </div>
                  </div>
                </div>
              )}

              {/* Draw Signature */}
              {signatureType === 'DRAWN' && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Draw your signature
                  </label>
                  <div className="border border-gray-300 rounded-lg p-4">
                    <canvas
                      ref={canvasRef}
                      width={600}
                      height={200}
                      className="border border-gray-200 cursor-crosshair bg-white rounded"
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      style={{ width: '100%', maxWidth: '600px', height: '200px' }}
                    />
                    <div className="flex justify-between items-center mt-2">
                      <p className="text-sm text-gray-600">Click and drag to draw your signature</p>
                      <button
                        onClick={clearCanvas}
                        className="text-sm text-red-600 hover:text-red-700"
                      >
                        🗑 Clear
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Consent Options */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Consent Preferences</h3>
              <p className="text-sm text-gray-600">These are optional and can be changed later</p>
            </div>
            <div className="p-6 space-y-4">
              <label className="flex items-start">
                <input
                  type="checkbox"
                  checked={consentData.emailMarketing}
                  onChange={(e) => setConsentData(prev => ({ ...prev, emailMarketing: e.target.checked }))}
                  className="mt-1 mr-3"
                />
                <div>
                  <span className="font-medium text-gray-900">📧 Email Marketing</span>
                  <p className="text-sm text-gray-600">Receive promotional emails about events and updates</p>
                </div>
              </label>

              <label className="flex items-start">
                <input
                  type="checkbox"
                  checked={consentData.smsMarketing}
                  onChange={(e) => setConsentData(prev => ({ ...prev, smsMarketing: e.target.checked }))}
                  className="mt-1 mr-3"
                />
                <div>
                  <span className="font-medium text-gray-900">📱 SMS Marketing</span>
                  <p className="text-sm text-gray-600">Receive promotional SMS messages about events</p>
                </div>
              </label>

              <label className="flex items-start">
                <input
                  type="checkbox"
                  checked={consentData.photoVideo}
                  onChange={(e) => setConsentData(prev => ({ ...prev, photoVideo: e.target.checked }))}
                  className="mt-1 mr-3"
                />
                <div>
                  <span className="font-medium text-gray-900">📸 Photos & Videos</span>
                  <p className="text-sm text-gray-600">Allow use of photos/videos for promotional purposes</p>
                </div>
              </label>

              <label className="flex items-start">
                <input
                  type="checkbox"
                  checked={consentData.socialMedia}
                  onChange={(e) => setConsentData(prev => ({ ...prev, socialMedia: e.target.checked }))}
                  className="mt-1 mr-3"
                />
                <div>
                  <span className="font-medium text-gray-900">📱 Social Media</span>
                  <p className="text-sm text-gray-600">Allow sharing on club's social media channels</p>
                </div>
              </label>
            </div>
          </div>

          {/* Sign Button */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">Ready to Sign?</h4>
                  <p className="text-sm text-gray-600">
                    By clicking "Sign Document", you acknowledge that you have read and agree to this document.
                  </p>
                </div>
                <button
                  onClick={handleSign}
                  disabled={signing || (!typedSignature.trim() && signatureType === 'TYPED')}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:cursor-not-allowed"
                >
                  {signing ? (
                    <>⏳ Signing...</>
                  ) : (
                    <>✍️ Sign Document</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md mx-4">
            <div className="text-center">
              <div className="text-4xl mb-4">✅</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Document Signed Successfully!</h3>
              <p className="text-gray-600 mb-6">
                Your signature has been recorded and the document is now complete.
              </p>
              <button
                onClick={handleSuccessClose}
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg transition-colors"
              >
                Return to Documents
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}