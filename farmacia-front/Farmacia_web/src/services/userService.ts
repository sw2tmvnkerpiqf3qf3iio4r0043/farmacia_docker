import apiClient from "../api/apiUsuarios";
import type { User } from "../types/user";

export const userService = {
  getAll: async (): Promise<User[]> => {
    //*
    const response = await apiClient.get<User[]>("/users");
    return response.data;
    /*/
    return [
      {
        id: 1,
        name: "John Doe",
        email: "john.doe@example.com",
        role: "admin",
      },
      {
        id: 2,
        name: "Jane Smith",
        email: "jane.smith@example.com",
        role: "user",
      },
    ];
    //*/
  },

  getById: async (id: number): Promise<User> => {
    const response = await apiClient.get<User>(`/users/${id}`);
    return response.data;
  },
};
