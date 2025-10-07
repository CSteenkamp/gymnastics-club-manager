'use client'

import { useState, useEffect } from 'react'
import { GripVertical, Plus, Edit2, Trash2, Check, X, Layers } from 'lucide-react'

interface Level {
  id: string
  name: string
  displayOrder: number
  isActive: boolean
}

export function LevelsSettings() {
  const [levels, setLevels] = useState<Level[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newLevelName, setNewLevelName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')

  useEffect(() => {
    loadLevels()
  }, [])

  const loadLevels = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const response = await fetch('/api/levels', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()
      if (data.success) {
        setLevels(data.data)
      } else {
        setError(data.error || 'Failed to load levels')
      }
    } catch (err) {
      setError('Failed to load levels')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddLevel = async () => {
    if (!newLevelName.trim()) {
      setMessage({ type: 'error', text: 'Level name is required' })
      return
    }

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/levels', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: newLevelName.trim() })
      })

      const data = await response.json()
      if (data.success) {
        setMessage({ type: 'success', text: 'Level added successfully' })
        setNewLevelName('')
        setShowAddForm(false)
        await loadLevels()
        setTimeout(() => setMessage(null), 3000)
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to add level' })
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to add level' })
      console.error(err)
    }
  }

  const handleUpdateLevel = async (id: string, name: string) => {
    if (!name.trim()) {
      setMessage({ type: 'error', text: 'Level name cannot be empty' })
      return
    }

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/levels/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: name.trim() })
      })

      const data = await response.json()
      if (data.success) {
        setMessage({ type: 'success', text: 'Level updated successfully' })
        setEditingId(null)
        setEditingName('')
        await loadLevels()
        setTimeout(() => setMessage(null), 3000)
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to update level' })
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to update level' })
      console.error(err)
    }
  }

  const handleDeleteLevel = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete the level "${name}"? This action cannot be undone.`)) {
      return
    }

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/levels/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()
      if (data.success) {
        setMessage({ type: 'success', text: 'Level deleted successfully' })
        await loadLevels()
        setTimeout(() => setMessage(null), 3000)
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to delete level' })
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to delete level' })
      console.error(err)
    }
  }

  const handleMoveLevel = async (id: string, direction: 'up' | 'down') => {
    const index = levels.findIndex(l => l.id === id)
    if (index === -1) return
    if (direction === 'up' && index === 0) return
    if (direction === 'down' && index === levels.length - 1) return

    const targetIndex = direction === 'up' ? index - 1 : index + 1
    const newLevels = [...levels]
    const [movedItem] = newLevels.splice(index, 1)
    newLevels.splice(targetIndex, 0, movedItem)

    // Update display orders
    try {
      const token = localStorage.getItem('token')

      // Update both levels' display orders
      await Promise.all([
        fetch(`/api/levels/${movedItem.id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ displayOrder: targetIndex })
        }),
        fetch(`/api/levels/${levels[targetIndex].id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ displayOrder: index })
        })
      ])

      await loadLevels()
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to reorder levels' })
      console.error(err)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Layers className="h-5 w-5" />
          Gymnastic Levels
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Manage the gymnastic levels for your club. These levels will be used for member classification and class organization.
        </p>
      </div>

      {message && (
        <div className={`p-4 rounded-lg border ${
          message.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg">
          {error}
        </div>
      )}

      {/* Add Level Button */}
      <div>
        {!showAddForm ? (
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Level
          </button>
        ) : (
          <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={newLevelName}
                onChange={(e) => setNewLevelName(e.target.value)}
                placeholder="Enter level name (e.g., Level 1, RR, etc.)"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                onKeyPress={(e) => e.key === 'Enter' && handleAddLevel()}
                autoFocus
              />
              <button
                onClick={handleAddLevel}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1"
              >
                <Check className="h-4 w-4" />
                Add
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false)
                  setNewLevelName('')
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors flex items-center gap-1"
              >
                <X className="h-4 w-4" />
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Levels List */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {levels.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No levels configured yet. Add your first level to get started.
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {levels.map((level, index) => (
              <div key={level.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  {/* Drag Handle & Reorder Buttons */}
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => handleMoveLevel(level.id, 'up')}
                      disabled={index === 0}
                      className={`p-1 rounded hover:bg-gray-200 ${index === 0 ? 'opacity-30 cursor-not-allowed' : ''}`}
                      title="Move up"
                    >
                      <GripVertical className="h-4 w-4 text-gray-400 rotate-90" />
                    </button>
                    <button
                      onClick={() => handleMoveLevel(level.id, 'down')}
                      disabled={index === levels.length - 1}
                      className={`p-1 rounded hover:bg-gray-200 ${index === levels.length - 1 ? 'opacity-30 cursor-not-allowed' : ''}`}
                      title="Move down"
                    >
                      <GripVertical className="h-4 w-4 text-gray-400 -rotate-90" />
                    </button>
                  </div>

                  {/* Level Name */}
                  <div className="flex-1">
                    {editingId === level.id ? (
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="px-3 py-1 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent w-full"
                        onKeyPress={(e) => e.key === 'Enter' && handleUpdateLevel(level.id, editingName)}
                        autoFocus
                      />
                    ) : (
                      <span className="text-gray-900 font-medium">{level.name}</span>
                    )}
                  </div>

                  {/* Order Badge */}
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                    Order: {level.displayOrder + 1}
                  </span>

                  {/* Actions */}
                  <div className="flex gap-2">
                    {editingId === level.id ? (
                      <>
                        <button
                          onClick={() => handleUpdateLevel(level.id, editingName)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Save"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingId(null)
                            setEditingName('')
                          }}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Cancel"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setEditingId(level.id)
                            setEditingName(level.name)
                          }}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteLevel(level.id, level.name)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">Tips</h4>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>Levels are displayed in the order shown above</li>
          <li>Use the arrows to reorder levels</li>
          <li>Levels in use by members or classes cannot be deleted</li>
          <li>You can rename levels at any time - existing members will automatically use the new name</li>
        </ul>
      </div>
    </div>
  )
}
