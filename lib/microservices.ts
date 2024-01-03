import { Stack, StackProps } from "aws-cdk-lib";
import { ITable } from "aws-cdk-lib/aws-dynamodb";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction, NodejsFunctionProps } from "aws-cdk-lib/aws-lambda-nodejs";
import { ITopic } from "aws-cdk-lib/aws-sns";
import { Construct } from 'constructs';
import { join } from "path";

export interface ShopppingCartInterfaceProps {
    productsTable: ITable;
    cartsTable: ITable;
    checkoutTable: ITable;
}

export class ShoppingCartMicroservices extends Construct {

    public readonly productsMicroservice: NodejsFunction;
    public readonly cartsMicroservice: NodejsFunction;
    public readonly checkoutMicroservice: NodejsFunction;

    constructor(scope: Construct, id: string, props: ShopppingCartInterfaceProps) {
        super(scope, id);
    
        // create product Lambda function
        this.productsMicroservice = this.createProductFunction(props.productsTable);
        // create cart Lambda function
        this.cartsMicroservice = this.createCartsFunction(props.cartsTable);
        // create checkout Lambda function
        this.checkoutMicroservice = this.createCheckoutFunction(props.checkoutTable);
    }

    private getNodeJSLambdaProps(): NodejsFunctionProps {
        return {
            runtime: Runtime.NODEJS_18_X, 
            bundling: {
                externalModules: [
                    'aws-sdk'
                ]
            }
        };
    }

    private createProductFunction(productsTable: ITable): NodejsFunction {
        // create nodeJs function props to enable productLambdafuntion
        const nodeJSFunctionProps = this.getNodeJSLambdaProps();

        const productsFunction = new NodejsFunction(this, 'ProductLambdaFunction', {
            ...nodeJSFunctionProps,
            entry: join(__dirname, '..', 'src', 'product', 'index.ts'),
            handler: 'handler',
            functionName: 'ProductService',
            environment: {
                DYNAMODB_PRODUCT_TABLE: productsTable.tableName,
                PRIMARY_KEY: 'id'
            }
        });

        // add permissions to lambda to read/write in dynamodb table
        productsTable.grantReadWriteData(productsFunction);

        return productsFunction;
    }

    private createCartsFunction(cartsTable: ITable): NodejsFunction {
        // create nodeJs function props to enable productLambdafuntion
        const nodeJSFunctionProps = this.getNodeJSLambdaProps();

        const cartsFunction = new NodejsFunction(this, 'CartsLambdaFunction', {
            ...nodeJSFunctionProps,
            entry: join(__dirname, '..', 'src', 'cart', 'index.ts'),
            handler: 'handler',
            functionName: 'CartService',
            environment: {
                DYNAMODB_CART_TABLE: cartsTable.tableName,
                PRIMARY_KEY: 'userName',
                EVENT_SOURCE: 'com.shoppingCart.cart.cartCheckout',
                EVENT_DETAIL_TYPE: 'CartCheckout',
                EVENT_BUS_NAME: 'ShoppingCartEventBus'
            }
        });

        cartsTable.grantReadWriteData(cartsFunction);

        return cartsFunction;
    }

    private createCheckoutFunction(checkoutTable: ITable): NodejsFunction {

        const nodeJSFunctionProps = this.getNodeJSLambdaProps();

        const checkoutFunction = new NodejsFunction(this, 'CheckoutLambdaFunction', {
            ...nodeJSFunctionProps,
            entry: join(__dirname, '..', 'src', 'checkout', 'index.ts'),
            handler: 'handler',
            functionName: 'CheckoutService',
            environment: {
                DYNAMODB_CHECKOUT_TABLE: checkoutTable.tableName,
                PRIMARY_KEY: 'userName',
                SORT_KEY: 'orderDate',
                EVENT_SOURCE_CHECKOUT_ACK: 'com.shoppingCart.cart.checkoutAck',
                EVENT_DETAIL_TYPE_CHECKOUT_ACK: 'CheckoutAck',
                EVENT_BUS_NAME: 'ShoppingCartEventBus',
                ACK_TOPIC_ARN: 'arn:aws:sns:ap-south-1:812122552477:AckTopic'
            }
        })

        checkoutTable.grantReadWriteData(checkoutFunction);

        return checkoutFunction;

    }
}