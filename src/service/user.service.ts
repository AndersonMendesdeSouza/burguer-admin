import type { LoginRequestDto } from "../dtos/request/login-request.dto";
import type { UpdateUserRequestDto } from "../dtos/request/update-user-request.dto";
import type { UserRole } from "../dtos/enums/user-role.enum";
import type { LoginResponseDto } from "../dtos/response/login-response.dto";
import type { UserResponseDto } from "../dtos/response/user-response.dto";
import api from "./api";

type AuthenticatedUserResponse = {
  id: string;
  email: string;
  role: UserRole;
  tenantId?: string;
};

export const UserService = {
  login: async (dto: LoginRequestDto): Promise<LoginResponseDto> => {
    const response = await api.post<LoginResponseDto>(
      "/users/login",
      dto
    );
    return response.data;
  },

  me: async (): Promise<AuthenticatedUserResponse> => {
    const response = await api.get<AuthenticatedUserResponse>("/users/me");

    return response.data;
  },

  findAll: async (): Promise<UserResponseDto[]> => {
    const response = await api.get<UserResponseDto[]>("/users/find-all");

    return response.data;
  },

  findCustomers: async (): Promise<UserResponseDto[]> => {
    const response = await api.get<UserResponseDto[]>("/users/customers");

    return response.data;
  },

  findOne: async (id: string): Promise<UserResponseDto> => {
    const response = await api.get<UserResponseDto>(`/users/${id}`);

    return response.data;
  },

  update: async (
    id: string,
    dto: UpdateUserRequestDto,
  ): Promise<UserResponseDto> => {
    const response = await api.put<UserResponseDto>(`/users/${id}`, dto);

    return response.data;
  },
};
