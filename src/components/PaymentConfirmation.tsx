'use client'

import { useEffect, useState } from 'react'

interface PaymentConfirmationProps {
  show: boolean
  type: 'success' | 'cancelled' | 'failed'
  onClose: () => void
  message?: string
}

export default function PaymentConfirmation({ show, type, onClose, message }: PaymentConfirmationProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (show) {
      setIsVisible(true)
      // Auto-close after 5 seconds
      const timer = setTimeout(() => {
        handleClose()
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [show])

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(() => {
      onClose()
    }, 300) // Wait for animation to complete
  }

  if (!show) return null

  const getConfig = () => {
    switch (type) {
      case 'success':
        return {
          icon: '✅',
          title: 'Payment Successful!',
          message: message || 'Your payment has been processed successfully. Your invoice has been updated.',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          textColor: 'text-green-800',
          buttonColor: 'bg-green-600 hover:bg-green-700'
        }
      case 'cancelled':
        return {
          icon: '⚠️',
          title: 'Payment Cancelled',
          message: message || 'Your payment was cancelled. You can try again anytime.',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          textColor: 'text-yellow-800',
          buttonColor: 'bg-yellow-600 hover:bg-yellow-700'
        }
      case 'failed':
        return {
          icon: '❌',
          title: 'Payment Failed',
          message: message || 'Your payment could not be processed. Please try again or contact support.',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          textColor: 'text-red-800',
          buttonColor: 'bg-red-600 hover:bg-red-700'
        }
      default:
        return {
          icon: 'ℹ️',
          title: 'Payment Status',
          message: message || 'Payment status unknown.',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          textColor: 'text-blue-800',
          buttonColor: 'bg-blue-600 hover:bg-blue-700'
        }
    }
  }

  const config = getConfig()

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
        {/* Background overlay */}
        <div 
          className={`fixed inset-0 transition-opacity duration-300 ${
            isVisible ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={handleClose}
        >
          <div className="absolute inset-0 bg-black opacity-50"></div>
        </div>

        {/* Modal content */}
        <div 
          className={`inline-block align-bottom rounded-lg text-left overflow-hidden shadow-xl transform transition-all duration-300 sm:my-8 sm:align-middle sm:max-w-lg sm:w-full ${
            isVisible ? 'opacity-100 translate-y-0 sm:scale-100' : 'opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95'
          }`}
        >
          <div className={`px-4 pt-5 pb-4 sm:p-6 sm:pb-4 ${config.bgColor} border-2 ${config.borderColor}`}>
            <div className="sm:flex sm:items-start">
              <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full sm:mx-0 sm:h-10 sm:w-10">
                <span className="text-2xl">{config.icon}</span>
              </div>
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                <h3 className={`text-lg leading-6 font-medium ${config.textColor}`}>
                  {config.title}
                </h3>
                <div className="mt-2">
                  <p className={`text-sm ${config.textColor}`}>
                    {config.message}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className={`px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse ${config.bgColor} border-t ${config.borderColor}`}>
            <button
              type="button"
              onClick={handleClose}
              className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-50 sm:ml-3 sm:w-auto sm:text-sm transition-colors ${config.buttonColor}`}
            >
              Got it
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}