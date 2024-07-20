import { App } from "aws-cdk-lib"
import { TgCdkPlainStack } from "../lib/tg-cdk-plain-stack"
import { Match, Template } from "aws-cdk-lib/assertions";

test('Should create a Secret, a Lambda function and a connected HTTP API', () => {
    // GIVEN a test CDK app
    const app = new App()

    // WHEN creating a test stack
    const stack = new TgCdkPlainStack(app, 'MyTestStack');
    const template = Template.fromStack(stack)

    // THEN there is a Secret
    template.hasResourceProperties('AWS::SecretsManager::Secret', {
        Description: Match.stringLikeRegexp("Telegram")
    })

    // AND we have a Lambda Layer with some shared code
    template.hasResourceProperties("AWS::Lambda::LayerVersion",
        Match.objectLike({
            Content: { S3Bucket: Match.anyValue() }
        })
    )

    // AND a Lambda function
    template.hasResourceProperties('AWS::Lambda::Function', {
        Environment: {
            Variables: {
                TELEGRAF_SECRET_ARN: Match.anyValue()
            }
        },
        Layers: Match.anyValue()
    })

    // AND an HTTP API
    template.hasResourceProperties('AWS::ApiGatewayV2::Api', {
        Name: "TelegramApi",
        // The API is configured with a CORS policy allowing all the origins
        CorsConfiguration: {
            AllowOrigins: ["*"],
            AllowMethods: ["*"],
            AllowHeaders: ["*"]
        }
    })

    // AND there is a policy allowing the lambda to access the secret
    template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument:
        {
            Statement: [
                {
                    Effect: "Allow",
                    Resource: { Ref: Match.stringLikeRegexp("TelegrafSecret") }
                }
            ]
        }
    })

    // AND a Lambda integration for the API
    template.hasResourceProperties('AWS::ApiGatewayV2::Integration', {
        IntegrationType: 'AWS_PROXY'
    })
})
