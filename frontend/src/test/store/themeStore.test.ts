import { describe, it, expect, beforeEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useThemeStore } from '../../context/themeStore'

describe('themeStore', () => {
  beforeEach(() => {
    useThemeStore.setState({ theme: 'light' })
    document.documentElement.classList.remove('dark')
  })

  it('default theme is light', () => {
    const { result } = renderHook(() => useThemeStore())
    expect(result.current.theme).toBe('light')
  })

  it('toggleTheme switches light → dark', () => {
    const { result } = renderHook(() => useThemeStore())
    act(() => { result.current.toggleTheme() })
    expect(result.current.theme).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('toggleTheme switches dark → light', () => {
    useThemeStore.setState({ theme: 'dark' })
    document.documentElement.classList.add('dark')
    const { result } = renderHook(() => useThemeStore())
    act(() => { result.current.toggleTheme() })
    expect(result.current.theme).toBe('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('setTheme("dark") adds .dark class to <html>', () => {
    const { result } = renderHook(() => useThemeStore())
    act(() => { result.current.setTheme('dark') })
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('setTheme("light") removes .dark class from <html>', () => {
    document.documentElement.classList.add('dark')
    const { result } = renderHook(() => useThemeStore())
    act(() => { result.current.setTheme('light') })
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })
})
