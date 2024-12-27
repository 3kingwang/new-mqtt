"use client"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import MQTTdevice from "./MQTTdevice"
import DeviceList from "./DeviceList"
import Navbar from "./Navbar"
import useMQTTStore from "@/stores/mqttStore"
import OnlineUsers from "./OnlineUsers"

export default function Dashboard() {
  const router = useRouter()
  const { reconnect, isConnected, username } = useMQTTStore()

  useEffect(() => {
    if (!isConnected && !username) {
      router.push("/login")
    } else if (!isConnected && username) {
      reconnect()
    }
  }, [isConnected, username, reconnect, router])

  if (!isConnected) {
    return null
  }

  return (
    <div>
      <Navbar />
      <main className="container mx-auto p-4 space-y-4">
        <OnlineUsers />
        <DeviceList />
        <MQTTdevice />
      </main>
    </div>
  )
}
