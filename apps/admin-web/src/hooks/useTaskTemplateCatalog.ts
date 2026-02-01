import { useCallback, useMemo } from 'react';
import { useGetTaskTemplateCatalogQuery } from '@/store/api/taskRecordingApi';
import type {
  TaskTemplateCatalogEntry,
  TaskRecordingTemplateMetadata,
  TaskRecordingTemplateResponse,
} from '@/types/residents';

interface TemplateCategory {
  id: string;
  label: string;
  value: string;
}

interface TemplateLookupResult {
  catalog: TaskTemplateCatalogEntry[];
  templatesById: Record<string, TaskTemplateCatalogEntry>;
  templatesByCategory: Record<string, TaskTemplateCatalogEntry[]>;
  categories: TemplateCategory[];
  getTemplatePresentation: (
    templateId?: string | null,
    fallback?: TaskRecordingTemplateResponse | null
  ) => {
    icon?: string;
    category?: string;
    summary?: string;
    tags: string[];
    defaultName?: string;
  };
  isLoading: boolean;
  isFetching: boolean;
  error: unknown;
  refetch: () => void;
}

const normalizeCategory = (value?: string | null) => {
  if (!value) {
    return null;
  }
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }
  return normalized.toLowerCase();
};

const buildCategoryLabel = (category?: string | null) => {
  if (!category) {
    return '';
  }
  return category
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

export const useTaskTemplateCatalog = (): TemplateLookupResult => {
  const { data, isLoading, isFetching, error, refetch } =
    useGetTaskTemplateCatalogQuery();

  const catalog = data ?? [];

  const { templatesById, templatesByCategory, categories } = useMemo(() => {
    const byId: Record<string, TaskTemplateCatalogEntry> = {};
    const byCategory: Record<string, TaskTemplateCatalogEntry[]> = {};
    const categoryMap = new Map<string, TemplateCategory>();

    catalog.forEach((entry) => {
      const template = entry.template;
      const metadata: TaskRecordingTemplateMetadata | undefined = entry.metadata;

      byId[template.id] = entry;

      const categoryCandidates = [
        metadata?.defaultCategory,
        template.category,
      ].filter(Boolean) as string[];

      const normalizedCandidates = categoryCandidates
        .map((candidate) => normalizeCategory(candidate))
        .filter(Boolean) as string[];

      const uniqueCandidates = normalizedCandidates.length
        ? normalizedCandidates
        : [normalizeCategory(template.category) || 'uncategorized'];

      uniqueCandidates.forEach((categoryKey) => {
        if (!byCategory[categoryKey]) {
          byCategory[categoryKey] = [];
        }
        byCategory[categoryKey].push(entry);

        if (!categoryMap.has(categoryKey)) {
          const sourceValue =
            metadata?.defaultCategory || template.category || categoryKey;
          categoryMap.set(categoryKey, {
            id: categoryKey,
            label: buildCategoryLabel(sourceValue) || 'Uncategorized',
            value: sourceValue,
          });
        }
      });
    });

    const sortedCategories = Array.from(categoryMap.values()).sort((a, b) =>
      a.label.localeCompare(b.label)
    );

    return {
      templatesById: byId,
      templatesByCategory: byCategory,
      categories: sortedCategories,
    };
  }, [catalog]);

  const getTemplatePresentation = useCallback(
    (
      templateId?: string | null,
      fallback?: TaskRecordingTemplateResponse | null
    ) => {
      const entry = templateId ? templatesById[templateId] : undefined;
      const template = entry?.template ?? fallback ?? undefined;
      const metadata = entry?.metadata ?? template?.metadata ?? undefined;

      return {
        icon: metadata?.icon,
        category: metadata?.defaultCategory || template?.category || undefined,
        summary: metadata?.summary,
        tags: metadata?.tags ?? [],
        defaultName: metadata?.defaultTaskName || template?.name || undefined,
      };
    },
    [templatesById]
  );

  return {
    catalog,
    templatesById,
    templatesByCategory,
    categories,
    getTemplatePresentation,
    isLoading,
    isFetching,
    error,
    refetch,
  };
};
