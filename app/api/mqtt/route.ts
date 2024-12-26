import { NextApiRequest, NextApiResponse } from "next"
import { mqttManager } from "@/lib/mqttManager"
import { ConnectedDevice } from "@/types/mqtt"

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    res.setHeader("Content-Type", "text/event-stream")
    res.setHeader("Cache-Control", "no-cache")
    res.setHeader("Connection", "keep-alive")

    const sendEvent = (data: ConnectedDevice[]) => {
      console.log("Sending SSE event:", data)
      res.write(`data: ${JSON.stringify(data)}\n\n`)
    }

    const handleDevicesUpdated = (devices: ConnectedDevice[]) => {
      sendEvent(devices)
    }

    mqttManager.on("devicesUpdated", handleDevicesUpdated)

    req.on("close", () => {
      mqttManager.off("devicesUpdated", handleDevicesUpdated)
      res.end()
    })
  } else {
    res.status(405).end() // Method Not Allowed
  }
}
