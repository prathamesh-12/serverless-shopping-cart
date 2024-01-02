export interface Cart {
    userName: string,
    items: [
        { [key: string]: Product }
    ]
}

export interface Product {
    id: string,
    name: string,
    price: number,
    quantity: number;
    image?: string
}

export interface DoCheckoutPayload {
    userName: string,
    firstName?: string,
    lastName?: string,
    email?: string
}