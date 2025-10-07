import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Calendar, MapPin, Phone, Mail, Users } from 'lucide-react'

interface ClubPageProps {
  params: {
    slug: string
  }
}

async function getClubBySlug(slug: string) {
  const club = await prisma.clubs.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      address: true,
      isActive: true,
      subscriptionStatus: true,
      studentCount: true,
      classes: {
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          level: true,
          description: true,
          maxCapacity: true,
          _count: {
            select: { enrollments: true }
          }
        }
      }
    }
  })

  return club
}

export default async function ClubPage({ params }: ClubPageProps) {
  const club = await getClubBySlug(params.slug)

  if (!club || !club.isActive) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h1 className="text-5xl font-bold mb-4">{club.name}</h1>
          <p className="text-xl text-purple-100">
            Excellence in Gymnastics Training
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Contact Info */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Get in Touch</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {club.address && (
              <div className="flex items-start gap-3">
                <MapPin className="h-6 w-6 text-purple-600 mt-1" />
                <div>
                  <p className="font-semibold text-gray-900">Address</p>
                  <p className="text-gray-600">{club.address}</p>
                </div>
              </div>
            )}

            {club.phone && (
              <div className="flex items-start gap-3">
                <Phone className="h-6 w-6 text-purple-600 mt-1" />
                <div>
                  <p className="font-semibold text-gray-900">Phone</p>
                  <a href={`tel:${club.phone}`} className="text-purple-600 hover:text-purple-700">
                    {club.phone}
                  </a>
                </div>
              </div>
            )}

            {club.email && (
              <div className="flex items-start gap-3">
                <Mail className="h-6 w-6 text-purple-600 mt-1" />
                <div>
                  <p className="font-semibold text-gray-900">Email</p>
                  <a href={`mailto:${club.email}`} className="text-purple-600 hover:text-purple-700">
                    {club.email}
                  </a>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <Users className="h-6 w-6 text-purple-600 mt-1" />
              <div>
                <p className="font-semibold text-gray-900">Students</p>
                <p className="text-gray-600">{club.studentCount} active members</p>
              </div>
            </div>
          </div>
        </div>

        {/* Classes */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Classes</h2>

          {club.classes.length === 0 ? (
            <p className="text-gray-600">No classes available at this time.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {club.classes.map((classItem) => (
                <div
                  key={classItem.id}
                  className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
                >
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {classItem.name}
                  </h3>
                  <p className="text-purple-600 font-semibold mb-3">
                    Level: {classItem.level}
                  </p>
                  {classItem.description && (
                    <p className="text-gray-600 mb-4">{classItem.description}</p>
                  )}
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>
                      {classItem._count.enrollments}/{classItem.maxCapacity} students
                    </span>
                    <span
                      className={
                        classItem._count.enrollments >= classItem.maxCapacity
                          ? 'text-red-600 font-semibold'
                          : 'text-green-600 font-semibold'
                      }
                    >
                      {classItem._count.enrollments >= classItem.maxCapacity
                        ? 'Full'
                        : 'Available'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg shadow-lg p-12 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">Ready to Join?</h2>
          <p className="text-xl mb-8">
            Start your gymnastics journey with us today!
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/signup">
              <Button size="lg" variant="secondary">
                <Calendar className="h-5 w-5 mr-2" />
                Enroll Now
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="bg-white text-purple-600 hover:bg-gray-100">
                Parent Portal
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
