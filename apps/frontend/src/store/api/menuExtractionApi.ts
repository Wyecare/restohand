import { baseApi } from './baseApi';

export interface ExtractedMenuItem {
  name: string;
  description?: string;
  price: number;
}

export interface ExtractedCategory {
  name: string;
  items: ExtractedMenuItem[];
}

export interface ExtractedMenu {
  categories: ExtractedCategory[];
  currency?: string;
  confidence?: string;
  notes?: string[];
  extractedAt: string;
}

export interface BulkImportResult {
  success: boolean;
  categoriesCreated: number;
  categoriesUpdated: number;
  itemsCreated: number;
  itemsUpdated: number;
  errors: Array<{
    type: 'category' | 'item';
    name: string;
    error: string;
  }>;
}

export interface BulkImportRequest {
  categories: ExtractedCategory[];
  currency?: string;
}

export const menuExtractionApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    extractMenuFromFile: builder.mutation<ExtractedMenu, FormData>({
      query: (formData) => ({
        url: '/menu-extraction/extract-from-file',
        method: 'POST',
        body: formData,
      }),
    }),

    extractMenuFromBase64: builder.mutation<
      ExtractedMenu,
      { base64Data: string; mediaType?: string }
    >({
      query: (body) => ({
        url: '/menu-extraction/extract-from-base64',
        method: 'POST',
        body,
      }),
    }),

    bulkImportMenu: builder.mutation<BulkImportResult, BulkImportRequest>({
      query: (body) => ({
        url: '/menu-extraction/bulk-import',
        method: 'POST',
        body,
      }),
      invalidatesTags: [
        { type: 'MenuCategory', id: 'LIST' },
        { type: 'MenuItem', id: 'LIST' },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useExtractMenuFromFileMutation,
  useExtractMenuFromBase64Mutation,
  useBulkImportMenuMutation,
} = menuExtractionApi;