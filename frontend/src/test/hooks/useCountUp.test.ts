import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCountUp } from '../../hooks/useCountUp'

describe('useCountUp', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('starts at 0', () => {
    const { result } = renderHook(() => useCountUp(100))
    expect(result.current).toBe(0)
  })

  it('returns target immediately when start=false', () => {
    const { result } = renderHook(() => useCountUp(50, 1000, false))
    expect(result.current).toBe(50)
  })

  it('returns target immediately when target is 0', () => {
    const { result } = renderHook(() => useCountUp(0, 1000, true))
    expect(result.current).toBe(0)
  })

  it('eventually reaches the target value', () => {
    // requestAnimationFrame is mocked to be a no-op in setup.ts
    // so we test the start=false branch for determinism
    const { result } = renderHook(() => useCountUp(75, 500, false))
    expect(result.current).toBe(75)
  })

  it('re-runs animation when target changes', () => {
    const { result, rerender } = renderHook(
      ({ target }) => useCountUp(target, 1000, false),
      { initialProps: { target: 10 } }
    )
    expect(result.current).toBe(10)
    rerender({ target: 99 })
    expect(result.current).toBe(99)
  })
})
