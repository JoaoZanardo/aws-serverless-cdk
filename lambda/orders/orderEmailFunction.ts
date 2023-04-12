import { Context, SNSMessage, SQSEvent } from "aws-lambda";
import { AWSError, EnvironmentCredentials, SES } from "aws-sdk";
import * as XRay from 'aws-xray-sdk';
import { Envelope, OrderEvent } from "./layers/orderEventsLayer/orderEvent";
import { PromiseResult } from "aws-sdk/lib/request";

XRay.captureAWS(require('aws-sdk'));

const sesClient = new SES();

export async function handler(event: SQSEvent, context: Context): Promise<void> {
    const promises: Promise<PromiseResult<SES.SendEmailResponse, AWSError>>[] = [];

    event.Records.map(record => {
        const message = JSON.parse(record.body) as SNSMessage;
        const promise = sendOrderEmail(message);
        promises.push(promise);
    });

    await Promise.all(promises);
}

function sendOrderEmail(body: SNSMessage) {
    const envelope = JSON.parse(body.Message) as Envelope;
    const event = JSON.parse(envelope.data) as OrderEvent;

    return sesClient.sendEmail({
        Destination: {
            ToAddresses: [event.email]
        },
        Message: {
            Body: {
                Text: {
                    Charset: 'UTF-8',
                    Data: `
                        Recebemos seu pedido de numero: ${event.orderId},
                        no valor de R$ ${event.billing.totalPrice}
                    `
                }
            },
            Subject: {
                Charset: 'UTF-8',
                Data: 'Recebemos seu pedido!'
            }
        },
        Source: 'bitjgcoins@gmail.com'
    }).promise();
}