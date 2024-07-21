import { SecretsManager } from "@aws-sdk/client-secrets-manager"
import { Telegraf } from "telegraf"

export const createTelegrafConnection = async () => {
    const telegrafArn = process.env.TELEGRAF_SECRET_ARN
    if (!telegrafArn)
        throw new Error("Telegraf secret ARN not specified in the TELEGRAF_SECRET_ARN environment variable")
    const secretString =
        (await new SecretsManager()
            .getSecretValue({ SecretId: telegrafArn }))
            .SecretString

    return new Telegraf(secretString!)
}