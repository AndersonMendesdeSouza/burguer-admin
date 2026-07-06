import type { UserRole } from "../enums/user-role.enum";
import type { UserResponseDto } from "./user-response.dto";

export interface LoginResponseDto {
  token: string;
  expiresIn: number;
  role: UserRole;
  user: UserResponseDto;
}
