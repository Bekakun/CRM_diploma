import { useEffect } from 'react'

interface AuthLayoutProps {
  children: React.ReactNode
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  useEffect(() => {
    // Save whether dark was active before auth page
    const wasDark = document.documentElement.classList.contains('dark')

    // Force light theme on auth pages
    document.documentElement.classList.remove('dark')

    // Restore saved theme when navigating away from auth pages
    return () => {
      if (wasDark) {
        document.documentElement.classList.add('dark')
      }
    }
  }, [])

  return <>{children}</>
}
