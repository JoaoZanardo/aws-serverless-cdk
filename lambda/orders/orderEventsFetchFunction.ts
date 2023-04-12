import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import { DynamoDB } from "aws-sdk";
import { OrderEventDdb, OrderEventRepository } from "./layers/orderEventRepositoryLayer/orderEventRepository";
import * as AWSXRay from 'aws-xray-sdk';

AWSXRay.captureAWS(require('aws-sdk'));

const eventsDdb = process.env.EVENTS_DDB!;
const client  = new DynamoDB.DocumentClient();

const orderEventsRepository = new OrderEventRepository(
    client,
    eventsDdb
)

export async function handler(
    event: APIGatewayProxyEvent,
    context: Context
): Promise<APIGatewayProxyResult>  {
    const method = event.httpMethod;

    if (method === 'GET') {
        const queryString = event.queryStringParameters;

       if (queryString) {
            if (queryString.email && queryString.eventType) {
                const orderEvents = await orderEventsRepository.getOrderEventByEmailAndEventType(
                    queryString.email,
                    queryString.eventType
                );

                return {
                    statusCode: 200,
                    body: JSON.stringify(convertOrderEvents(orderEvents))
                }
            } 

            if (queryString.email) {
                const orderEvent = await orderEventsRepository.getOrderEventsByEmail(
                    queryString.email,
                );

                return {
                    statusCode: 200,
                    body: JSON.stringify(convertOrderEvents(orderEvent))
                }
            } 
       }
    }

    return {
        statusCode: 400,
        body: JSON.stringify({
            message: 'BAD REQUEST'
        })
    }
}

function convertOrderEvents (orderEvents: OrderEventDdb[]) {
    return orderEvents.map(event => {
        return {
            email: event.email,
            created_at: event.created_at,
            eventTpe: event.eventType,
            requestId: event.requestId,
            orderId: event.info.orderId,
            productCodes: event.info.productsCode
        }
    });
}