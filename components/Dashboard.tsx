"use client"
import Navbar from "./Navbar"
import MQTTdevice from "./MQTTdevice"
import DeviceList from "./DeviceList"
import OnlineUsers from "./OnlineUsers"
import MQTTProvider from "./MQTTProvider"

export default function Dashboard() {
  return (
    <MQTTProvider>
      <div>
        <Navbar />
        <main className="container mx-auto p-4 space-y-4">
          <OnlineUsers />
          <DeviceList />
          <MQTTdevice />
        </main>
      </div>
    </MQTTProvider>
  )
}
