import { CloudFormationCustomResourceEvent, successResponse } from "./cloud-formation-types";
import { createTelegrafConnection } from "./create-telegraf-connection";

export const handler = async (event: CloudFormationCustomResourceEvent) => {
    let resourceId: string
    if (event.RequestType === "Create")
        resourceId = `custom-${event.RequestId}`
    else resourceId = event.PhysicalResourceId;
    const apiUrl = process.env.TELEGRAF_API_URL
    if (!apiUrl) throw new Error("TELEGRAF_API_URL is not set")

    const telegraf = await createTelegrafConnection()
    if (event.RequestType !== "Create") {
        await telegraf.telegram.deleteWebhook()
    }
    if (event.RequestType !== "Delete") {
        await telegraf.telegram.setWebhook(apiUrl)
    }
    return successResponse(`Telegram bot set at URL: ${apiUrl}`, resourceId, event)
}