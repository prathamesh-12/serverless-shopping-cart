import { Cart, DoCheckoutPayload } from "./Cart";

class Validator extends Error {
    constructor(field: any) {
        super(`${field} is missing`);
    }
}

export function validateField(field: any) {
    if((field as Cart).userName === undefined) {
        throw new Validator(`User Name`);
    }

    if((field as Cart).items === undefined || (field as Cart).items.length < 1) {
        throw new Validator(`Cart Items`);
    }

}

export function validateDoCheckoutPayloadFields(field: any) {
    if((field as DoCheckoutPayload).userName === undefined) {
        throw new Validator(`User Name`);
    }
}