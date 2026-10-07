import type { Money, ProductImage, SelectedOption } from "@/types/product";

export interface CartLine {
  id: string;
  quantity: number;
  sellingPlanAllocation?: {
    sellingPlan: {
      id: string;
      name: string;
      options: Array<{ name: string; value: string }>;
    };
  };
  cost: {
    totalAmount: Money;
  };
  merchandise: {
    id: string;
    title: string;
    productCode?: string;
    availableForSale: boolean;
    selectedOptions: SelectedOption[];
    image: ProductImage | null;
    product: {
      title: string;
      handle: string;
      vendor: string;
      category: string;
    };
  };
}

export interface Cart {
  totalQuantity: number;
  lines: CartLine[];
  cost: {
    subtotalAmount: Money;
    totalAmount: Money;
  };
}

export interface CartAddLine {
  merchandiseId: string;
  quantity: number;
  sellingPlanId?: string;
}
