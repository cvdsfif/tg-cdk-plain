import { CfnOutput, CustomResource, Duration, Stack, StackProps } from 'aws-cdk-lib';
import { CorsHttpMethod, HttpApi } from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { HttpMethod } from 'aws-cdk-lib/aws-events';
import { Code, LayerVersion, Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { Provider } from 'aws-cdk-lib/custom-resources';
import { Construct } from 'constructs';

export class TgCdkPlainStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const telegrafSecret = new Secret(this, "TelegrafSecret", {
      description: "Store for the Telegram bot token"
    })

    const layer = new LayerVersion(this, "Layer", {
      code: Code.fromAsset("layer"),
      compatibleRuntimes: [Runtime.NODEJS_20_X]
    })

    const lambdaProperties = (additionalEnvironment: { [K: string]: string | undefined } = {}) => ({
      layers: [layer],
      timeout: Duration.seconds(30),
      runtime: Runtime.NODEJS_20_X,
      bundling: {
        minify: true,
        externalModules: ["@aws-sdk/client-secrets-manager", "telegraf"]
      },
      environment: {
        TELEGRAF_SECRET_ARN: telegrafSecret.secretArn,
        ...additionalEnvironment
      }
    })

    const lambda = new NodejsFunction(this, "ProceedFunction", {
      entry: "src/proceed.ts",
      handler: "proceed",
      ...lambdaProperties()
    })

    telegrafSecret.grantRead(lambda)

    const api = new HttpApi(this, "TelegramApi", {
      corsPreflight: { allowMethods: [CorsHttpMethod.ANY], allowOrigins: ['*'], allowHeaders: ['*'] },
    })

    const lambdaIntegration = new HttpLambdaIntegration("Telegraf integration", lambda)

    api.addRoutes({
      path: "/",
      methods: [HttpMethod.POST],
      integration: lambdaIntegration
    })

    new CfnOutput(this, "ApiUrl", { value: api.url! })

    const telegrafSetupLambda = new NodejsFunction(this, "TelegrafSetupFunction", {
      entry: "src/telegraf-setup-handler.ts",
      ...lambdaProperties({ TELEGRAF_API_URL: `${api.url}` })
    })

    telegrafSecret.grantRead(telegrafSetupLambda)

    const provider = new Provider(this, "TelegrafSetupProvider", {
      onEventHandler: telegrafSetupLambda
    })

    const checksum = Buffer.from(api.url!, "utf-8")
      .reduce((accumulator, sym) => accumulator = (accumulator + BigInt(sym)) % (65536n ** 2n), 0n)

    const customResource = new CustomResource(
      this,
      "TelegramBotSetup",
      {
        serviceToken: provider.serviceToken,
        resourceType: "Custom::TelegramBotSetup",
        properties: { Checksum: checksum.toString() }
      }
    )
    customResource.node.addDependency(api)
  }
}
