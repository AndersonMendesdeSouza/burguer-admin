import type { ProductStatusEnum } from "../enums/product-status.enum";

export interface ProductAddonRequest {
  id: string;
  name: string;
  description?: string;
  price: number;
  isActive?: boolean;
}

export interface ProductRequest {
  name: string;
  description?: string;
  category: string;
  price: number;
  promoPrice?: number;
  isActive?: ProductStatusEnum;
  stockEnabled?: boolean;
  stock?: number;
  addons?: ProductAddonRequest[];
  existingImageIds?: string[];
  primaryImageId?: string;
}
