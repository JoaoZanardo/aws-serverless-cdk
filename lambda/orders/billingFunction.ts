import { Context, SNSEvent } from "aws-lambda";

export function handler(event: SNSEvent, context: Context):void {
    event.Records.map(record => {
        console.log({message: record.Sns.Message});
    });
}