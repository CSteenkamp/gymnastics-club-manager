'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Document {
  id: string
  title: string
  description?: string
  category: string
  fileName: string
  fileSize: number
  fileType: string
  requiresSignature: boolean
  isPublic: boolean
  isMandatory: boolean
  version: string
  expiresAt?: string
  createdAt: string
  updatedAt: string
  
  // Parent-specific data
  userDocument?: {
    id: string
    viewedAt?: string
    signedAt?: string
    isAcknowledged: boolean
    signatureType?: string
  }
  isViewed: boolean
  isSigned: boolean
  isAcknowledged: boolean
}

interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  role: string
}

export default function DocumentsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [filterCategory, setFilterCategory] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)
  const [showDocumentModal, setShowDocumentModal] = useState(false)
  const router = useRouter()

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
    loadDocuments()
  }, [router])

  const loadDocuments = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/documents', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setDocuments(data.data)
        }
      }
    } catch (error) {
      console.error('Error loading documents:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDocumentClick = (document: Document) => {
    setSelectedDocument(document)
    setShowDocumentModal(true)
  }

  const handleViewDocument = async (documentId: string) => {
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
        
        // Refresh documents to update view status
        loadDocuments()
      }
    } catch (error) {
      console.error('Error viewing document:', error)
    }
  }

  const handleDownloadDocument = async (documentId: string, fileName: string) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/documents/${documentId}?action=download`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = fileName
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Error downloading document:', error)
    }
  }

  const filteredDocuments = documents.filter(doc => {
    const matchesCategory = filterCategory === '' || doc.category === filterCategory
    const matchesStatus = 
      filterStatus === '' || 
      (filterStatus === 'unsigned' && doc.requiresSignature && !doc.isSigned) ||
      (filterStatus === 'signed' && doc.isSigned) ||
      (filterStatus === 'unviewed' && !doc.isViewed) ||
      (filterStatus === 'viewed' && doc.isViewed)
    
    return matchesCategory && matchesStatus
  })

  const getStatusBadge = (document: Document) => {
    if (document.requiresSignature) {
      if (document.isSigned) {
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
            ✓ Signed
          </span>
        )
      } else {
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
            ! Requires Signature
          </span>
        )
      }
    } else if (document.isViewed) {
      return (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
          👁 Viewed
        </span>
      )
    } else {
      return (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
          New
        </span>
      )
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'PRIVACY_POLICY':
      case 'POPI_NOTICE':
        return '🔒'
      case 'TERMS_CONDITIONS':
        return '📋'
      case 'CONSENT_FORM':
      case 'PHOTO_VIDEO_CONSENT':
        return '✍️'
      case 'MEDICAL_FORM':
        return '🏥'
      case 'WAIVER':
        return '⚠️'
      case 'REGISTRATION':
        return '📝'
      default:
        return '📄'
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
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
                📄 Documents & Forms
              </h1>
              <p className="text-gray-600">View and sign required documents</p>
            </div>
            <button
              onClick={() => router.push('/dashboard')}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              ← Back to Dashboard
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Filters */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
            <div className="px-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="">All Categories</option>
                    <option value="PRIVACY_POLICY">Privacy Policy</option>
                    <option value="TERMS_CONDITIONS">Terms & Conditions</option>
                    <option value="CONSENT_FORM">Consent Form</option>
                    <option value="MEDICAL_FORM">Medical Form</option>
                    <option value="PHOTO_VIDEO_CONSENT">Photo/Video Consent</option>
                    <option value="WAIVER">Waiver</option>
                    <option value="REGISTRATION">Registration</option>
                    <option value="POPI_NOTICE">POPI Notice</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="">All Documents</option>
                    <option value="unsigned">Requires Signature</option>
                    <option value="signed">Signed</option>
                    <option value="unviewed">Unviewed</option>
                    <option value="viewed">Viewed</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Documents List */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Your Documents ({filteredDocuments.length})
              </h3>
            </div>

            <div className="p-6">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-gray-500">Loading documents...</div>
                </div>
              ) : filteredDocuments.length === 0 ? (
                <div className="text-center py-8">
                  <span className="text-4xl">📄</span>
                  <h3 className="text-lg font-medium text-gray-900 mt-2">No documents found</h3>
                  <p className="text-gray-500">
                    {filterCategory || filterStatus 
                      ? 'Try adjusting your filter criteria' 
                      : 'No documents have been shared with you yet'
                    }
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredDocuments.map((document) => (
                    <div
                      key={document.id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => handleDocumentClick(document)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center">
                          <span className="text-2xl mr-2">{getCategoryIcon(document.category)}</span>
                          <div>
                            <h4 className="font-medium text-gray-900 line-clamp-1">{document.title}</h4>
                            <p className="text-sm text-gray-500">{document.category.replace('_', ' ')}</p>
                          </div>
                        </div>
                        {document.isMandatory && (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800">
                            Required
                          </span>
                        )}
                      </div>

                      {document.description && (
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{document.description}</p>
                      )}

                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm text-gray-500">
                          {formatFileSize(document.fileSize)} • {document.fileType.toUpperCase()}
                        </span>
                        {getStatusBadge(document)}
                      </div>

                      {document.expiresAt && (
                        <div className="text-sm text-orange-600 mb-3">
                          ⏰ Expires: {new Date(document.expiresAt).toLocaleDateString()}
                        </div>
                      )}

                      <div className="flex space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleViewDocument(document.id)
                          }}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 text-sm rounded-lg transition-colors"
                        >
                          👁 View
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDownloadDocument(document.id, document.fileName)
                          }}
                          className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 text-sm rounded-lg transition-colors"
                        >
                          ⬇ Download
                        </button>
                        {document.requiresSignature && !document.isSigned && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              router.push(`/documents/${document.id}/sign`)
                            }}
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white px-3 py-2 text-sm rounded-lg transition-colors"
                          >
                            ✍️ Sign
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}