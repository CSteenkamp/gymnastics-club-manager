'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { FileText, Upload, Download, Eye, Trash2, Edit, Plus, X, CheckCircle, Clock, AlertCircle } from 'lucide-react'

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
  signedCount?: number
  dataProcessingPurpose?: string
  retentionPeriod?: number
}

const DOCUMENT_CATEGORIES = [
  { value: 'GENERAL', label: 'General' },
  { value: 'POLICY', label: 'Policy' },
  { value: 'TERMS_CONDITIONS', label: 'Terms & Conditions' },
  { value: 'PRIVACY_POLICY', label: 'Privacy Policy' },
  { value: 'CONSENT_FORM', label: 'Consent Form' },
  { value: 'MEDICAL_FORM', label: 'Medical Form' },
  { value: 'PHOTO_VIDEO_CONSENT', label: 'Photo/Video Consent' },
  { value: 'EMERGENCY_CONTACT', label: 'Emergency Contact' },
  { value: 'WAIVER', label: 'Waiver' },
  { value: 'REGISTRATION', label: 'Registration' },
  { value: 'POPI_NOTICE', label: 'POPI Notice' },
  { value: 'DATA_PROCESSING_AGREEMENT', label: 'Data Processing Agreement' }
]

export default function AdminDocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'GENERAL',
    requiresSignature: false,
    isPublic: true,
    isMandatory: false,
    dataProcessingPurpose: '',
    retentionPeriod: '',
    expiresAt: ''
  })
  const [error, setError] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const router = useRouter()

  useEffect(() => {
    loadDocuments()
  }, [filterCategory])

  const loadDocuments = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/login')
        return
      }

      const url = filterCategory
        ? `/api/documents?category=${filterCategory}`
        : '/api/documents'

      const response = await fetch(url, {
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB')
        return
      }

      // Validate file type
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'image/jpeg',
        'image/png'
      ]

      if (!allowedTypes.includes(file.type)) {
        setError('File type not allowed. Please upload PDF, DOC, DOCX, TXT, JPG, or PNG files.')
        return
      }

      setSelectedFile(file)
      setError('')

      // Auto-fill title from filename if empty
      if (!formData.title) {
        const fileName = file.name.replace(/\.[^/.]+$/, '') // Remove extension
        setFormData(prev => ({ ...prev, title: fileName }))
      }
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file')
      return
    }

    if (!formData.title) {
      setError('Please enter a title')
      return
    }

    setUploading(true)
    setError('')

    try {
      const token = localStorage.getItem('token')
      const uploadFormData = new FormData()
      uploadFormData.append('file', selectedFile)
      uploadFormData.append('data', JSON.stringify({
        title: formData.title,
        description: formData.description,
        category: formData.category,
        requiresSignature: formData.requiresSignature,
        isPublic: formData.isPublic,
        isMandatory: formData.isMandatory,
        dataProcessingPurpose: formData.dataProcessingPurpose || undefined,
        retentionPeriod: formData.retentionPeriod ? parseInt(formData.retentionPeriod) : undefined,
        expiresAt: formData.expiresAt || undefined
      }))

      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: uploadFormData
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setShowUploadModal(false)
        setSelectedFile(null)
        setFormData({
          title: '',
          description: '',
          category: 'GENERAL',
          requiresSignature: false,
          isPublic: true,
          isMandatory: false,
          dataProcessingPurpose: '',
          retentionPeriod: '',
          expiresAt: ''
        })
        loadDocuments()
      } else {
        setError(data.error || 'Upload failed')
      }
    } catch (error) {
      console.error('Upload error:', error)
      setError('Failed to upload document')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) {
      return
    }

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/documents/${documentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        loadDocuments()
      }
    } catch (error) {
      console.error('Error deleting document:', error)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const getCategoryBadgeColor = (category: string) => {
    const colors: Record<string, string> = {
      'PRIVACY_POLICY': 'bg-purple-100 text-purple-800',
      'POPI_NOTICE': 'bg-blue-100 text-blue-800',
      'TERMS_CONDITIONS': 'bg-green-100 text-green-800',
      'CONSENT_FORM': 'bg-orange-100 text-orange-800',
      'WAIVER': 'bg-red-100 text-red-800',
      'MEDICAL_FORM': 'bg-pink-100 text-pink-800'
    }
    return colors[category] || 'bg-gray-100 text-gray-800'
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Documents</h1>
            <p className="text-gray-600 mt-1">Manage documents and forms for parents to view and sign</p>
          </div>
          <button
            onClick={() => setShowUploadModal(true)}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            Upload Document
          </button>
        </div>

        {/* Filter */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">Filter by Category:</label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="">All Categories</option>
              {DOCUMENT_CATEGORIES.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Documents List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              All Documents ({documents.length})
            </h2>
          </div>

          {loading ? (
            <div className="p-12 text-center text-gray-500">
              Loading documents...
            </div>
          ) : documents.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No documents yet</h3>
              <p className="text-gray-500 mb-4">Upload your first document to get started</p>
              <button
                onClick={() => setShowUploadModal(true)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
              >
                Upload Document
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {documents.map((doc) => (
                <div key={doc.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <FileText className="h-5 w-5 text-purple-600" />
                        <h3 className="font-semibold text-gray-900">{doc.title}</h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getCategoryBadgeColor(doc.category)}`}>
                          {DOCUMENT_CATEGORIES.find(c => c.value === doc.category)?.label || doc.category}
                        </span>
                        {doc.isMandatory && (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                            Required
                          </span>
                        )}
                        {doc.requiresSignature && (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                            Requires Signature
                          </span>
                        )}
                        {doc.isPublic && (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                            Public
                          </span>
                        )}
                      </div>
                      {doc.description && (
                        <p className="text-sm text-gray-600 mb-2">{doc.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>{doc.fileName}</span>
                        <span>•</span>
                        <span>{formatFileSize(doc.fileSize)}</span>
                        <span>•</span>
                        <span>{doc.fileType.toUpperCase()}</span>
                        {doc.signedCount !== undefined && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              {doc.signedCount} signed
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => window.open(`/api/documents/${doc.id}?action=view`, '_blank')}
                        className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                        title="View"
                      >
                        <Eye className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => window.open(`/api/documents/${doc.id}?action=download`, '_blank')}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Download"
                      >
                        <Download className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-xl font-semibold text-gray-900">Upload Document</h3>
              <button
                onClick={() => {
                  setShowUploadModal(false)
                  setSelectedFile(null)
                  setError('')
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                  {error}
                </div>
              )}

              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  File *
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  {selectedFile ? (
                    <div className="flex items-center justify-center gap-3">
                      <FileText className="h-8 w-8 text-purple-600" />
                      <div className="text-left">
                        <p className="font-medium text-gray-900">{selectedFile.name}</p>
                        <p className="text-sm text-gray-500">{formatFileSize(selectedFile.size)}</p>
                      </div>
                      <button
                        onClick={() => setSelectedFile(null)}
                        className="ml-auto p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  ) : (
                    <div>
                      <Upload className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                      <label className="cursor-pointer">
                        <span className="text-purple-600 hover:text-purple-700 font-medium">Choose a file</span>
                        <input
                          type="file"
                          onChange={handleFileSelect}
                          accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                          className="hidden"
                        />
                      </label>
                      <p className="text-sm text-gray-500 mt-2">PDF, DOC, DOCX, TXT, JPG, PNG (max 10MB)</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Document title"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Brief description of the document"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  {DOCUMENT_CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>

              {/* Checkboxes */}
              <div className="space-y-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.isPublic}
                    onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
                    className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Public (visible to all parents)</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.isMandatory}
                    onChange={(e) => setFormData({ ...formData, isMandatory: e.target.checked })}
                    className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Required (mandatory for parents)</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.requiresSignature}
                    onChange={(e) => setFormData({ ...formData, requiresSignature: e.target.checked })}
                    className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Requires Signature</span>
                </label>
              </div>

              {/* Expiry Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expiry Date (Optional)
                </label>
                <input
                  type="date"
                  value={formData.expiresAt}
                  onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowUploadModal(false)
                  setSelectedFile(null)
                  setError('')
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={uploading}
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading || !selectedFile}
                className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
