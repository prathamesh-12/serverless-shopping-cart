import { CfnOutput, Stack, StackProps } from "aws-cdk-lib";
import { LambdaRestApi } from "aws-cdk-lib/aws-apigateway";
import { IFunction } from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";

export interface APIGatewayProps {
    productService: IFunction,
    cartsService: IFunction,
    checkoutService: IFunction
}

export class ShoppingCartAPI extends Construct {

    public readonly productsAPI: LambdaRestApi;
    public readonly cartsAPI: LambdaRestApi;
    public readonly checkoutAPI: LambdaRestApi;

    constructor(scope: Construct, id: string, props: APIGatewayProps) {
        super(scope, id);

        //create lambgaAPIGateway
        this.productsAPI = this.createProductsAPI(props.productService);
  
        // create cartsAPI
        this.cartsAPI = this.createCartsAPI(props.cartsService);

        // create checkout API
        this.checkoutAPI = this.createCheckoutAPI(props.checkoutService);
    }

    private createProductsAPI(productService: IFunction): LambdaRestApi {
        const productLambdaRestAPI = new LambdaRestApi(this, 'ProductLambdaRestAPI', {
            restApiName: 'Product Service',
            handler: productService,
            proxy: false
        });

        //create root API and methods
        const apiResource = productLambdaRestAPI.root.addResource('product');
        apiResource.addMethod('GET');
        apiResource.addMethod('POST');

        const apiResourceWithParams = apiResource.addResource('{id}');
        apiResourceWithParams.addMethod('GET'); // GET /product/{id}
        apiResourceWithParams.addMethod('PUT'); // PUT /product/{id}
        apiResourceWithParams.addMethod('DELETE'); // DELETE /product/{id}

        new CfnOutput(this, 'ProductAPI', {
            value: productLambdaRestAPI.url
        });

        return productLambdaRestAPI;
    };

    private createCartsAPI(cartService: IFunction): LambdaRestApi {
        const cartsLambdaRestApi = new LambdaRestApi(this, 'CartsLambdaRestAPI', {
            restApiName: 'Carts Service',
            handler: cartService,
            proxy: false
        });

        // create root resource
        const cartRootResource = cartsLambdaRestApi.root.addResource('cart');
        cartRootResource.addMethod('GET'); // GET - /cart
        cartRootResource.addMethod('POST'); // POST - /cart

        const cartResourceWithParams = cartRootResource.addResource('{userName}');
        cartResourceWithParams.addMethod('GET'); // GET - /cart/{userName}
        cartResourceWithParams.addMethod('DELETE'); // DELETE - /cart/{userName}
        
        // POST cart checkout - /cart/checkout
        const cartCheckoutResource = cartRootResource.addResource('checkout');
        cartCheckoutResource.addMethod('POST');


        new CfnOutput(this, 'CartsAPI', {
            value: cartsLambdaRestApi.url
        });


        return cartsLambdaRestApi;
    };

    private createCheckoutAPI(checkoutService: IFunction): LambdaRestApi {
        const checkoutLambdaApi = new LambdaRestApi(this, 'CheckoutLambdaRestApi', {
            restApiName: 'Checkout Service',
            handler: checkoutService,
            proxy: false
        });

        // create root resource - GET /checkout
        const checkoutRootResource = checkoutLambdaApi.root.addResource('checkout');
        checkoutRootResource.addMethod('GET');
        // create resource with params - /checkout/{userName}?orderDate='12323123'
        const checkoutResourceWithParamns = checkoutRootResource.addResource('{userName}');
        checkoutResourceWithParamns.addMethod('GET');

        new CfnOutput(this, 'CheckoutAPI', {
            value: checkoutLambdaApi.url
        })

        return checkoutLambdaApi;
    }
}