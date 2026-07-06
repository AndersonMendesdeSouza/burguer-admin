import type { ChatMessageRequestDto } from "../dtos/request/chat-message-request.dto";
import type { ChatRequestDto } from "../dtos/request/chat-request.dto";
import type { ChatMessageResponseDto } from "../dtos/response/chat-message-response.dto";
import type { ChatResponseDto } from "../dtos/response/chat-response.dto";
import api from "./api";

export const ChatService = {
  create: async (payload: ChatRequestDto): Promise<ChatResponseDto> => {
    const response = await api.post<ChatResponseDto>("/chats", payload);
    return response.data;
  },

  findByOrderId: async (orderId: string): Promise<ChatResponseDto> => {
    const response = await api.get<ChatResponseDto>(`/chats/order/${orderId}`);
    return response.data;
  },

  createMessage: async (
    payload: ChatMessageRequestDto,
  ): Promise<ChatMessageResponseDto> => {
    const response = await api.post<ChatMessageResponseDto>(
      "/chats/messages",
      payload,
    );
    return response.data;
  },
};
