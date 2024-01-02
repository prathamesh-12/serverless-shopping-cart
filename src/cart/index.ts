import { DeleteItemCommand, GetItemCommand, PutItemCommand, ScanCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

import { validateDoCheckoutPayloadFields, validateField } from './Validator';
import { ddbClient } from './ddbClient';
import { Product } from './Cart';
import { ebClient } from './ebClient';
import { PutEventsCommand } from '@aws-sdk/client-eventbridge';


export async function handler(event: any){
    console.log(event, undefined, 2);
    const eventType = event['detail-type'];
    if('Records' in event) {
        const eventAck = event.Records[0].Sns.Message;
        console.log(eventAck);
        return invokeAsyncEventAcknowledgement(eventAck);
    } else if(eventType !== undefined) {
        return invokeAsyncEventAcknowledgement(event.detail);
    } else {

        try {
            let resp: any;
            switch(event.httpMethod) {
                case 'GET': 
                        if(event.pathParameters?.userName) {
                            const { userName } = event.pathParameters;
                            resp = await getCartByUsername(userName);
                        } else {
                            resp = await getCartDetails();
                        }
                        break;
                        
                case 'POST': 
                        if(event.path.includes('/checkout')) {
                            resp = await doCartCheckout(event);
                        } else {
                            resp = await addItemsToCart();
                        }
                        break;
                        
                case 'DELETE': 
                        if(event.pathParameters?.userName) {
                            const { userName } = event.pathParameters;
                            resp = await deleteCartByUsername(userName);
                        } else {
                            return {
                                statusCode: 500,
                                body: JSON.stringify({
                                    message: `Username must be provided to Delete the cart items`
                                })
                            }
                        }
                        break;
        
                default: break;
            }
        
            return {
                statusCode: 200,
                body: JSON.stringify({
                    body: resp,
                    message: `SUCCESS - ${event.httpMethod}`
                })
            }
        } catch (error: any) {
            return {
                statusCode: 500,
                body: JSON.stringify({
                    message: `Something went wrong`,
                    errorMsg: error?.message,
                    errorStack: error?.stack
                })
            }
        }
    }


    async function getCartDetails() {
        // GET - /cart
        try {
            const { Items } = await ddbClient.send(new ScanCommand({
                TableName: process.env.DYNAMODB_CART_TABLE
            }));
    
            if(Items && Items.length) {
                return Items.map(item => unmarshall(item));
            }
            return [];
        } catch (error) {
            console.error(error);
            throw error;
        }
    }

    async function addItemsToCart() {
        // POST - add items to cart
        try {
            const payload = JSON.parse(event.body || '{}');
            validateField(payload);

            const resp = await ddbClient.send(new PutItemCommand({
                TableName: process.env.DYNAMODB_CART_TABLE,
                Item: marshall(payload)
            }));
            
            return {
                response: resp,
                message: `Cart created for user ${payload.userName}`
            }
        } catch (error) {
            console.error(error);
            throw error;
        }
    }
    
    async function getCartByUsername(userName: string) {
        // GET single cart based on userName

        try {
            const { Item } = await ddbClient.send(new GetItemCommand({
                TableName: process.env.DYNAMODB_CART_TABLE,
                Key: marshall({ userName })
            }));
            if(Item) {
                return unmarshall(Item);
            }
            return {};
        } catch (error) {
            console.error(error);
            throw error;
        }
        
    }
    
    async function deleteCartByUsername(userName: string) {
        console.log(`inside DELETE CART - ${userName}`)
        // DELETE single cart based on userName
        try {
            const resp = await ddbClient.send(new DeleteItemCommand({
                TableName: process.env.DYNAMODB_CART_TABLE,
                Key: marshall({ userName })
            }));
            console.log(`Cart for user - ${userName} has been deleted!`);
            return {
                response: resp,
                message: `Cart Deleted for user ${userName}`
            }
        } catch (error) {
            console.error(error);
            throw error;
        }

    }

    async function doCartCheckout(event: APIGatewayProxyEvent) {
        // invoke async communication to eventBridge and send data to further checkout
        // need to publish - checkout event to Event Bus to proceed with async comms
        
        // possible payload = { userName: 'prats', firstName: 'John', lastName: 'Snow', email: 'john@test.com' }
        const payload = JSON.parse(event.body || '{}');

        //check for userName
        validateDoCheckoutPayloadFields(payload);

        if(payload.userName) {
            // 1- Get existing cart items based on username
            let items = (await getCartByUsername(payload.userName)).items;
            if(!items || items.length < 1) {
                throw new Error(`Not items in cart!`);
            }
            
            // const totalPrice = items.reduce((total: number, curVal: any) => {
            //     return total + Number(curVal.price);
            // }, 0);

            let totalPrice = 0;
            items.forEach((item: Product) => totalPrice += (item.price * item.quantity));

            // checkoutPaylaod - { userName: 'prats', totalPrice: 200, items: [{ name: iphone, price: 50 }] }
            
            
            // 2- create even.json obj that includes total price (calc) and other props
            const checkoutPayload = { ...payload, totalPrice, items };
            
            // 3- publish event.json obj to eventBridge
            const result = await publishCartCheckoutEvent(checkoutPayload);
    
            // 4- remove items from cart on successful received in checkout service

            return result;
        }
        return `User Name is not provided!`;
        
    }

    async function publishCartCheckoutEvent(checkoutPayload: any) {
        try {
            const input = { // PutEventsRequest
                Entries: [ // PutEventsRequestEntryList // required
                  { // PutEventsRequestEntry
                    Time: new Date(),
                    Source: process.env.EVENT_SOURCE,
                    Resources: [ ],
                    DetailType: process.env.EVENT_DETAIL_TYPE,
                    Detail: JSON.stringify(checkoutPayload),
                    EventBusName: process.env.EVENT_BUS_NAME
                  },
                ]
            };
            const data = await ebClient.send(new PutEventsCommand(input));
            console.log(`SUCCESS - Event sent - ${data}`);
            return data;
              
        } catch (error) {
            console.error(error);
            throw error;
        }
    }

    async function invokeAsyncEventAcknowledgement(event: any) {
        console.log(`inside invokeAsyncEventAcknowledgement CART - ${event.eventAck} - ${event.userName}`)
        if(event.eventAck) {
            const result = await deleteCartByUsername(event.userName);
            console.log(result);
            return result;
        } else {
            return `Acknowledgement not received!!`;
        }
    }
}

