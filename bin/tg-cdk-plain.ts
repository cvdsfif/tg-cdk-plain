#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { TgCdkPlainStack } from '../lib/tg-cdk-plain-stack';

const app = new cdk.App();
new TgCdkPlainStack(app, 'TgCdkPlainStack', {

})