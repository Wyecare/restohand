import { baseApi } from "./baseApi";

export interface StaffLoginPayload {
  email: string;
  password: string;
}

interface StaffLoginResponse {
  access_token: string;
  refresh_token: string;
  user: {
    uid: string;
    email: string;
    displayName: string;
    roles: string[];
    restaurantId: string;
    branchId?: string;
    isPrimaryOwner: boolean;
    claims: {
      sub: string;
      email: string;
      name: string;
      roles: string[];
      restaurantId: string;
    };
  };
  expires_in: number;
}

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    staffLogin: builder.mutation<StaffLoginResponse, StaffLoginPayload>({
      query: (body) => ({
        url: "/auth/login",
        method: "POST",
        body,
      }),
    }),
  }),
});

export const { useStaffLoginMutation } = authApi;
