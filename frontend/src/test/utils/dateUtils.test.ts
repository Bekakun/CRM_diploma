import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  formatDate,
  formatDateTime,
  isOverdue,
  isUpcoming,
  isTodayDate,
  getTimeRemaining,
} from '../../utils/dateUtils'

describe('formatDate', () => {
  it('formats ISO string to dd.MM.yyyy by default', () => {
    expect(formatDate('2024-03-15')).toBe('15.03.2024')
  })

  it('accepts a Date object', () => {
    expect(formatDate(new Date(2024, 0, 5))).toBe('05.01.2024')
  })

  it('respects a custom format string', () => {
    expect(formatDate('2024-12-01', 'MM/yyyy')).toBe('12/2024')
  })
})

describe('formatDateTime', () => {
  it('formats to dd.MM.yyyy HH:mm', () => {
    expect(formatDateTime('2024-06-20T09:05:00')).toBe('20.06.2024 09:05')
  })
})

describe('isOverdue / isUpcoming / isTodayDate', () => {
  const FIXED_NOW = new Date('2024-06-15T12:00:00')

  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(FIXED_NOW) })
  afterEach(() => { vi.useRealTimers() })

  it('isOverdue returns true for past date', () => {
    expect(isOverdue('2024-06-10T00:00:00')).toBe(true)
  })

  it('isOverdue returns false for future date', () => {
    expect(isOverdue('2024-06-20T00:00:00')).toBe(false)
  })

  it('isUpcoming returns true for future date', () => {
    expect(isUpcoming('2024-06-20T00:00:00')).toBe(true)
  })

  it('isUpcoming returns false for past date', () => {
    expect(isUpcoming('2024-06-10T00:00:00')).toBe(false)
  })

  it('isTodayDate returns true for today', () => {
    expect(isTodayDate('2024-06-15T08:00:00')).toBe(true)
  })

  it('isTodayDate returns false for yesterday', () => {
    expect(isTodayDate('2024-06-14T08:00:00')).toBe(false)
  })
})

describe('getTimeRemaining', () => {
  const FIXED_NOW = new Date('2024-06-15T12:00:00')

  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(FIXED_NOW) })
  afterEach(() => { vi.useRealTimers() })

  it('returns "Просрочено" for past deadline', () => {
    expect(getTimeRemaining('2024-06-14T12:00:00')).toBe('Просрочено')
  })

  it('returns days when more than 1 day remains', () => {
    expect(getTimeRemaining('2024-06-17T12:00:00')).toBe('2 дн.')
  })

  it('returns hours when less than 1 day remains', () => {
    expect(getTimeRemaining('2024-06-15T18:00:00')).toBe('6 ч.')
  })

  it('returns "Менее часа" when under 1 hour remains', () => {
    expect(getTimeRemaining('2024-06-15T12:30:00')).toBe('Менее часа')
  })
})
