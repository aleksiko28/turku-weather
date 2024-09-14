import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions"
import { TableClient, AzureNamedKeyCredential } from "@azure/data-tables"

export async function getWeatherByDate(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log(`Http function processed request for url "${request.url}"`)

  const dateStr = request.query.get("date")

  if (!dateStr) {
    return {
      status: 400,
      body: "Please pass a date and time in the query string",
    }
  }

  try {
    // Connect to Azure Table Storage
    const tableName = "WeatherTurku"
    const accountName = process.env["AZURE_STORAGE_ACCOUNT_NAME"]
    const accountKey = process.env["AZURE_STORAGE_ACCOUNT_KEY"]

    const credential = new AzureNamedKeyCredential(accountName, accountKey)
    const tableClient = new TableClient(
      `https://${accountName}.table.core.windows.net`,
      tableName,
      credential
    )

    // Query the table by PartitionKey and filter by the provided date/time
    const partitionKey = "Turku"
    const entities = tableClient.listEntities({
      queryOptions: {
        filter: `PartitionKey eq '${partitionKey}' and timestamp eq '${dateStr}'`,
      },
    })

    let result: any = null
    for await (const entity of entities) {
      result = entity // Get the first matching result
      break
    }

    if (result) {
      const stringified = JSON.stringify({
        date: dateStr,
        temperature: result.temperature,
      })
      return {
        status: 200,
        body: stringified,
      }
    } else {
      return {
        status: 404,
        body: `No temperature data found for ${dateStr}`,
      }
    }
  } catch (error: any) {
    return {
      status: 500,
      body: `Error: ${error.message}`,
    }
  }
}

app.http("getWeatherByDate", {
  methods: ["GET", "POST"],
  authLevel: "anonymous",
  handler: getWeatherByDate,
})
