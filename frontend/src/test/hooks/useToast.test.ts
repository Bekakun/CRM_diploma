import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useToast } from '../../hooks/useToast'

describe('useToast', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('starts with no toasts', () => {
    const { result } = renderHook(() => useToast())
    expect(result.current.toasts).toHaveLength(0)
  })

  it('adds a toast when show() is called', () => {
    const { result } = renderHook(() => useToast())
    act(() => { result.current.show('Hello!', 'success') })
    expect(result.current.toasts).toHaveLength(1)
    expect(result.current.toasts[0].message).toBe('Hello!')
    expect(result.current.toasts[0].type).toBe('success')
  })

  it('defaults to info type', () => {
    const { result } = renderHook(() => useToast())
    act(() => { result.current.show('Info message') })
    expect(result.current.toasts[0].type).toBe('info')
  })

  it('auto-dismisses after 4 seconds', () => {
    const { result } = renderHook(() => useToast())
    act(() => { result.current.show('Temporary') })
    expect(result.current.toasts).toHaveLength(1)
    act(() => { vi.advanceTimersByTime(4000) })
    expect(result.current.toasts).toHaveLength(0)
  })

  it('dismiss() removes a specific toast', () => {
    const { result } = renderHook(() => useToast())
    act(() => { result.current.show('A', 'error') })
    act(() => { result.current.show('B', 'success') })
    expect(result.current.toasts).toHaveLength(2)
    const id = result.current.toasts[0].id
    act(() => { result.current.dismiss(id) })
    expect(result.current.toasts).toHaveLength(1)
    expect(result.current.toasts[0].message).toBe('B')
  })

  it('supports multiple toasts at once', () => {
    const { result } = renderHook(() => useToast())
    act(() => {
      result.current.show('First', 'info')
      result.current.show('Second', 'error')
    })
    expect(result.current.toasts).toHaveLength(2)
  })
})
