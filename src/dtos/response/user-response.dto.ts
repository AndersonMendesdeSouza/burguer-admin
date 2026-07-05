import type { UserRole } from "../enums/user-role.enum";

export type UserResponseDto = {
  id: string;
  role: UserRole;
  name: string;
  phone?: string | null;
  email: string;
  dateRegistration: string | Date;
};
