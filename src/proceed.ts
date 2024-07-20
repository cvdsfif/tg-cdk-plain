import { SecretsManager } from "@aws-sdk/client-secrets-manager"
import { Telegraf } from "telegraf"

export const REPLY_DATA = {
    reply_markup: {
        inline_keyboard: [
            [{ text: "Hello", callback_data: "hello" }],
            [{ text: "Bonjour", callback_data: "bonjour" }]
        ]
    }
}

export type HandlerEvent = {
    body: string
}

export const proceedImpl = async ({ telegraf }: { telegraf: Telegraf }) => {
    telegraf.start(async ctx => {
        await ctx.replyWithHTML("Welcome, Bienvenue", REPLY_DATA)
    })

    telegraf.action("hello", async ctx => {
        await ctx.replyWithHTML("Hello world!", REPLY_DATA)
    })

    telegraf.action("bonjour", async ctx => {
        await ctx.replyWithHTML("Hein, cha vo ti, biloute?", REPLY_DATA)
    })
}

export const proceed = async (handlerEvent: HandlerEvent) => {
    const telegrafArn = process.env.TELEGRAF_SECRET_ARN
    if (!telegrafArn)
        throw new Error("Telegraf secret ARN not specified in the TELEGRAF_SECRET_ARN environment variable")
    const secretString =
        (await new SecretsManager()
            .getSecretValue({ SecretId: telegrafArn }))
            .SecretString

    const telegraf = new Telegraf(secretString!)
    proceedImpl({ telegraf })

    const body = JSON.parse(handlerEvent.body)
    await telegraf.handleUpdate(body)
}