export interface ConnectedClient {
  id: string
  username: string
  connected: boolean
  connectedAt: Date
  lastMessage: {
    topic: string
    message: string
    timestamp: string
  } | null
}

export interface ConnectedDevice {
  id: string
  vin: string
  online: boolean
  locked: string
  connected: boolean
  connectedAt: Date
}
