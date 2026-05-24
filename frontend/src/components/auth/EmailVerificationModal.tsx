import { useState } from 'react'
import { X } from 'lucide-react'
import Button from '../common/Button'
import Input from '../common/Input'

interface EmailVerificationModalProps {
  isOpen: boolean
  email: string
  onVerify: (code: string) => Promise<void>
  onClose: () => void
  onResend?: () => Promise<void>
}

export default function EmailVerificationModal({
  isOpen,
  email,
  onVerify,
  onClose,
  onResend,
}: EmailVerificationModalProps) {
  const [code, setCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!code.trim()) {
      setError('Введите код подтверждения')
      return
    }

    setIsLoading(true)
    try {
      await onVerify(code.trim())
    } catch (err: any) {
      setError(
        err.response?.data?.message || 'Неверный код подтверждения. Попробуйте снова.'
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleResend = async () => {
    if (resendCooldown > 0 || !onResend) return

    setIsLoading(true)
    setError('')
    try {
      await onResend()
      setResendCooldown(60) // 60 seconds cooldown
      const interval = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(interval)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка при повторной отправке кода')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Подтверждение Email
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Мы отправили код подтверждения на{' '}
            <span className="font-semibold">{email}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="verification-code"
              className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Код подтверждения
            </label>
            <Input
              id="verification-code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Введите 6-значный код"
              maxLength={6}
              autoFocus
              disabled={isLoading}
            />
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            className="w-full"
            disabled={isLoading || !code.trim()}
          >
            {isLoading ? 'Проверка...' : 'Подтвердить'}
          </Button>

          <div className="text-center">
            <button
              type="button"
              onClick={handleResend}
              disabled={isLoading || resendCooldown > 0}
              className="text-sm text-blue-600 hover:text-blue-700 disabled:cursor-not-allowed disabled:text-gray-400 dark:text-blue-400 dark:hover:text-blue-300"
            >
              {resendCooldown > 0
                ? `Отправить повторно через ${resendCooldown}с`
                : 'Отправить код повторно'}
            </button>
          </div>
        </form>

        <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
          <p>Не получили код?</p>
          <ul className="ml-4 mt-1 list-disc">
            <li>Проверьте папку "Спам"</li>
            <li>Убедитесь, что email указан правильно</li>
            <li>Попробуйте отправить код повторно</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
