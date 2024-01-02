import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { GetItemCommand, PutItemCommand, QueryCommand, ScanCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { ddbClient } from './ddbClient';
import { CheckoutAckPayload } from './Checkout';
import { ebClient } from './ebClient';
import { PutEventsCommand } from '@aws-sdk/client-eventbridge';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';

export async function handler(event: any) {

    console.log(`INSIDE CHECKOUT SERVICE - ${JSON.stringify(event)}`);

    const eventType = event['detail-type'];
    if(eventType !== undefined) {
        // async invokation
       return await asyncEventInvocation(event);
    } else {
        // sync invokation using API Gateways
        return await syncApiGatwayInvocation(event);
    }
}

async function asyncEventInvocation(event: any) {
    console.log(`Inside ASYNC Event bridge - ${event}`);

    return await doCheckout(event.detail);

}

async function syncApiGatwayInvocation(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    console.log(`Inside syncApiGatwayInvocation - ${event}`);
    let resp: any;
    switch(event.httpMethod) {
        case 'GET': 
            if(event.pathParameters !== null) {
                resp = await getCheckoutDetailsByUserName(event);
            } else {
                resp = await getCheckoutDetails(event);
            }
            break;

        default: break;
    }
    return {
        statusCode: 200,
        body: JSON.stringify({
            resonse: resp,
            message: `Checkout process SUCCESS - ${event.httpMethod}`
        }),
        
    }
}

async function doCheckout(checkoutEvent: any) {
    try {
        const orderDate = new Date().toISOString();
        checkoutEvent.orderDate = orderDate;
        const userName = checkoutEvent.userName;
    
        console.log(checkoutEvent);
    
        const orderResult = await ddbClient.send(new PutItemCommand({
            TableName: process.env.DYNAMODB_CHECKOUT_TABLE,
            Item: marshall(checkoutEvent || {})
        }));
        console.log(orderResult);
        //await publishCheckoutAckEvent(userName);
        await publishCheckAckSnsMessage(userName);
        return orderResult;
    } catch (error) {
        console.error(error);
        throw error;
    }
}

async function getCheckoutDetailsByUserName(event: APIGatewayProxyEvent) {
    try {
        const { userName } = event.pathParameters!;
        const { orderDate } = event.queryStringParameters!;

        const { Items } = await ddbClient.send(new QueryCommand({
            TableName: process.env.DYNAMODB_CHECKOUT_TABLE,
            KeyConditionExpression: `userName = :userName and orderDate = :orderDate`,
            ExpressionAttributeValues: {
                ':userName': { S: userName! },
                'orderDate': { S: orderDate! }
            }
        }));
        console.log(`getCheckoutDetailsByUserName is SUCESS - ${Items}`);
        return Items?.map(item => unmarshall(item));
    } catch (error) {
        console.error(error);
        throw error;
    }
}

async function getCheckoutDetails(event: APIGatewayProxyEvent) {
    try {
        const { Items } = await ddbClient.send(new ScanCommand({
            TableName: process.env.DYNAMODB_CHECKOUT_TABLE
        }));
        console.log(`getCheckoutDetails is SUCESS - ${Items}`);
        return Items?.map(item => unmarshall(item));

    } catch (error) {
        console.error(error);
        throw error;
    }
}

async function publishCheckoutAckEvent(userName: string) {
    const eventPaylaod: CheckoutAckPayload = {
        userName,
        eventAck: true,
        eventProcessed: true
    };

    console.log(`Inside publishCheckoutAckEvent - ${JSON.stringify(eventPaylaod)}`);
    
    try {
        const input = { // PutEventsRequest
            Entries: [ // PutEventsRequestEntryList // required
              { // PutEventsRequestEntry
                Time: new Date(),
                Source: process.env.EVENT_SOURCE_CHECKOUT_ACK,
                Resources: [ ],
                DetailType: process.env.EVENT_DETAIL_TYPE_CHECKOUT_ACK,
                Detail: JSON.stringify(eventPaylaod),
                EventBusName: process.env.EVENT_BUS_NAME
              },
            ]
        };
        const data = await ebClient.send(new PutEventsCommand(input));
        console.log(`SUCCESS - ACK Event sent - ${data}`);
        return data;
    } catch (error) {
        console.error(error);
        throw error;
    }
}

async function publishCheckAckSnsMessage(userName: string) {
    const snsClient = new SNSClient({ region: 'ap-south-1' });
    const eventPaylaod: CheckoutAckPayload = {
        userName,
        eventAck: true,
        eventProcessed: true
    };

    try {
        const result = await snsClient.send(new PublishCommand({
            Message: JSON.stringify(eventPaylaod),
            TopicArn: process.env.ACK_TOPIC_ARN
        }))
        console.log(`SNS published - ${JSON.stringify(result)}`);
    } catch (error) {
        
    }
}