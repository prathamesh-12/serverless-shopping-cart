import * as cdk from 'aws-cdk-lib';
import { Stack, StackProps } from "aws-cdk-lib";
import { AttributeType, BillingMode, ITable, Table } from "aws-cdk-lib/aws-dynamodb";
import { Construct } from "constructs";

export class ShoppingCartDatabase extends Construct {

    public readonly productsTable: ITable;
    public readonly cartsTable: ITable;
    public readonly checkoutTable: ITable;

    constructor(scope: Construct, id: string) {
        super(scope, id);

        // create products DYNAMODB table
        this.productsTable = this.createProductsTable();

        // create CART DYNAMODB table
        this.cartsTable = this.createCartsTable();

        // create Checkout DynamoDB Table
        this.checkoutTable = this.createCheckoutTable();
    }

    private createProductsTable(): ITable {
        return new Table(this, 'productsTable', {
            partitionKey: {
                name: 'id',
                type: AttributeType.STRING
            },
            tableName: 'products-shoppingcart-app',
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            billingMode: BillingMode.PAY_PER_REQUEST
        });
    };

    private createCartsTable(): ITable {
        /* cart: PK - userName, items: [{
            quantity, color, price, prodicutId, productName
        },{
            quantity, color, price, prodicutId, productName
        }, ...] */

        return new Table(this, 'cartsTable', {
            partitionKey: {
                name: 'userName',
                type: AttributeType.STRING
            },
            tableName: 'cart-shoppingcart-app',
            billingMode: BillingMode.PAY_PER_REQUEST,
            removalPolicy: cdk.RemovalPolicy.DESTROY
        })
    }

    private createCheckoutTable(): ITable {
         /* checkout Table: 
            PK - userName, 
            SK - orderDate
                 firstName
                 lastName
                 totalPrice
        */
        return new Table(this, 'checkoutTable', {
            partitionKey: {
                name: 'userName',
                type: AttributeType.STRING
            },
            sortKey: {
                name: 'orderDate',
                type: AttributeType.STRING
            },
            tableName: 'checkout-shoppingcart-app',
            billingMode: BillingMode.PAY_PER_REQUEST,
            removalPolicy: cdk.RemovalPolicy.DESTROY
        })
    }
}