import apiClient from "./apiClient";
import type { AuthResponse, UserSession } from "../types/farmacia";

export const login = async (email: string, password: string): Promise<AuthResponse> => {
  const response = await apiClient.post<AuthResponse>("/auth/login", { email, password });
  return response.data;
};

export const getProfile = async (): Promise<UserSession> => {
  const response = await apiClient.get<UserSession>("/auth/me");
  return response.data;
};

export const updateProfile = async (data: { name?: string; email?: string }): Promise<UserSession> => {
  const response = await apiClient.put<UserSession>("/auth/me", data);
  return response.data;
};

export const changePassword = async (currentPassword: string, newPassword: string): Promise<void> => {
  await apiClient.put("/auth/me/password", { currentPassword, newPassword });
};
