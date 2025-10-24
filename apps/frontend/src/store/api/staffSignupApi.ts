import { baseApi } from './baseApi';

export interface ValidateStaffQrPayload {
  qrData: string;
}

export interface ValidateStaffQrResponse {
  valid: boolean;
  message?: string;
  data?: {
    role: string;
    displayName: string;
    restaurant: { id: string; name: string };
    expiresAt: string;
  };
}

export interface AcceptStaffQrPayload {
  qrData: string;
  phoneNumber: string;
  displayName?: string;
}

export interface AcceptStaffQrResponse {
  success: boolean;
  user: {
    id: string;
    name: string;
    role: string;
    restaurantId: string;
    restaurantName: string;
  };
}

export const staffSignupApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    validateStaffQr: builder.query<ValidateStaffQrResponse, string>({
      query: (qrData) => ({
        url: `/staff-signup/validate-qr?qr=${encodeURIComponent(qrData)}`,
      }),
    }),

    acceptStaffQr: builder.mutation<AcceptStaffQrResponse, AcceptStaffQrPayload>({
      query: (body) => ({
        url: '/staff-signup/accept-qr',
        method: 'POST',
        body,
      }),
    }),
  }),
});

export const {
  useValidateStaffQrQuery,
  useAcceptStaffQrMutation,
} = staffSignupApi;