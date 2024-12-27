"use client"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import useMQTTStore from "@/stores/mqttStore"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export default function DeviceList() {
  const router = useRouter()
  const { devices, isConnected } = useMQTTStore()
  const onlineDevices = Array.from(devices.values()).filter(
    (device) => device.online
  )

  useEffect(() => {
    if (!isConnected) {
      router.push("/login")
    }
  }, [isConnected, router])

  if (!isConnected) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>在线设备</CardTitle>
      </CardHeader>
      <CardContent>
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="选择设备" />
          </SelectTrigger>
          <SelectContent>
            {onlineDevices.map((device) => (
              <SelectItem key={device.id} value={device.id}>
                <div className="flex items-center justify-between w-full">
                  <div>
                    <span className="font-medium">
                      {device.vin || "未知车辆"}
                    </span>
                    <span className="text-sm text-muted-foreground ml-2">
                      {device.id}
                    </span>
                  </div>
                  <Badge
                    variant={device.locked === "free" ? "secondary" : "warning"}
                  >
                    {device.locked === "free" ? "空闲" : "占用"}
                  </Badge>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {onlineDevices.length === 0 && (
          <p className="text-sm text-muted-foreground text-center mt-2">
            暂无在线设备
          </p>
        )}
      </CardContent>
    </Card>
  )
}
