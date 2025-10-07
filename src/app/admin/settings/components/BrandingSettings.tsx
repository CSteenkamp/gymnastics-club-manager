'use client'

import { useState, useEffect } from 'react'
import { useBranding } from '@/contexts/BrandingContext'
import { Upload, X, Palette } from 'lucide-react'

export function BrandingSettings() {
  const { branding, refreshBranding } = useBranding()
  const [formData, setFormData] = useState({
    logo: '',
    favicon: '',
    primaryColor: '#7c3aed',
    secondaryColor: '#10b981',
    accentColor: '#f59e0b',
    customCss: ''
  })
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [logoPreview, setLogoPreview] = useState<string>('')
  const [faviconPreview, setFaviconPreview] = useState<string>('')

  useEffect(() => {
    if (branding) {
      setFormData({
        logo: branding.logo || '',
        favicon: branding.favicon || '',
        primaryColor: (branding.colors as any)?.primary || '#7c3aed',
        secondaryColor: (branding.colors as any)?.secondary || '#10b981',
        accentColor: (branding.colors as any)?.accent || '#f59e0b',
        customCss: branding.customCss || ''
      })
      setLogoPreview(branding.logo || '')
      setFaviconPreview(branding.favicon || '')
    }
  }, [branding])

  const handleFileUpload = (file: File, type: 'logo' | 'favicon') => {
    if (!file) return

    const validTypes = type === 'logo'
      ? ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml']
      : ['image/x-icon', 'image/png', 'image/jpeg', 'image/jpg']

    if (!validTypes.includes(file.type)) {
      setMessage({
        type: 'error',
        text: `Invalid file type. Please upload ${type === 'logo' ? 'PNG, JPG, or SVG' : 'ICO, PNG, or JPG'}.`
      })
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'File size must be less than 2MB' })
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      const base64String = reader.result as string
      if (type === 'logo') {
        setLogoPreview(base64String)
        setFormData({ ...formData, logo: base64String })
      } else {
        setFaviconPreview(base64String)
        setFormData({ ...formData, favicon: base64String })
      }
      setMessage(null)
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveImage = (type: 'logo' | 'favicon') => {
    if (type === 'logo') {
      setLogoPreview('')
      setFormData({ ...formData, logo: '' })
    } else {
      setFaviconPreview('')
      setFormData({ ...formData, favicon: '' })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setMessage(null)

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/clubs/branding', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          logo: formData.logo || null,
          favicon: formData.favicon || null,
          colors: {
            primary: formData.primaryColor,
            secondary: formData.secondaryColor,
            accent: formData.accentColor
          },
          customCss: formData.customCss || null
        })
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Branding updated successfully!' })
        await refreshBranding()
        setTimeout(() => setMessage(null), 3000)
      } else {
        setMessage({ type: 'error', text: 'Failed to update branding' })
      }
    } catch (error) {
      console.error('Error updating branding:', error)
      setMessage({ type: 'error', text: 'An error occurred while updating branding' })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Branding Settings
        </h3>
        <p className="text-sm text-gray-600 mt-1">Customize your club's appearance with logos, colors, and styling</p>
      </div>

      {message && (
        <div className={`p-4 rounded-lg border ${
          message.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Logo & Favicon */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Logo & Favicon</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Logo Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Club Logo</label>
              {logoPreview ? (
                <div className="relative border-2 border-gray-300 rounded-lg p-4 bg-gray-50">
                  <img src={logoPreview} alt="Logo preview" className="max-h-32 mx-auto object-contain" />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage('logo')}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-purple-500 hover:bg-purple-50 transition-colors">
                  <div className="flex flex-col items-center justify-center py-4">
                    <Upload className="h-8 w-8 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600">Click to upload logo</p>
                    <p className="text-xs text-gray-500 mt-1">PNG, JPG or SVG (max 2MB)</p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/png,image/jpeg,image/jpg,image/svg+xml"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleFileUpload(file, 'logo')
                    }}
                  />
                </label>
              )}
            </div>

            {/* Favicon Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Favicon</label>
              {faviconPreview ? (
                <div className="relative border-2 border-gray-300 rounded-lg p-4 bg-gray-50">
                  <img src={faviconPreview} alt="Favicon preview" className="max-h-32 mx-auto object-contain" />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage('favicon')}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-purple-500 hover:bg-purple-50 transition-colors">
                  <div className="flex flex-col items-center justify-center py-4">
                    <Upload className="h-8 w-8 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600">Click to upload favicon</p>
                    <p className="text-xs text-gray-500 mt-1">ICO, PNG or JPG (max 2MB)</p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/x-icon,image/png,image/jpeg,image/jpg"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleFileUpload(file, 'favicon')
                    }}
                  />
                </label>
              )}
            </div>
          </div>
        </div>

        {/* Colors */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Brand Colors</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Primary Color</label>
              <div className="flex items-center space-x-3">
                <input
                  type="color"
                  value={formData.primaryColor}
                  onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                  className="h-10 w-20 rounded border border-gray-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={formData.primaryColor}
                  onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Secondary Color</label>
              <div className="flex items-center space-x-3">
                <input
                  type="color"
                  value={formData.secondaryColor}
                  onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                  className="h-10 w-20 rounded border border-gray-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={formData.secondaryColor}
                  onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Accent Color</label>
              <div className="flex items-center space-x-3">
                <input
                  type="color"
                  value={formData.accentColor}
                  onChange={(e) => setFormData({ ...formData, accentColor: e.target.value })}
                  className="h-10 w-20 rounded border border-gray-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={formData.accentColor}
                  onChange={(e) => setFormData({ ...formData, accentColor: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
          </div>

          {/* Color Preview */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-gray-700 mb-3">Preview</p>
            <div className="flex space-x-4">
              <button type="button" style={{ backgroundColor: formData.primaryColor }} className="flex-1 px-4 py-2 text-white rounded-lg font-medium">
                Primary
              </button>
              <button type="button" style={{ backgroundColor: formData.secondaryColor }} className="flex-1 px-4 py-2 text-white rounded-lg font-medium">
                Secondary
              </button>
              <button type="button" style={{ backgroundColor: formData.accentColor }} className="flex-1 px-4 py-2 text-white rounded-lg font-medium">
                Accent
              </button>
            </div>
          </div>
        </div>

        {/* Custom CSS */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Custom CSS (Advanced)</h4>
          <textarea
            value={formData.customCss}
            onChange={(e) => setFormData({ ...formData, customCss: e.target.value })}
            rows={8}
            placeholder=".custom-class { color: red; }"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 font-mono text-sm"
          />
        </div>

        {/* Submit */}
        <div className="flex justify-end pt-4 border-t border-gray-200">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {isSaving ? 'Saving...' : 'Save Branding'}
          </button>
        </div>
      </form>
    </div>
  )
}
