export interface AddressResponseDto {
  id: string;
  userId: string;
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  complement?: string;
  reference?: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}
