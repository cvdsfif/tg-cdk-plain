import * as cdk from 'aws-cdk-lib';
import { CorsHttpMethod, HttpApi } from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { HttpMethod } from 'aws-cdk-lib/aws-events';
import { Code, LayerVersion } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

export class TgCdkPlainStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const telegrafSecret = new Secret(this, "TelegrafSecret", {
      description: "Store for the Telegram bot token"
    })

    const layer = new LayerVersion(this, "Layer", {
      code: Code.fromAsset("layer")
    })

    const lambda = new NodejsFunction(this, "ProceedFunction", {
      entry: "src/proceed.ts",
      handler: "proceed",
      layers: [layer],
      bundling: {
        minify: true,
        externalModules: ["@aws-sdk/client-secrets-manager", "telegraf"]
      },
      environment: {
        TELEGRAF_SECRET_ARN: telegrafSecret.secretArn
      }
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
  }
}
