import {
  DynamoDBClient,
  PutItemCommand,
  QueryCommand,
} from "@aws-sdk/client-dynamodb";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { APIGatewayProxyEventV2 } from "aws-lambda";
import { Handler } from "aws-cdk-lib/aws-lambda";

import { v4 as uuidv4 } from "uuid";

import { newUserValidator, pathParametersValidator } from "../schema/validator";

const tableName = process.env.TABLENAME;
const bucketName = process.env.BUCKETNAME;
const region = process.env.REGION;

const s3Client = new S3Client({ region });
const dynamo = new DynamoDBClient({ region });

export const handler: Handler = async (event: APIGatewayProxyEventV2) => {
  try {
    if (event.routeKey === "GET /user/{username}") {
      const { success, data, error } = pathParametersValidator.safeParse(
        event.pathParameters
      );

      if (!success) {
        return { statusCode: 400, body: JSON.stringify(error) };
      }

      const req = await dynamo.send(
        new QueryCommand({
          TableName: tableName,
          IndexName: "username-index",
          KeyConditionExpression: "username = :username",
          ExpressionAttributeValues: {
            ":username": { S: data.username },
          },
        })
      );

      return { statusCode: 200, body: JSON.stringify(req.Items) };
    }

    if (event.routeKey === "PUT /user/new" && event.body) {
      const body = JSON.parse(event.body) as unknown;

      //validate the info sent
      const { success, error, data } = newUserValidator.safeParse(body);

      if (!success) {
        return { statusCode: 400, body: JSON.stringify(error) };
      }

      //deccde the base64 image string
      const imageBuffer = Buffer.from(data.profilePicture, "base64");

      const imageKey = `profile-images/${uuidv4()}`;

      //upload the profile image to s3
      await s3Client.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: imageKey,
          Body: imageBuffer,
          ContentType: "image/jpeg",
        })
      );

      //generate the link to the proffle imge
      const imageUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${imageKey}`;

      //generate a user id for the user
      const userId = uuidv4();

      await dynamo.send(
        new PutItemCommand({
          TableName: tableName,
          Item: {
            id: { S: userId },
            username: { S: data.username },
            firstName: { S: data.firstName },
            lastName: { S: data.lastName },
            profilePicture: { S: imageUrl },
            createdAt: { S: new Date().toISOString() },
          },
        })
      );

      return { statusCode: 200, body: userId };
    }

    throw new Error("invalid path");
  } catch (error: unknown) {
    if (error instanceof Error) {
      return { statusCode: 401, body: JSON.stringify(error.message) };
    }

    return { statusCode: 500, body: JSON.stringify("internal server error") };
  }
};
