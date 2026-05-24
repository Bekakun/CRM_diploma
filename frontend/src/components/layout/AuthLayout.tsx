import { useEffect } from 'react'

interface AuthLayoutProps {
  children: React.ReactNode
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  // Always force light theme for auth pages
  useEffect(() => {
    // Remove dark class when on auth pages
    document.documentElement.classList.remove('dark')

    // Cleanup: theme will be reapplied by App component when navigating away
    return () => {
      // No cleanup needed - App component will handle theme
    }
  }, [])

  return <>{children}</>
}
