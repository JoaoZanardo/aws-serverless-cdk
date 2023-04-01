import { SNSEvent, Context, SNSMessage } from "aws-lambda";
import { AWSError, DynamoDB } from "aws-sdk";
import * as AWSXRay from "aws-xray-sdk";
import { OrderEventRepository } from "/opt/nodejs/orderEventRepositoryLayer";
import { Envelope, OrderEvent } from "/opt/nodejs/orderEventsLayer";
import { PromiseResult } from "aws-sdk/lib/request";

AWSXRay.captureAWS(require('aws-sdk'));

const eventsDdb = process.env.EVENTS_DDB!;
const ddbClient = new DynamoDB.DocumentClient();

const orderEventRepoitory = new OrderEventRepository(ddbClient, eventsDdb);

export async function handler(event: SNSEvent, context: Context): Promise<void> {
    
    const promises: Promise<PromiseResult<DynamoDB.DocumentClient.PutItemOutput, AWSError>>[] = [];

    event.Records.map(record => {
       promises.push(createEventDdb(record.Sns));
    });

    await Promise.all(promises);
}

function createEventDdb(body: SNSMessage) {
    const envelope = JSON.parse(body.Message) as Envelope;
    const event = JSON.parse(envelope.data) as OrderEvent;

    const timeStamp = Date.now();
    
    console.log(
        `Order event - MessageId: ${body.MessageId}`
    );

    return orderEventRepoitory.create({
        created_at: timeStamp,
        email: event.email,
        pk: `#order_${event.orderId}`,
        sk: `${envelope.eventType}#${timeStamp}`,
        requestId: event.requestId,
        ttl: ~~(timeStamp / 1000 + 5 * 60),
        eventType: envelope.eventType,
        info: {
            messageId: body.MessageId, 
            orderId: event.orderId,
            productsCode: event.productsCode
        }
    });
}