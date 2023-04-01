import { Callback, Context } from "aws-lambda";
import { ProductEvent } from "/opt/nodejs/productEventsLayer"
import * as AWSXRay from 'aws-xray-sdk';
import { AWSError, DynamoDB } from "aws-sdk";
import { PromiseResult } from "aws-sdk/lib/request";

AWSXRay.captureAWS(require('aws-sdk'));

const eventsDdb = process.env.EVENTS_DDB!;
const ddbClient = new DynamoDB.DocumentClient(); 

export async function handler(event: ProductEvent, context: Context, callback: Callback): Promise<void> {
    console.log(event);

    console.log(`Lambda requestId: ${context.awsRequestId}`);
    console.log(`Email: ${event.email}`);

    createEvent(event);

    callback(null, JSON.stringify({
        productEventCreated: true,
        message: 'OK'
    }));
}

export async function createEvent(event: ProductEvent)
: Promise<PromiseResult<DynamoDB.DocumentClient.PutItemOutput, AWSError>> {
    const timeStamp = Date.now();
    const ttl = ~~(timeStamp / 1000 + 5 * 60);

    return await ddbClient.put({
        TableName: eventsDdb,
        Item: {
            pk: `#product_${event.productCode}`,
            sk: `${event.eventType}#${timeStamp}`,
            email: event.email,
            created_at: timeStamp,
            requestId: event.requestId,
            eventType: event.eventType,
            ttl
        }
    }).promise();
}