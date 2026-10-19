import type { OrderItem } from "../../types/Orders-type";
import type { OrderStatusEnum } from "../enums/orders-status.enum";
import type { PaymentMethodEnum } from "../enums/payment-method.enum";
import type { AddressResponseDto } from "./address-response.dto";
import type { ChatResponseDto } from "./chat-response.dto";

type OrderHistory = {
  mesaId?: string;
  status: OrderStatusEnum;
  label: string;
  time?: string;
  createdAt: string;
};

export interface OrderResponseDto {
  id: string;
  userId?: string;
  addressId?: string;
  chatId?: string;
  address?: AddressResponseDto;
  chat?: ChatResponseDto;
  code: number;
  status: OrderStatusEnum;
  paymentMethod: PaymentMethodEnum;
  customerName: string;
  customerPhone: string;
  subtotal: string;
  deliveryFee: string;
  discount: string;
  total: string;
  items: OrderItem[];
  history: OrderHistory[];
  createdAt: Date;
  updatedAt: Date;
}
