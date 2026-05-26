import { Client } from '@stomp/stompjs'

type MessageHandler = (msg: any) => void

let client: Client | null = null
let handlers: MessageHandler[] = []
let isConnected = false

export function isSocketConnected(): boolean {
  return isConnected && (client?.active ?? false)
}

export function connectChat(token: string, onMessage: MessageHandler) {
  handlers.push(onMessage)
  if (client?.active) return

  const backendUrl = import.meta.env.VITE_BACKEND_URL || ''
  const wsUrl = backendUrl
    ? `${backendUrl.replace(/^https/, 'wss').replace(/^http/, 'ws')}/ws/chat`
    : `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws/chat`

  client = new Client({
    brokerURL: wsUrl,
    connectHeaders: { Authorization: `Bearer ${token}` },
    reconnectDelay: 5000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    onConnect: () => {
      isConnected = true
      client!.subscribe('/user/queue/messages', (frame) => {
        const msg = JSON.parse(frame.body)
        handlers.forEach((h) => h(msg))
        window.dispatchEvent(new CustomEvent('chat:message', { detail: msg }))
      })
    },
    onDisconnect: () => {
      isConnected = false
    },
    onStompError: (frame) => {
      console.error('STOMP error', frame)
      isConnected = false
    },
    onWebSocketError: (event) => {
      console.error('WebSocket error', event)
      isConnected = false
    },
  })
  client.activate()
}

export function disconnectChat(handler: MessageHandler) {
  handlers = handlers.filter((h) => h !== handler)
  if (handlers.length === 0 && client?.active) {
    client.deactivate()
    client = null
    isConnected = false
  }
}
