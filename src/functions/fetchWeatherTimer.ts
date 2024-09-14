import { app, InvocationContext, Timer } from "@azure/functions"
import fetch from "node-fetch"
import { TableClient, AzureNamedKeyCredential } from "@azure/data-tables"
import { v4 as uuidv4 } from "uuid"

export async function fetchWeatherTimer(
  myTimer: Timer,
  context: InvocationContext
): Promise<void> {
  context.log("Timer function processed request.")

  const timeStamp = new Date().toISOString()

  // OpenWeatherMap API details
  const apiKey = process.env.OPENWEATHERMAP_API_KEY as string
  const city = "Turku"
  const url = `http://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`

  try {
    // Fetch weather data from OpenWeatherMap using native fetch
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to fetch weather data: ${response.statusText}`)
    }

    const data = await response.json()
    const temperature = (data as any).main.temp

    // Connect to Azure Table Storage
    const tableName = "WeatherData"
    const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME as string
    const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY as string

    const credential = new AzureNamedKeyCredential(accountName, accountKey)
    const tableClient = new TableClient(
      `https://${accountName}.table.core.windows.net`,
      tableName,
      credential
    )

    // Create the entity to store in the table
    const entity = {
      partitionKey: "Turku",
      rowKey: uuidv4(), // Unique ID for the row
      timestamp: timeStamp,
      temperature: temperature,
    }

    // Insert the entity into the table
    await tableClient.createEntity(entity)

    context.log(`Stored temperature: ${temperature}°C at ${timeStamp}`)
  } catch (error: any) {
    context.error(`Error fetching or storing data: ${error.message}`)
  }
}

app.timer("fetchWeatherTimer", {
  schedule: "0 0 * * * *",
  handler: fetchWeatherTimer,
})
