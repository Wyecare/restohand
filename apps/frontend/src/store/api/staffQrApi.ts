import { baseApi } from './baseApi';

export interface GenerateStaffQrPayload {
  role: string;
  displayName?: string;
  validityHours?: number;
}

export interface StaffQrResponse {
  qrData: string;
  qrCodeUrl: string;
  signupUrl: string;
  role: string;
  displayName?: string;
  expiresAt: string;
  validityHours: number;
}

export const staffQrApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    generateStaffQr: builder.mutation<StaffQrResponse, GenerateStaffQrPayload>({
      query: (body) => ({
        url: '/users/generate-qr',
        method: 'POST',
        body,
      }),
    }),
  }),
});

export const {
  useGenerateStaffQrMutation,
} = staffQrApi;