import React, { useEffect, useState } from "react"
import { mqttManager } from "../lib/mqttManager"

interface Device {
  sid: string
  online: boolean
  locked: string
  vin: string
  ecuList: string[]
}

const DeviceList: React.FC = () => {
  const [devices, setDevices] = useState<Device[]>([])

  const updateDeviceList = (newDevice: Device) => {
    setDevices((prevDevices) => {
      const existingDeviceIndex = prevDevices.findIndex(
        (device) => device.sid === newDevice.sid
      )
      if (existingDeviceIndex !== -1) {
        const updatedDevices = [...prevDevices]
        updatedDevices[existingDeviceIndex] = newDevice
        return updatedDevices
      } else {
        return [...prevDevices, newDevice]
      }
    })
  }

  const removeDevice = (sid: string) => {
    setDevices((prevDevices) =>
      prevDevices.filter((device) => device.sid !== sid)
    )
  }

  useEffect(() => {
    const messageHandler = (topic: string, payload: Buffer) => {
      console.log("Received message:", { topic, payload: payload.toString() })
      if (topic.startsWith("VinList/")) {
        const sid = topic.split("/")[1]
        const messageType = topic.split("/")[2]
        const newDevice: Device = {
          sid,
          online: false,
          locked: "free",
          vin: "",
          ecuList: ["e400"],
        }

        if (
          messageType === "online" &&
          payload.toString() !== "\0" &&
          payload.toString() !== "offline"
        ) {
          newDevice.online = true
          newDevice.vin = payload.toString().split(",")[0]
        }
        if (
          messageType === "online" &&
          (payload.toString() === "offline" || payload.toString() === "\0")
        ) {
          removeDevice(sid)
          return
        }
        if (messageType === "locked") {
          newDevice.locked = payload.toString()
        }
        if (!newDevice.online) return
        console.log("Updating device list with:", newDevice)
        updateDeviceList(newDevice)
      }
    }

    const handleConnect = () => {
      console.log("MQTT connected, subscribing to messages")
      mqttManager.subscribeToMessages(messageHandler)
    }

    mqttManager.on("connect", handleConnect)

    return () => {
      mqttManager.off("connect", handleConnect)
      if (mqttManager.isConnected()) {
        mqttManager.unsubscribeFromMessages(messageHandler)
      }
    }
  }, [])

  useEffect(() => {
    const eventSource = new EventSource("/api/mqtt/events")

    eventSource.onopen = () => {
      console.log("SSE connection opened")
    }

    eventSource.onmessage = (event) => {
      try {
        console.log("Received SSE message:", event.data)
        const devices = JSON.parse(event.data)
        setDevices(devices)
      } catch (error) {
        console.error("Error parsing SSE message:", error)
      }
    }

    eventSource.onerror = (error) => {
      console.error("SSE error:", error)
      eventSource.close()
    }

    return () => {
      console.log("Closing SSE connection")
      eventSource.close()
    }
  }, [])

  return (
    <div>
      <h2>在线设备列表</h2>
      <ul>
        {devices
          .filter((device) => device.online)
          .map((device) => (
            <li key={device.sid}>
              <p>SID: {device.sid}</p>
              <p>VIN: {device.vin}</p>
              <p>锁定状态: {device.locked}</p>
              <p>ECU 列表: {device.ecuList.join(", ")}</p>
            </li>
          ))}
      </ul>
    </div>
  )
}

export default DeviceList
