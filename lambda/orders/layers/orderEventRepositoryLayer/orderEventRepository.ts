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

    async getOrderEventsByEmail(email: string): Promise<OrderEventDdb[]> {
        const data = await this.ddbClient.query({
            TableName: this.eventsDdb,
            IndexName: 'emailIndex',
            KeyConditionExpression: 'email = :email AND begins_with(sk, :prefix)',
            ExpressionAttributeValues: {
                ':email': email,
                ':prefix': 'ORDER_'
            }
        }).promise();

        return data.Items as OrderEventDdb[];
    }

    async getOrderEventByEmailAndEventType(email: string, eventType: string): Promise<OrderEventDdb[]> {
        const data = await this.ddbClient.query({
            TableName: this.eventsDdb,
            IndexName: 'emailIndex',
            KeyConditionExpression: 'email = :email AND begins_with(sk, :prefix)',
            ExpressionAttributeValues: {
                ':email': email,
                ':prefix': eventType
            }
        }).promise();

        return data.Items as OrderEventDdb[];
    }
}