import { Product } from "./Product"

export class ValidateFieldError extends Error {
    constructor(field: any) {
        super(`${field} is missing`)
    }
}

export function validateField(field: any) {
    if((field as Product).name === undefined) {
        throw new ValidateFieldError('Name');
    }

    if((field as Product).price === undefined) {
        throw new ValidateFieldError('Price');
    }

    if((field as Product).id === undefined) {
        throw new ValidateFieldError('ProductID');
    }
}