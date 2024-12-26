export interface ConnectedClient {
  id: string
  username: string
  lastMessage: {
    topic: string
    message: string
    timestamp: string
  } | null
  connected: boolean
  connectedAt: Date
}

export interface ConnectedDevice {
  id: string
  vin: string
  online: boolean
  locked: string
  connected: boolean
  connectedAt: Date
}
