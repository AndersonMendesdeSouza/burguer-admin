import type { ChatMessageSenderType } from "../enums/chat-message-sender-type.enum";
import type { UserResponseDto } from "./user-response.dto";

export interface ChatMessageResponseDto {
  id: string;
  chatId: string;
  senderId?: string | null;
  senderType: ChatMessageSenderType;
  sender?: UserResponseDto | null;
  text: string;
  createdAt: string;
}
