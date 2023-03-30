import { DynamoDB } from "aws-sdk";
import { v4 as uuid } from 'uuid';

export interface OrderProduct {
    price: number;
    code: string;
}

export interface Order {
    pk: string;
    sk?: string;
    created_at?: number,
    shipping: {
        type: 'URGENT' | 'ECONOMIC',
        carrier: 'CORREIOS' | 'FEDEX',
    },
    billing: {
        payment: 'CASH' | 'CREDIT_CARD' | 'DEBIT_CARD',
        totalPrice: number
    },
    products: OrderProduct[]
}

export class OrderRepository {
    constructor(
        private ddbClient: DynamoDB.DocumentClient, 
        private ordersDdb: string
    ) { }

    async create(order: Order): Promise<Order> {
        order.created_at = Date.now();
        order.sk = uuid();

        await this.ddbClient.put({
            TableName: this.ordersDdb,
            Item: order 
        }).promise();

        return order;
    }

    async getAllOrders(): Promise<Order[]> {
        const data = await this.ddbClient.scan({
            TableName: this.ordersDdb,
        }).promise();

        return data.Items as Order[];
    }

    async getOrdersByEmail(email: string): Promise<Order[]> {
        const data = await this.ddbClient.query({
            TableName: this.ordersDdb,
            KeyConditionExpression: 'pk = :email',
            ExpressionAttributeValues: {
                ':email': email
            }
        }).promise();

        return data.Items as Order[];
    }

    async getOrder(email: string, orderId: string): Promise<Order> {
        const data = await this.ddbClient.get({
            TableName: this.ordersDdb,
            Key: {
                pk: email,
                sk: orderId
            }
        }).promise();

        if (!data.Item) throw new Error('Order not found');

        return data.Item as Order;
    }

    async delete(email: string, orderId: string): Promise<Order> {
        const data = await this.ddbClient.delete({
            TableName: this.ordersDdb,
            Key: {
                pk: email,
                sk: orderId
            },
            ReturnValues: 'ALL_OLD'
        }).promise();
        
        if (!data.Attributes) throw new Error('Order not found');

        return data.Attributes as Order;
    }
}