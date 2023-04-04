import { Context, SQSEvent } from "aws-lambda";
import * as XRay from 'aws-xray-sdk';

XRay.captureAWS(require('aws-sdk'));

export function handler(event: SQSEvent, context: Context): void {
    event.Records.map(record => {
        console.log(record);
        console.log(JSON.parse(record.body));
    });
}