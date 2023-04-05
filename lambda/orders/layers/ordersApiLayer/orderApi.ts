export enum PaymentType {
    CASH = 'CASH',
    CREDIT_CARD = 'CREDIT_CARD',
    DEBIT_CARD = 'DEBIT_CARD',
}

export enum ShippingType {
    URGENT = 'URGENT',
    ECONOMIC = 'ECONOMIC'
}

export enum CarrierType {
    CORREIOS = 'CORREIOS',
    FEDEX = 'FEDEX'
}

interface OrderProduct {
    price: number;
    code: string;
}

interface OrderShipping {
    type: ShippingType,
    carrier: CarrierType
}

interface OrderBilling {
    payment: PaymentType,
    totalPrice: number
}

export interface OrderRequest {
    email: string;
    productIds: string[];
    shipping: OrderShipping;
    payment: PaymentType;
}

export interface orderResponse {
    id: string;
    email: string;
    created_at: number;
    shipping: OrderShipping;
    billing: OrderBilling;
    products?: OrderProduct[];
}