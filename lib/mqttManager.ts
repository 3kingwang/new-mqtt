import mqtt from "mqtt"
import { EventEmitter } from "events"
import { ConnectedClient, ConnectedDevice } from "../types/mqtt"

class MQTTManager extends EventEmitter {
  private clients: Map<string, ConnectedClient> = new Map()
  private devices: Map<string, ConnectedDevice> = new Map()
  private broker!: typeof mqtt.Client.prototype
  private static instance: MQTTManager
  private currentUsername: string | null = null

  constructor() {
    super()
    this.setMaxListeners(20)
  }

  static getInstance(): MQTTManager {
    if (!MQTTManager.instance) {
      MQTTManager.instance = new MQTTManager()
    }
    return MQTTManager.instance
  }

  connect(username: string, password: string) {
    console.log("MQTT: Connecting as:", username)

    if (this.currentUsername === username && this.broker?.connected) {
      console.log("MQTT: Already connected with same username")
      this.emit("clientsUpdated", this.getConnectedClients())
      return
    }

    if (this.broker) {
      console.log("MQTT: Closing existing connection")
      this.broker.end(true)
    }

    this.currentUsername = username
    this.broker = mqtt.connect(process.env.MQTT_BROKER_URL!, {
      username,
      password,
      clean: true,
      keepalive: 30,
      rejectUnauthorized: false,
      will: {
        topic: `ClientList/online/${username}`,
        payload: "no",
        qos: 1,
        retain: true,
      },
    })

    this.broker.on("connect", () => {
      console.log("MQTT: Connected to broker as:", username)
      this.clients = new Map()
      this.addClient(username, username)

      const topics = [
        "#",
        "ClientList/online/#",
        `${username}/#`,
        "system/#",
        "broadcast",
        "V/#",
      ]

      this.broker.subscribe(topics, { qos: 1 }, (err) => {
        if (err) {
          console.error("MQTT: Subscribe error:", err)
          return
        }
        console.log("MQTT: Subscribed to topics:", topics)

        this.broker.publish(
          `ClientList/online/${username}`,
          "yes",
          { qos: 1, retain: true },
          (err) => {
            if (err) {
              console.error("MQTT: Publish error:", err)
              return
            }
            console.log("MQTT: Published online status")
            this.emit("clientsUpdated", this.getConnectedClients())
          }
        )
      })

      this.broker.on("close", () => {
        this.removeAllListeners("clientsUpdated")
      })
    })

    this.broker.on("message", (topic, message) => {
      try {
        const messageStr = message.toString()
        console.log("MQTT: Message received:", {
          topic,
          message: messageStr,
          hex: message.toString("hex"),
        })
        this.handleMessage(topic, message)
      } catch (error) {
        console.error("MQTT: Error in message handler:", error)
      }
    })

    this.broker.on("error", (error) => {
      console.error("MQTT error:", error)
    })

    this.broker.on("close", () => {
      console.log("MQTT connection closed")
      if (this.currentUsername === username) {
        this.currentUsername = null
      }
    })

    this.broker.on("offline", () => {
      console.log("MQTT connection offline")
    })

    this.broker.on("reconnect", () => {
      console.log("MQTT reconnecting...")
    })
  }

  subscribeToMessages(handler: (topic: string, payload: Buffer) => void) {
    if (!this.broker || !this.broker.connected) {
      console.error("MQTT: Broker is not connected")
      return
    }
    this.broker.on("message", handler)
  }

  unsubscribeFromMessages(handler: (topic: string, payload: Buffer) => void) {
    if (!this.broker || !this.broker.connected) {
      console.error("MQTT: Broker is not connected, cannot unsubscribe")
      return
    }
    this.broker.off("message", handler)
  }

  private handleMessage(topic: string, message: Buffer) {
    try {
      console.log("Handling MQTT message:", {
        topic,
        message: message.toString(),
      })

      if (topic.startsWith("ClientList/online/")) {
        const username = topic.split("/")[2]
        const isOnline = message.toString() === "yes"
        console.log("MQTT: Client status update:", { username, isOnline })

        if (isOnline) {
          this.addClient(username, username)
        } else {
          this.removeClient(username)
        }
        return
      }

      if (topic.startsWith("VinList/")) {
        const sid = topic.split("/")[1]
        const messageType = topic.split("/")[2]
        const newDevice: ConnectedDevice = {
          id: sid,
          vin: "",
          online: false,
          locked: "free",
          connected: false,
          connectedAt: new Date(),
        }

        if (
          messageType === "online" &&
          message.toString() !== "\0" &&
          message.toString() !== "offline"
        ) {
          newDevice.online = true
          newDevice.connected = true
          newDevice.vin = message.toString().split(",")[0]
          this.addDevice(sid, newDevice)
        }
        if (
          messageType === "online" &&
          (message.toString() === "offline" || message.toString() === "\0")
        ) {
          this.removeDevice(sid)
          return
        }
        if (messageType === "locked") {
          newDevice.locked = message.toString()
          this.updateDevice(sid, newDevice)
        }
      }

      const messageData = {
        topic,
        message: message.toString(),
        timestamp: new Date().toISOString(),
      }

      const client = this.clients.get(this.currentUsername!)
      if (client) {
        console.log("MQTT: Updating message for current user:", messageData)
        client.lastMessage = messageData
        this.emit("clientsUpdated", this.getConnectedClients())
      } else {
        console.log(
          "MQTT: No client found for current user:",
          this.currentUsername
        )
      }
    } catch (error) {
      console.error("MQTT: Error handling message:", error)
    }
  }

  addClient(id: string, username: string) {
    console.log(`MQTT: Adding/updating client ${username} with id ${id}`)
    const existingClient = this.clients.get(id)
    this.clients.set(id, {
      id,
      username,
      lastMessage: existingClient?.lastMessage || null,
      connected: true,
      connectedAt: existingClient?.connectedAt || new Date(),
    })
    this.emit("clientsUpdated", this.getConnectedClients())
  }

  removeClient(id: string) {
    this.clients.delete(id)
    this.emit("clientsUpdated", this.getConnectedClients())
  }

  getConnectedClients(): ConnectedClient[] {
    const clients = Array.from(this.clients.values())
    console.log("MQTT: Getting connected clients:", clients)
    return clients
  }

  isConnected(): boolean {
    return this.broker && this.broker.connected
  }

  addDevice(id: string, device: ConnectedDevice) {
    console.log(`MQTT: Adding/updating device with id ${id}`)
    this.devices.set(id, device)
    this.emit("devicesUpdated", this.getConnectedDevices())
  }

  updateDevice(id: string, device: ConnectedDevice) {
    const existingDevice = this.devices.get(id)
    if (existingDevice) {
      existingDevice.connected = device.online
      existingDevice.vin = device.vin
      existingDevice.locked = device.locked
      this.devices.set(id, existingDevice)
      this.emit("devicesUpdated", this.getConnectedDevices())
    }
  }

  removeDevice(id: string) {
    this.devices.delete(id)
    this.emit("devicesUpdated", this.getConnectedDevices())
  }

  getConnectedDevices(): ConnectedDevice[] {
    const devices = Array.from(this.devices.values())
    console.log("MQTT: Getting connected devices:", devices)
    return devices
  }
}

export const mqttManager = MQTTManager.getInstance()
