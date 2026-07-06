import type { ChatMessageResponseDto } from "./chat-message-response.dto";

export interface ChatResponseDto {
  id: string;
  orderId: string;
  messages: ChatMessageResponseDto[];
  createdAt: string;
}
