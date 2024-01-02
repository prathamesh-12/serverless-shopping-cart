import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ddbClient } from './ddbClient';
import { DeleteItemCommand, GetItemCommand, PutItemCommand, QueryCommand, ScanCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { v4 } from 'uuid';
import { validateField } from './validator';

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    console.log('Req - ', JSON.stringify(event, undefined, 2));

    try {
        
        let resp: any;
        // switch case - to triiger particular DynamoDB API fro CRUD
        // based on event.httpMethod
        switch (event.httpMethod) {
            case 'GET':
                if(event.queryStringParameters) {
                    resp = await getProductsByCatergory(event);
                }
                else if(event.pathParameters?.id) {
                    const { id } = event.pathParameters;
                    resp = await getProductById(id);
                } else {
                    resp = await getAllProducts();
                }
                break;
            
            case 'POST':
                resp = await createProduct(event);
                break;

            case 'DELETE':
                if(event.pathParameters?.id) {
                    const { id } = event.pathParameters;
                    resp = await deleteProduct(id);
                } else {
                    throw new Error(`Id is required to delete the product`);
                }
                break;
            
            case 'PUT':
                if(event.pathParameters?.id) {
                    const { id } = event.pathParameters;
                    resp = await updateProduct(id, event);
                } else {
                    throw new Error(`Id is required to Update the product`);
                }
        
            default:
                break;
        }

        const response: APIGatewayProxyResult = {
            statusCode: 200,
            body: JSON.stringify({
                body: resp,
                message: `SUCCESS - opertaion - ${event.httpMethod}`
            })
        };
        return response;
    } catch (error: any) {
        console.error(error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: `Operations Failed`,
                errorMsg: error?.message,
                errorStack: error?.stack
            })
        }
    }
    

    async function getProductById(id: string) {
        console.log('Inside getProductById - ', id);

        try {
            const { Item } = await ddbClient.send(new GetItemCommand({
                TableName: process.env.DYNAMODB_PRODUCT_TABLE,
                Key: marshall({ id })
            }));

            return Item ? unmarshall(Item) : {};

        } catch (error) {
            console.error(error);
            throw error;
        }
    }

    async function getAllProducts() {
        console.log('Inside getAllProducts');

        try {
            const { Items } = await ddbClient.send(new ScanCommand({
                TableName: process.env.DYNAMODB_PRODUCT_TABLE
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

    async function createProduct(event: APIGatewayProxyEvent) {
        const product = JSON.parse(event.body || '{}');

        product['id'] = v4();
        console.log(product);

        validateField(product);

        try {
            const resp = await ddbClient.send(new PutItemCommand({
                TableName: process.env.DYNAMODB_PRODUCT_TABLE,
                Item: marshall(product)
            }));
            console.log(`New Product created with ID - ${product.id} with resp - ${resp}`);
            return { id: product.id }
        } catch (error) {
            console.error(error);
            throw error;
        }
        
    }

    async function deleteProduct(id: string) {
        try {
            const resp = await ddbClient.send(new DeleteItemCommand({
                TableName: process.env.DYNAMODB_PRODUCT_TABLE,
                Key: marshall({ id })
            }))
            console.log(`Item with id - ${id} is Deleted`);
            return resp;
        } catch (error) {
            console.error(error);
            throw error;
        }
    }

    async function updateProduct(id: string, event: APIGatewayProxyEvent) {
        try {
            const requestBody = JSON.parse(event.body || '{}');
            const objKeys = Object.keys(requestBody);
            console.log(`updateProduct function. requestBody : "${requestBody}", objKeys: "${objKeys}"`);    
        
            const params = {
              TableName: process.env.DYNAMODB_PRODUCT_TABLE,
              Key: marshall({ id: event.pathParameters?.id }),
              UpdateExpression: `SET ${objKeys.map((_, index) => `#key${index} = :value${index}`).join(", ")}`,
              ExpressionAttributeNames: objKeys.reduce((acc, key, index) => ({
                  ...acc,
                  [`#key${index}`]: key,
              }), {}),
              ExpressionAttributeValues: marshall(objKeys.reduce((acc, key, index) => ({
                  ...acc,
                  [`:value${index}`]: requestBody[key],
              }), {})),
            };
        
            const updateResult = await ddbClient.send(new UpdateItemCommand(params));
        
            console.log(updateResult);
            return updateResult;
          } catch(e) {
            console.error(e);
            throw e;
          }
    }

    async function getProductsByCatergory(event: APIGatewayProxyEvent) {
        // input URL /product/1234?category=iphone
        try {
            if(event.pathParameters?.id && event.queryStringParameters?.category) {
                const { id } = event.pathParameters;
                const { category } = event.queryStringParameters;
                console.log(`ID is ${id} and Category is ${category}`);

                const params = {
                    TableName: process.env.DYNAMODB_PRODUCT_TABLE,
                    KeyConditionExpression: "id = :id",
                    FilterExpression: "contains (category, :category)",
                    ExpressionAttributeValues: {
                        ":id": { S: id },
                        ":category": { S: category }
                    }
                };

                const { Items } = await ddbClient.send(new QueryCommand(params));
                console.log(Items);
                return Items?.map(item => unmarshall(item));
            } else {
                throw new Error(`ID and/or Category is missing`);
            }
        } catch (error) {
            console.error(error);
            throw error;
        }
        
    }

    

}