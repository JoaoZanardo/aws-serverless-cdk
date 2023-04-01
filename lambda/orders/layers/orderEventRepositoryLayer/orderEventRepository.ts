import { DynamoDB } from "aws-sdk";

export interface OrderEventDdb {
    ttl: number;
    pk: string;
    sk: string;
    email: string;
    created_at: number;
    requestId: string;
    eventType: string;
    info: {
        orderId: string;
        productsCode: string[];
        messageId: string;
    }
}

export class OrderEventRepository {
    constructor(
        private ddbClient: DynamoDB.DocumentClient, 
        private eventsDdb: string
    ) { }

    create(orderEvent: OrderEventDdb) {
        return this.ddbClient.put({
            TableName: this.eventsDdb,
            Item: orderEvent
        }).promise();
    }
}