import { z } from 'zod';
import type {
  Place,
  PlaceCategory,
  IndoorOutdoor,
  PlaceTag,
  ContentStatus,
  KnowledgeCategory,
  KnowledgeContent,
} from '@kodoko/domain';

const placeCategory = z.enum([
  'park',
  'playground',
  'museum',
  'zoo',
  'aquarium',
  'library',
  'facility',
  'indoor-play',
  'shop',
  'restaurant',
  'event',
  'other',
]) as z.ZodType<PlaceCategory>;

const indoorOutdoor = z.enum(['indoor', 'outdoor', 'mixed']) as z.ZodType<IndoorOutdoor>;

const placeTag = z.enum(['dining', 'group-play', 'stroller-friendly', 'quiet-zone']) as z.ZodType<PlaceTag>;

const contentStatus = z.enum(['draft', 'published', 'archived']) as z.ZodType<ContentStatus>;

/**
 * API DTO Schema（与领域类型分离，见 AGENTS.md 18.1）。
 * 用于校验服务端返回的地点数据，防止脏数据进入客户端。
 */
export const placeSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: placeCategory,
  latitude: z.number().finite(),
  longitude: z.number().finite(),
  address: z.string(),
  municipalityCode: z.string().min(1),
  suitableAgeMinMonths: z.number().int().nonnegative().optional(),
  suitableAgeMaxMonths: z.number().int().nonnegative().optional(),
  indoorOutdoor,
  priceLevel: z.number().int().nonnegative().optional(),
  strollerFriendly: z.boolean().optional(),
  nursingRoom: z.boolean().optional(),
  diaperChanging: z.boolean().optional(),
  tags: z.array(placeTag).optional(),
  imageUrl: z.string().optional(),
  shortDescription: z.string().optional(),
  sourceUrl: z.string().optional(),
  sourceCheckedAt: z.string().optional(),
  status: contentStatus,
});

export const placeListSchema = z.object({
  places: z.array(placeSchema),
  total: z.number().int().nonnegative(),
});

export type PlaceDTO = z.infer<typeof placeSchema>;
export type PlaceListDTO = z.infer<typeof placeListSchema>;
export type { Place };

const knowledgeCategory = z.enum([
  'development',
  'health',
  'nutrition',
  'safety',
  'education',
  'parenting',
  'travel',
  'policy',
]) as z.ZodType<KnowledgeCategory>;

/**
 * API DTO Schema for knowledge content（与领域类型分离，见 AGENTS.md 18.1）。
 */
export const knowledgeSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
  body: z.string().min(1),
  minAgeMonths: z.number().int().nonnegative(),
  maxAgeMonths: z.number().int().nonnegative(),
  categories: z.array(knowledgeCategory),
  locale: z.string().min(1),
  sourceReferences: z.array(
    z.object({
      title: z.string().min(1),
      url: z.string().optional(),
      publishedAt: z.string().optional(),
    }),
  ),
  reviewedAt: z.string().optional(),
  validFrom: z.string().optional(),
  validUntil: z.string().optional(),
  status: contentStatus,
});

export const knowledgeListSchema = z.object({
  knowledge: z.array(knowledgeSchema),
  total: z.number().int().nonnegative(),
});

export type KnowledgeDTO = z.infer<typeof knowledgeSchema>;
export type KnowledgeListDTO = z.infer<typeof knowledgeListSchema>;
export type { KnowledgeContent };
