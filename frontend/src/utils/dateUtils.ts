import { format, parseISO, isAfter, isBefore, isToday } from 'date-fns'
import { ru } from 'date-fns/locale'

export const formatDate = (date: string | Date, formatStr: string = 'dd.MM.yyyy'): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return format(dateObj, formatStr, { locale: ru })
}

export const formatDateTime = (date: string | Date): string => {
  return formatDate(date, 'dd.MM.yyyy HH:mm')
}

export const isOverdue = (deadline: string): boolean => {
  return isBefore(parseISO(deadline), new Date())
}

export const isUpcoming = (date: string): boolean => {
  return isAfter(parseISO(date), new Date())
}

export const isTodayDate = (date: string): boolean => {
  return isToday(parseISO(date))
}

export const getTimeRemaining = (deadline: string): string => {
  const now = new Date()
  const end = parseISO(deadline)
  const diff = end.getTime() - now.getTime()

  if (diff < 0) return 'Просрочено'

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

  if (days > 0) return `${days} дн.`
  if (hours > 0) return `${hours} ч.`
  return 'Менее часа'
}
