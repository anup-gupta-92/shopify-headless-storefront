import "server-only";

import type { Cart, CartLine } from "@/types/cart";
import type { Money, ProductImage, SelectedOption } from "@/types/product";
import { storefrontRequest } from "./client";

interface ShopifyCartLine {
  id: string;
  quantity: number;
  cost: { totalAmount: Money };
  merchandise: {
    id: string;
    title: string;
    sku: string | null;
    availableForSale: boolean;
    selectedOptions: SelectedOption[];
    image: ProductImage | null;
    product: { title: string; handle: string };
  };
}

interface ShopifyCart {
  id: string;
  totalQuantity: number;
  lines: { nodes: ShopifyCartLine[] };
  cost: { subtotalAmount: Money; totalAmount: Money };
}

interface CartUserError {
  field: string[] | null;
  message: string;
}

interface CartMutationPayload {
  cart: ShopifyCart | null;
  userErrors: CartUserError[];
}

interface CartLineInput {
  merchandiseId: string;
  quantity: number;
}

const CART_FIELDS = `
  id
  totalQuantity
  cost {
    subtotalAmount { amount currencyCode }
    totalAmount { amount currencyCode }
  }
  lines(first: 100) {
    nodes {
      id
      quantity
      cost { totalAmount { amount currencyCode } }
      merchandise {
        ... on ProductVariant {
          id
          title
          sku
          availableForSale
          selectedOptions { name value }
          image { url altText width height }
          product { title handle }
        }
      }
    }
  }
`;

interface ShopifyCheckoutCart {
  checkoutUrl: string;
  totalQuantity: number;
  lines: { nodes: Array<{ id: string }> };
}

interface CheckoutBuyerIdentityPayload {
  cart: ShopifyCheckoutCart | null;
  userErrors: CartUserError[];
}

const CART_CHECKOUT_QUERY = `
  query CartCheckout($id: ID!) {
    cart(id: $id) {
      checkoutUrl
      totalQuantity
      lines(first: 1) { nodes { id } }
    }
  }
`;

const CART_CHECKOUT_BUYER_IDENTITY_MUTATION = `
  mutation CartCheckoutBuyerIdentity($cartId: ID!, $buyerIdentity: CartBuyerIdentityInput!) {
    cartBuyerIdentityUpdate(cartId: $cartId, buyerIdentity: $buyerIdentity) {
      cart {
        checkoutUrl
        totalQuantity
        lines(first: 1) { nodes { id } }
      }
      userErrors { field message }
    }
  }
`;

const CART_QUERY = `
  query Cart($id: ID!) {
    cart(id: $id) { ${CART_FIELDS} }
  }
`;

const CART_CREATE_MUTATION = `
  mutation CartCreate($input: CartInput!) {
    cartCreate(input: $input) {
      cart { ${CART_FIELDS} }
      userErrors { field message }
    }
  }
`;

const CART_LINES_ADD_MUTATION = `
  mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
    cartLinesAdd(cartId: $cartId, lines: $lines) {
      cart { ${CART_FIELDS} }
      userErrors { field message }
    }
  }
`;

const CART_LINES_UPDATE_MUTATION = `
  mutation CartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
    cartLinesUpdate(cartId: $cartId, lines: $lines) {
      cart { ${CART_FIELDS} }
      userErrors { field message }
    }
  }
`;

const CART_LINES_REMOVE_MUTATION = `
  mutation CartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
    cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
      cart { ${CART_FIELDS} }
      userErrors { field message }
    }
  }
`;

export class CartOperationError extends Error {
  constructor(public readonly publicMessage = "We could not update your cart. Please try again.") {
    super("Shopify cart operation failed");
    this.name = "CartOperationError";
  }
}

function mapLine(line: ShopifyCartLine): CartLine {
  return {
    id: line.id,
    quantity: line.quantity,
    cost: line.cost,
    merchandise: {
      id: line.merchandise.id,
      title: line.merchandise.title,
      productCode: line.merchandise.sku || undefined,
      availableForSale: line.merchandise.availableForSale,
      selectedOptions: line.merchandise.selectedOptions,
      image: line.merchandise.image,
      product: line.merchandise.product,
    },
  };
}

export function toPublicCart(cart: ShopifyCart): Cart {
  return {
    totalQuantity: cart.totalQuantity,
    lines: cart.lines.nodes.map(mapLine),
    cost: cart.cost,
  };
}

function requireCart(payload: CartMutationPayload): ShopifyCart {
  if (payload.userErrors.length || !payload.cart) throw new CartOperationError();
  return payload.cart;
}

const requestOptions = (buyerIp?: string) => ({ cache: "no-store" as const, buyerIp });

export async function getCart(cartId: string, buyerIp?: string): Promise<ShopifyCart | null> {
  const data = await storefrontRequest<{ cart: ShopifyCart | null }>(
    CART_QUERY,
    { id: cartId },
    requestOptions(buyerIp),
  );
  return data.cart;
}

export async function getCartForCheckout(cartId: string, buyerIp?: string): Promise<ShopifyCheckoutCart | null> {
  const data = await storefrontRequest<{ cart: ShopifyCheckoutCart | null }>(
    CART_CHECKOUT_QUERY,
    { id: cartId },
    requestOptions(buyerIp),
  );
  return data.cart;
}

export async function getAuthenticatedCartForCheckout(
  cartId: string,
  customerAccessToken: string,
  buyerIp?: string,
): Promise<ShopifyCheckoutCart | null> {
  const data = await storefrontRequest<{ cartBuyerIdentityUpdate: CheckoutBuyerIdentityPayload }>(
    CART_CHECKOUT_BUYER_IDENTITY_MUTATION,
    { cartId, buyerIdentity: { customerAccessToken } },
    requestOptions(buyerIp),
  );
  if (data.cartBuyerIdentityUpdate.userErrors.length) throw new CartOperationError();
  return data.cartBuyerIdentityUpdate.cart;
}

export async function cartCreate(lines: CartLineInput[], buyerIp?: string): Promise<ShopifyCart> {
  const data = await storefrontRequest<{ cartCreate: CartMutationPayload }>(
    CART_CREATE_MUTATION,
    { input: { lines } },
    requestOptions(buyerIp),
  );
  return requireCart(data.cartCreate);
}

export async function cartLinesAdd(cartId: string, lines: CartLineInput[], buyerIp?: string): Promise<ShopifyCart> {
  const data = await storefrontRequest<{ cartLinesAdd: CartMutationPayload }>(
    CART_LINES_ADD_MUTATION,
    { cartId, lines },
    requestOptions(buyerIp),
  );
  return requireCart(data.cartLinesAdd);
}

export async function cartLinesUpdate(
  cartId: string,
  lines: Array<{ id: string; quantity: number }>,
  buyerIp?: string,
): Promise<ShopifyCart> {
  const data = await storefrontRequest<{ cartLinesUpdate: CartMutationPayload }>(
    CART_LINES_UPDATE_MUTATION,
    { cartId, lines },
    requestOptions(buyerIp),
  );
  return requireCart(data.cartLinesUpdate);
}

export async function cartLinesRemove(cartId: string, lineIds: string[], buyerIp?: string): Promise<ShopifyCart> {
  const data = await storefrontRequest<{ cartLinesRemove: CartMutationPayload }>(
    CART_LINES_REMOVE_MUTATION,
    { cartId, lineIds },
    requestOptions(buyerIp),
  );
  return requireCart(data.cartLinesRemove);
}
