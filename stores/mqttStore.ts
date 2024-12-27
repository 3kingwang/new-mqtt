import { create } from "zustand"
import {
  createJSONStorage,
  persist,
} from "zustand/middleware"
import { Client, Message } from "paho-mqtt"

interface MessageHistory {
  topic: string
  payload: string
  timestamp: string
}

interface Device {
  id: string
  vin: string
  online: boolean
  locked: string
  connected: boolean
  connectedAt: Date
}

interface MQTTStore {
  client: Client | null
  messages: MessageHistory[]
  devices: Map<string, Device>
  isConnected: boolean
  authenticated: boolean
  username?: string
  password?: string
  onlineUsers: string[]
  connect: (username: string, password: string) => void
  disconnect: () => void
  reconnect: () => void
  addMessage: (message: MessageHistory) => void
  updateDevice: (id: string, device: Partial<Device>) => void
  removeDevice: (id: string) => void
  addOnlineUser: (username: string) => void
  removeOnlineUser: (username: string) => void
  init: () => void
}

const useMQTTStore = create<MQTTStore>()(
  persist(
    (set, get) => ({
      client: null,
      messages: [],
      devices: new Map(),
      onlineUsers: [],
      isConnected: false,
      authenticated: false,
      username: undefined,
      password: undefined,

      init: () => {
        const { username, password, authenticated } = get()
        if (authenticated && username && password && !get().isConnected) {
          get().connect(username, password)
        }
      },

      connect: (username: string, password: string) => {
        const clientId = `web_${username}_${Math.random()
          .toString(36)
          .substring(2, 10)}`
        const mqttClient = new Client(
          process.env.NEXT_PUBLIC_MQTT_HOST!,
          Number(process.env.NEXT_PUBLIC_MQTT_PORT!),
          clientId
        )

        mqttClient.onConnectionLost = () => {
          set({ isConnected: false })
        }

        mqttClient.onMessageArrived = (message: Message) => {
          const { destinationName: topic, payloadString } = message

          if (topic.startsWith("VinList/")) {
            const [, sid, messageType] = topic.split("/")
            if (messageType === "online") {
              if (payloadString === "offline" || payloadString === "\0") {
                get().removeDevice(sid)
              } else {
                const vin = payloadString.split(",")[0]
                get().updateDevice(sid, {
                  id: sid,
                  vin,
                  online: true,
                  connected: true,
                  connectedAt: new Date(),
                })
              }
            }
            if (messageType === "locked") {
              get().updateDevice(sid, {
                locked: payloadString,
              })
            }
          }

          if (topic.startsWith("ClientList/online/")) {
            const user = topic.split("/")[2]
            if (payloadString === "yes") {
              get().addOnlineUser(user)
            } else {
              get().removeOnlineUser(user)
            }
          }

          get().addMessage({
            topic: message.destinationName,
            payload: message.payloadString,
            timestamp: new Date().toLocaleString(),
          })
        }

        mqttClient.connect({
          userName: username,
          password: password,
          useSSL: false,
          keepAliveInterval: 30,
          cleanSession: true,
          onSuccess: () => {
            mqttClient.subscribe("#")
            const message = new Message("yes")
            message.destinationName = `ClientList/online/${username}`
            message.retained = true
            mqttClient.send(message)

            set({
              client: mqttClient,
              isConnected: true,
              authenticated: true,
              username,
              password,
            })
          },
          onFailure: (err) => {
            console.error("MQTT connection failed:", err)
            set({
              isConnected: false,
              authenticated: false,
              username: undefined,
              password: undefined,
            })
          },
        })
      },

      disconnect: () => {
        const { client, username } = get()
        if (client?.isConnected()) {
          const offlineMsg = new Message("no")
          offlineMsg.destinationName = `ClientList/online/${username}`
          offlineMsg.retained = true
          client.send(offlineMsg)
          client.disconnect()
        }
        set({
          client: null,
          isConnected: false,
          authenticated: false,
          devices: new Map(),
          username: undefined,
          password: undefined,
          onlineUsers: [],
        })
      },

      reconnect: () => {
        const { username, password } = get()
        if (username && password) {
          try {
            get().connect(username, password)
          } catch (error) {
            console.error("Reconnection failed:", error)
            set({
              isConnected: false,
              username: undefined,
              password: undefined,
            })
          }
        }
      },

      addMessage: (message: MessageHistory) => {
        set((state) => ({
          messages: [message, ...state.messages.slice(0, 99)],
        }))
      },

      updateDevice: (id: string, deviceUpdate: Partial<Device>) => {
        set((state) => {
          const devices = new Map(state.devices)
          const existingDevice = devices.get(id)
          devices.set(id, {
            ...existingDevice,
            ...deviceUpdate,
            id,
          } as Device)
          return { devices }
        })
      },

      removeDevice: (id: string) => {
        set((state) => {
          const devices = new Map(state.devices)
          devices.delete(id)
          return { devices }
        })
      },

      addOnlineUser: (username: string) => {
        set((state) => ({
          onlineUsers: Array.from(new Set([...state.onlineUsers, username])),
        }))
      },

      removeOnlineUser: (username: string) => {
        set((state) => ({
          onlineUsers: state.onlineUsers.filter((user) => user !== username),
        }))
      },
    }),
    {
      name: "mqtt-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        username: state.username,
        password: state.password,
        authenticated: state.authenticated,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.authenticated) {
          useMQTTStore.getState().init()
        }
      },
    }
  )
)

export default useMQTTStore
