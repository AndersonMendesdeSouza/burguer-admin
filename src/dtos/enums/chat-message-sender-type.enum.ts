export const ChatMessageSenderType = {
  ADMIN: "ADMIN",
  CUSTOMER: "CUSTOMER",
  SYSTEM: "SYSTEM",
} as const;

export type ChatMessageSenderType =
  (typeof ChatMessageSenderType)[keyof typeof ChatMessageSenderType];
