'use client'

import { useEffect, useState } from 'react'
import { AdminLayout } from '@/components/layout/AdminLayout'

interface Child {
  id: string
  firstName: string
  lastName: string
  dateOfBirth?: string
  gender?: string
  level: string
  monthlyFee: number
  status: string
  notes?: string
  parents: {
    id: string
    firstName: string
    lastName: string
    email: string
    phone?: string
  }[]
}

export default function MembersPage() {
  const [members, setMembers] = useState<Child[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterLevel, setFilterLevel] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterGender, setFilterGender] = useState('')
  const [editingMember, setEditingMember] = useState<Child | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)

  useEffect(() => {
    loadMembers()
  }, [])

  const loadMembers = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/children', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setMembers(data.data)
        }
      }
    } catch (error) {
      console.error('Error loading members:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredMembers = members.filter(member => {
    const matchesSearch = searchTerm === '' ||
      `${member.firstName} ${member.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.parents.some(parent =>
        `${parent.firstName} ${parent.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        parent.email.toLowerCase().includes(searchTerm.toLowerCase())
      )

    const matchesLevel = filterLevel === '' || member.level === filterLevel
    const matchesStatus = filterStatus === '' || member.status === filterStatus
    const matchesGender = filterGender === '' || member.gender === filterGender

    return matchesSearch && matchesLevel && matchesStatus && matchesGender
  })

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR'
    }).format(amount)
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
      ACTIVE: { bg: 'bg-green-100', text: 'text-green-800', label: 'Active' },
      INACTIVE: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Inactive' },
      SUSPENDED: { bg: 'bg-red-100', text: 'text-red-800', label: 'Suspended' },
      TRIAL: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Trial' }
    }
    const config = statusConfig[status] || statusConfig.ACTIVE
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    )
  }

  const calculateAge = (dateOfBirth?: string) => {
    if (!dateOfBirth) return 'N/A'
    const today = new Date()
    const birth = new Date(dateOfBirth)
    const age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      return age - 1
    }
    return age
  }

  const handleEdit = (member: Child) => {
    setEditingMember(member)
    setShowEditModal(true)
  }

  const handleDelete = async (memberId: string) => {
    if (!confirm('Are you sure you want to delete this member?')) {
      return
    }

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/children/${memberId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        await loadMembers()
      } else {
        alert('Failed to delete member')
      }
    } catch (error) {
      console.error('Error deleting member:', error)
      alert('Error deleting member')
    }
  }

  const handleSaveEdit = async () => {
    if (!editingMember) return

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/children/${editingMember.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          firstName: editingMember.firstName,
          lastName: editingMember.lastName,
          dateOfBirth: editingMember.dateOfBirth,
          gender: editingMember.gender,
          level: editingMember.level,
          monthlyFee: editingMember.monthlyFee,
          status: editingMember.status,
          notes: editingMember.notes
        })
      })

      if (response.ok) {
        setShowEditModal(false)
        setEditingMember(null)
        await loadMembers()
      } else {
        alert('Failed to update member')
      }
    } catch (error) {
      console.error('Error updating member:', error)
      alert('Error updating member')
    }
  }

  return (
    <AdminLayout title="Members" description="Manage club members and their information">
      <div className="space-y-6">
        {/* Members Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Members Management</h3>
                <p className="text-sm text-gray-600">Total: {members.length} members</p>
              </div>
              <button
                onClick={() => alert('Add member functionality coming soon!')}
                className="border-2 border-purple-600 text-purple-600 hover:bg-purple-50 px-4 py-2 rounded-lg transition-colors text-sm font-medium"
              >
                Add New Member
              </button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
            <div className="flex flex-col md:flex-row gap-2">
              <input
                type="text"
                placeholder="Search members or parents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
              />
              <select
                value={filterLevel}
                onChange={(e) => setFilterLevel(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm min-w-[140px]"
              >
                <option value="">All Levels</option>
                <option value="RR">RR</option>
                <option value="R">R</option>
                <option value="Pre level 1">Pre level 1</option>
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
                <option value="5">5</option>
                <option value="TBD">TBD</option>
                <option value="Inactive">Inactive</option>
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm min-w-[120px]"
              >
                <option value="">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="SUSPENDED">Suspended</option>
                <option value="TRIAL">Trial</option>
              </select>
              <select
                value={filterGender}
                onChange={(e) => setFilterGender(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm min-w-[120px]"
              >
                <option value="">All Genders</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
              </select>
            </div>
          </div>

          {/* Members List */}
          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-gray-500">Loading members...</div>
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="text-center py-8">
                <span className="text-4xl">👥</span>
                <h3 className="text-lg font-medium text-gray-900 mt-2">No members found</h3>
                <p className="text-gray-500 text-sm">
                  {searchTerm || filterLevel || filterStatus || filterGender
                    ? 'Try adjusting your search criteria'
                    : 'Add your first member to get started'
                  }
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Member
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Level
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Gender
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Parent(s)
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Monthly Fee
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredMembers.map((member) => (
                      <tr key={member.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {member.firstName} {member.lastName}
                            </div>
                            <div className="text-sm text-gray-500">
                              Age: {calculateAge(member.dateOfBirth)}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                            {member.level}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            member.gender === 'MALE'
                              ? 'bg-blue-100 text-blue-800'
                              : member.gender === 'FEMALE'
                              ? 'bg-pink-100 text-pink-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {member.gender === 'MALE' ? 'Male' : member.gender === 'FEMALE' ? 'Female' : 'N/A'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(member.status)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            {member.parents?.map((parent) => (
                              <div key={parent.id} className="text-sm">
                                <div className="font-medium text-gray-900">
                                  {parent.firstName} {parent.lastName}
                                </div>
                                <div className="text-gray-500">{parent.email}</div>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(member.monthlyFee)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleEdit(member)}
                              className="text-purple-600 hover:text-purple-900"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(member.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Edit Modal */}
        {showEditModal && editingMember && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Edit Member</h3>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      First Name
                    </label>
                    <input
                      type="text"
                      value={editingMember.firstName}
                      onChange={(e) => setEditingMember({ ...editingMember, firstName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={editingMember.lastName}
                      onChange={(e) => setEditingMember({ ...editingMember, lastName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      value={editingMember.dateOfBirth ? editingMember.dateOfBirth.split('T')[0] : ''}
                      onChange={(e) => setEditingMember({ ...editingMember, dateOfBirth: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Gender
                    </label>
                    <select
                      value={editingMember.gender || ''}
                      onChange={(e) => setEditingMember({ ...editingMember, gender: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    >
                      <option value="">Select Gender</option>
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Level
                    </label>
                    <input
                      type="text"
                      value={editingMember.level}
                      onChange={(e) => setEditingMember({ ...editingMember, level: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Monthly Fee
                    </label>
                    <input
                      type="number"
                      value={editingMember.monthlyFee}
                      onChange={(e) => setEditingMember({ ...editingMember, monthlyFee: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={editingMember.status}
                    onChange={(e) => setEditingMember({ ...editingMember, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="SUSPENDED">Suspended</option>
                    <option value="TRIAL">Trial</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={editingMember.notes || ''}
                    onChange={(e) => setEditingMember({ ...editingMember, notes: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowEditModal(false)
                    setEditingMember(null)
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-4 py-2 border-2 border-purple-600 text-purple-600 rounded-lg hover:bg-purple-50"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
