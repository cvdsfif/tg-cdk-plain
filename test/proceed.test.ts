import { Context } from "telegraf"

const BOT_ID = "bot_id"

jest.mock("@aws-sdk/client-secrets-manager", () => ({
    SecretsManager: jest.fn().mockImplementation(() => ({
        getSecretValue: jest.fn().mockImplementation(() => Promise.resolve({
            SecretString: BOT_ID
        }))
    }))
}))

const telegrafConstructorMock = jest.fn()

jest.mock("telegraf", () => ({
    Telegraf: telegrafConstructorMock
}))

import { proceed, proceedImpl, REPLY_DATA } from "../src/proceed"

describe("Testing a basic Telegram bot", () => {
    // This will catch the messages we'll send to the bot
    const replyMock = jest.fn()
    let envSaved: NodeJS.ProcessEnv

    // This one is called when the bot user start the dialog by typing /start
    let startFunc: (ctx: Context) => any
    // This will be called in response to pressing the `hello` button
    let helloFunc: (ctx: Context) => any
    // This will be called in response to pressing the `bonjour` button
    let bonjourFunc: (ctx: Context) => any

    // We have to make sure that messages sent from Telegram are processed
    const handleUpdateMock = jest.fn()

    const telegraf = {
        // From here, we start the functions called on the Telegraf object to be able to test their behaviour
        start: jest.fn().mockImplementation(func => { startFunc = func }),
        action: jest.fn().mockImplementation((message, func) => {
            switch (message) {
                case "hello":
                    helloFunc = func
                    break
                case "bonjour":
                    bonjourFunc = func
                    break
            }
        }),
        handleUpdate: handleUpdateMock,
    } as any

    beforeEach(() => {
        // To clean the environment before every test, we have to copy it key by key into a new object
        envSaved = {} as any
        for (const key in process.env) envSaved[key] = process.env[key]

        telegrafConstructorMock.mockImplementation(() => telegraf)
    })

    afterEach(() => {
        process.env = envSaved
        replyMock.mockClear()
        telegrafConstructorMock.mockClear()
        handleUpdateMock.mockClear()
    })

    const userId = 1234
    const userName = "name"

    const fromMessage = {
        from: {
            username: userName,
            id: userId
        }
    }

    // Structure of the message received when the user sends the /start message
    const startMessage = {
        message: fromMessage,
        replyWithHTML: replyMock
    } as any

    // Structure of the message received when the user receives a message from an inline button
    const actionMessage = {
        update: {
            callback_query: fromMessage
        },
        replyWithHTML: replyMock
    } as any

    // We create a stub for the message that Telegram sends to the bot.
    // We don't care about the details of the message, we just want to know that it was sent
    const messageStub = { chat: { id: 0 } }
    const eventStub = {
        body: JSON.stringify(messageStub)
    }

    test("Should reply to start message with the prompt with two buttons", async () => {
        // GIVEN the bot webhook is called
        await proceedImpl({ telegraf })

        // WHEN the user sends the /start command
        await startFunc(startMessage)

        // THEN the bot replies with the prompt and the keyboard
        expect(replyMock).toHaveBeenLastCalledWith(expect.stringContaining("Welcome, Bienvenue"), REPLY_DATA)
    })

    test("Should correctly reply to the hello message", async () => {
        // GIVEN the bot webhook is called
        await proceedImpl({ telegraf })

        // WHEN the user activates the hello bunnon
        await helloFunc(actionMessage)

        // THEN the bot replies with the prompt and the keyboard
        expect(replyMock).toHaveBeenLastCalledWith(expect.stringContaining("Hello world"), REPLY_DATA)
    })

    test("Should correctly reply to the bonjour message", async () => {
        // GIVEN the bot webhook is called
        await proceedImpl({ telegraf })

        // WHEN the user activates the hello bunnon
        await bonjourFunc(actionMessage)

        // THEN the bot replies with the prompt and the keyboard
        expect(replyMock).toHaveBeenLastCalledWith(expect.stringContaining("Hein, cha vo ti, biloute?"), REPLY_DATA)
    })

    test("Should initialize Telegraf with a bot ID", async () => {
        // GIVEN there is a secret ARN for the bot ID in the environment
        process.env.TELEGRAF_SECRET_ARN = "arn"

        // WHEN starting the bot
        await proceed(eventStub)

        // THEN the Telegraf constructor is called with the bot ID
        expect(telegrafConstructorMock).toHaveBeenCalledWith(BOT_ID)

        // AND the Telegram message is processed by the bot
        expect(handleUpdateMock).toHaveBeenCalledWith(messageStub)
    })

    test("Should raise an exception if there is no ARN for the bot ID in the environment", async () => {
        // GIVEN there is no secret ARN for the bot ID in the environment

        // WHEN starting the bot
        // THEN an exception is raised
        await expect(proceed(eventStub)).rejects.toThrow()
    })
})