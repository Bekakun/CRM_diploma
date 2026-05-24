import { describe, it, expect } from 'vitest'
import { getGradeColor, getGradeLabel, calculateAverage } from '../../utils/gradeUtils'

describe('getGradeColor', () => {
  it('returns green for 90+', () => {
    expect(getGradeColor(90)).toBe('text-green-600 bg-green-50')
    expect(getGradeColor(100)).toBe('text-green-600 bg-green-50')
  })

  it('returns blue for 75–89', () => {
    expect(getGradeColor(75)).toBe('text-blue-600 bg-blue-50')
    expect(getGradeColor(89)).toBe('text-blue-600 bg-blue-50')
  })

  it('returns yellow for 60–74', () => {
    expect(getGradeColor(60)).toBe('text-yellow-600 bg-yellow-50')
    expect(getGradeColor(74)).toBe('text-yellow-600 bg-yellow-50')
  })

  it('returns red for below 60', () => {
    expect(getGradeColor(59)).toBe('text-red-600 bg-red-50')
    expect(getGradeColor(0)).toBe('text-red-600 bg-red-50')
  })
})

describe('getGradeLabel', () => {
  it('returns "Отлично" for 90+', () => {
    expect(getGradeLabel(95)).toBe('Отлично')
  })

  it('returns "Хорошо" for 75–89', () => {
    expect(getGradeLabel(80)).toBe('Хорошо')
  })

  it('returns "Удовлетворительно" for 60–74', () => {
    expect(getGradeLabel(65)).toBe('Удовлетворительно')
  })

  it('returns "Неудовлетворительно" for below 60', () => {
    expect(getGradeLabel(40)).toBe('Неудовлетворительно')
  })
})

describe('calculateAverage', () => {
  it('returns 0 for empty array', () => {
    expect(calculateAverage([])).toBe(0)
  })

  it('returns the single value for a one-element array', () => {
    expect(calculateAverage([85])).toBe(85)
  })

  it('calculates average and rounds it', () => {
    expect(calculateAverage([70, 80, 90])).toBe(80)
  })

  it('rounds 0.5 up', () => {
    expect(calculateAverage([70, 71])).toBe(71)
  })
})
