import { useState, useEffect, useRef } from 'react'

const PHRASES = [
  'Собираю информацию...',
  'Анализирую данные...',
  'Обрабатываю результаты...',
  'Формирую ответ...',
  'Сверяю показатели...',
  'Готовлю рекомендации...',
]

export function useTypingPhrase(active: boolean, intervalMs = 4000) {
  const [index, setIndex] = useState(0)
  const [visible, setVisible] = useState(true)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!active) {
      setIndex(0)
      setVisible(true)
      if (timerRef.current) clearInterval(timerRef.current)
      return
    }

    timerRef.current = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setIndex(i => (i + 1) % PHRASES.length)
        setVisible(true)
      }, 300)
    }, intervalMs)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [active, intervalMs])

  return { phrase: PHRASES[index], visible }
}
