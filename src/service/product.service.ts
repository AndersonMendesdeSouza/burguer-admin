import type { ProductStatusEnum } from "../dtos/enums/product-status.enum";
import type { ProductRequest } from "../dtos/request/product-request.dto";
import type { ProductResponse } from "../dtos/response/product-response.dto";
import api from "./api";

const API_URL = "/products";

function appendFormValue(fd: FormData, key: string, value: unknown) {
  if (value === undefined || value === null) return;

  if (Array.isArray(value) || typeof value === "object") {
    fd.append(key, JSON.stringify(value));
    return;
  }

  fd.append(key, String(value));
}

export const ProductService = {
  findAll: async (): Promise<ProductResponse[]> => {
    const response = await api.get<ProductResponse[]>(API_URL);
    return response.data;
  },

  findOne: async (id: string): Promise<ProductResponse> => {
    const response = await api.get<ProductResponse>(`${API_URL}/${id}`);
    return response.data;
  },

  create: async (
    product: ProductRequest,
    files?: File[],
  ): Promise<ProductResponse> => {
    const formData = new FormData();

    Object.entries(product).forEach(([key, value]) => {
      appendFormValue(formData, key, value);
    });

    if (files?.length) {
      files.forEach((file) => formData.append("images", file));
    }

    const response = await api.post<ProductResponse>(API_URL, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return response.data;
  },

  update: async (
    id: string,
    product: Partial<ProductRequest>,
    files?: File[],
  ): Promise<ProductResponse> => {
    if (files?.length) {
      const formData = new FormData();

      Object.entries(product).forEach(([key, value]) => {
        appendFormValue(formData, key, value);
      });

      files.forEach((file) => formData.append("images", file));

      const response = await api.patch<ProductResponse>(
        `${API_URL}/${id}`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );

      return response.data;
    }

    const response = await api.patch<ProductResponse>(
      `${API_URL}/${id}`,
      product,
    );
    return response.data;
  },

  actived: async (
    id: string,
    status: ProductStatusEnum,
  ): Promise<ProductResponse> => {
    const response = await api.patch<ProductResponse>(
      `${API_URL}/${id}/status`,
      { status },
    );
    return response.data;
  },

  remove: async (id: string): Promise<void> => {
    await api.delete(`${API_URL}/${id}`);
  },

  removeImg: async (imagePublicId: string): Promise<void> => {
    await api.delete("/cloudinary", {
      params: { publicId: imagePublicId },
    });
  },
};
