import { NextResponse } from 'next/server'
import { ApiResponse } from '@/types'

export async function POST() {
  try {
    // Create response
    const response = NextResponse.json<ApiResponse>({
      success: true,
      message: 'Logged out successfully'
    })

    // Clear the authentication cookie
    response.cookies.set('token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0 // Expire immediately
    })

    return response

  } catch (error) {
    console.error('Logout error:', error)
    
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}