'use client'

import { useState, useEffect } from 'react'
import { Users, Plus, Edit2, ToggleLeft, ToggleRight, Shield } from 'lucide-react'

interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  role: 'COACH' | 'ADMIN' | 'FINANCE_ADMIN'
  isActive: boolean
  createdAt: string
}

export function CoachesSettings() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [filterRole, setFilterRole] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'COACH' as 'COACH' | 'ADMIN' | 'FINANCE_ADMIN',
    password: ''
  })

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setUsers(data.data.filter((u: User) => u.role !== 'PARENT'))
        }
      }
    } catch (error) {
      console.error('Error loading users:', error)
      setMessage({ type: 'error', text: 'Failed to load users' })
    } finally {
      setLoading(false)
    }
  }

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.firstName || !formData.lastName || !formData.email || !formData.role) {
      setMessage({ type: 'error', text: 'Please fill in all required fields' })
      return
    }

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()
      if (data.success) {
        setMessage({ type: 'success', text: 'User added successfully' })
        setShowAddModal(false)
        resetForm()
        await loadUsers()
        setTimeout(() => setMessage(null), 3000)
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to add user' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to add user' })
    }
  }

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingUser) return

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/users/${editingUser.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          role: formData.role
        })
      })

      const data = await response.json()
      if (data.success) {
        setMessage({ type: 'success', text: 'User updated successfully' })
        setShowEditModal(false)
        setEditingUser(null)
        resetForm()
        await loadUsers()
        setTimeout(() => setMessage(null), 3000)
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to update user' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update user' })
    }
  }

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isActive: !currentStatus })
      })

      if (response.ok) {
        setMessage({ type: 'success', text: `User ${!currentStatus ? 'activated' : 'deactivated'} successfully` })
        await loadUsers()
        setTimeout(() => setMessage(null), 3000)
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update user status' })
    }
  }

  const openEditModal = (user: User) => {
    setEditingUser(user)
    setFormData({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone || '',
      role: user.role,
      password: ''
    })
    setShowEditModal(true)
  }

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      role: 'COACH',
      password: ''
    })
  }

  const filteredUsers = users.filter(user => {
    return filterRole === '' || user.role === filterRole
  })

  const getRoleBadge = (role: string) => {
    const config: Record<string, { bg: string; text: string; label: string }> = {
      ADMIN: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Admin' },
      FINANCE_ADMIN: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Finance Admin' },
      COACH: { bg: 'bg-green-100', text: 'text-green-800', label: 'Coach' }
    }
    const c = config[role] || config.COACH
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${c.bg} ${c.text}`}>
        {c.label}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Users className="h-5 w-5" />
            Coaches & Staff Management
          </h3>
          <p className="text-sm text-gray-600 mt-1">Manage coaches, administrators, and staff members</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add User
        </button>
      </div>

      {message && (
        <div className={`px-4 py-3 rounded-lg border ${
          message.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center gap-4">
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
        >
          <option value="">All Roles</option>
          <option value="ADMIN">Admin</option>
          <option value="FINANCE_ADMIN">Finance Admin</option>
          <option value="COACH">Coach</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredUsers.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{user.firstName} {user.lastName}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.phone || 'N/A'}</td>
                <td className="px-6 py-4 whitespace-nowrap">{getRoleBadge(user.role)}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => handleToggleStatus(user.id, user.isActive)}
                    className={`flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full ${
                      user.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {user.isActive ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                    {user.isActive ? 'Active' : 'Inactive'}
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <button
                    onClick={() => openEditModal(user)}
                    className="text-purple-600 hover:text-purple-900 flex items-center gap-1"
                  >
                    <Edit2 className="h-4 w-4" />
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Add New User</h3>
            </div>
            <form onSubmit={handleAddUser} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">First Name *</label>
                  <input type="text" value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Last Name *</label>
                  <input type="text" value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Role *</label>
                <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value as any })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required>
                  <option value="COACH">Coach</option>
                  <option value="ADMIN">Admin</option>
                  <option value="FINANCE_ADMIN">Finance Admin</option>
                </select>
              </div>
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button type="button" onClick={() => { setShowAddModal(false); resetForm() }} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">Add User</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Edit User</h3>
            </div>
            <form onSubmit={handleEditUser} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">First Name *</label>
                  <input type="text" value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Last Name *</label>
                  <input type="text" value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Role *</label>
                <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value as any })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required>
                  <option value="COACH">Coach</option>
                  <option value="ADMIN">Admin</option>
                  <option value="FINANCE_ADMIN">Finance Admin</option>
                </select>
              </div>
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button type="button" onClick={() => { setShowEditModal(false); setEditingUser(null); resetForm() }} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
