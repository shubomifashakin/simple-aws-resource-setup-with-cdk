import { Construct } from "constructs";

import * as cdk from "aws-cdk-lib";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { BlockPublicAccess, Bucket } from "aws-cdk-lib/aws-s3";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { AttributeType, Table } from "aws-cdk-lib/aws-dynamodb";
import { HttpApi, HttpMethod } from "aws-cdk-lib/aws-apigatewayv2";
import { HttpLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";

const region = "us-east-1";

export class SimpleAwsCdkStackStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, {
      ...props,
      env: {
        region,
      },
    });

    const myBucket = new Bucket(this, "my-simple-s3-bucket-sh", {
      bucketName: "my-simple-s3-bucket-sh",
      versioned: true,
      //delte the added user after 2 days
      lifecycleRules: [{ expiration: cdk.Duration.days(2) }],
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      publicReadAccess: true,
      blockPublicAccess: BlockPublicAccess.BLOCK_ACLS,
    });

    const myDynamoTable = new Table(this, "my-simple-dynamo-table-sh", {
      tableName: "my-simple-dynamo-table-sh",
      partitionKey: {
        name: "id",
        type: AttributeType.STRING,
      },
      pointInTimeRecovery: true,

      //destroy the table when we destroy the stack
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    //crete a gsi on the username attribute
    myDynamoTable.addGlobalSecondaryIndex({
      indexName: "username-index",
      partitionKey: {
        name: "username",
        type: AttributeType.STRING,
      },
    });

    const myLambda = new NodejsFunction(
      this,
      "my-simple-nodejs-lambda-function-sh",
      {
        functionName: "my-simple-node-js-lambda-sh",

        runtime: Runtime.NODEJS_LATEST,

        entry: "./lambda/handler.ts",

        handler: "handler",

        environment: {
          BUCKETNAME: myBucket.bucketName,
          TABLENAME: myDynamoTable.tableName,
          REGION: region,
        },

        bundling: {
          minify: true,
          sourceMap: true,
        },
      }
    );

    const myHttpApi = new HttpApi(this, "my-simple-http-api-sh", {
      apiName: "my-simple-http-api-sh",
      createDefaultStage: false,
    });

    myHttpApi.addStage("my-http-dev-stage-sh", {
      stageName: "dev",
      autoDeploy: true,
    });

    myHttpApi.addStage("my-http-prod-stage-sh", {
      stageName: "prod",
      autoDeploy: false,
    });

    //used to upload new users to the db
    myHttpApi.addRoutes({
      path: "/user/new",
      methods: [HttpMethod.PUT],
      integration: new HttpLambdaIntegration(
        "my-simple-route-integration-1-sh",
        myLambda
      ),
    });

    myHttpApi.addRoutes({
      path: "/user/{username}",
      methods: [HttpMethod.GET],
      integration: new HttpLambdaIntegration(
        "my-simple-route-integration-2-sh",
        myLambda
      ),
    });

    //grant the lambda permission to call the dynamo db & s3
    myDynamoTable.grantReadWriteData(myLambda);
    myBucket.grantReadWrite(myLambda);
  }
}
