import { z } from 'zod';

const isoDateTime = z.string().datetime({ offset: true });

export const zodChildProfile = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1).max(80),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  interests: z.array(z.string()),
  accessibilityNeeds: z.array(z.string()),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
  schemaVersion: z.number().int().positive(),
});

export const zodUserPreference = z
  .object({
    id: z.string().min(1),
    locale: z.enum(['ja', 'zh-CN', 'zh-TW']),
    municipalityCode: z.string().min(1).optional(),
    radiusKm: z.number().positive().optional(),
    indoorOutdoorPreference: z.enum(['indoor', 'outdoor', 'mixed']).optional(),
    updatedAt: isoDateTime,
  })
  .strict();

export const zodFavoritePlace = z
  .object({
    id: z.string().min(1),
    childId: z.string().min(1).optional(),
    placeId: z.string().min(1),
    createdAt: isoDateTime,
  })
  .strict();

export const zodKnowledgeProgress = z
  .object({
    id: z.string().min(1),
    childId: z.string().min(1).optional(),
    knowledgeId: z.string().min(1),
    status: z.enum(['unread', 'read', 'archived']),
    readAt: isoDateTime.optional(),
    updatedAt: isoDateTime,
  })
  .strict();

export const zodPolicyTaskState = z
  .object({
    policyId: z.string().min(1),
    childId: z.string().min(1).optional(),
    status: z.enum(['new', 'viewed', 'planned', 'completed', 'dismissed']),
    reminderAt: isoDateTime.optional(),
    updatedAt: isoDateTime,
  })
  .strict();

export const zodLocalMetadata = z
  .object({
    id: z.string().min(1),
    schemaVersion: z.number().int().positive(),
    updatedAt: isoDateTime,
  })
  .strict();

export const zodPlaceComment = z
  .object({
    id: z.string().min(1),
    placeId: z.string().min(1),
    rating: z.number().int().min(1).max(5),
    content: z.string().min(1).max(1000),
    createdAt: isoDateTime,
  })
  .strict();

export const zodPendingPlaceReport = z
  .object({
    id: z.string().min(1),
    placeId: z.string().min(1),
    type: z.enum([
      'business_hours',
      'price',
      'reservation',
      'address',
      'media',
      'outdated',
      'closed',
      'other',
    ]),
    detail: z.string().min(1).max(2000).optional(),
    contactEmail: z.string().email().optional(),
    createdAt: isoDateTime,
  })
  .strict();

export const zodLocalBackup = z
  .object({
    app: z.literal('kodoko'),
    version: z.number().int().positive(),
    exportedAt: isoDateTime,
    children: z.array(zodChildProfile),
    preferences: z.array(zodUserPreference),
    favorites: z.array(zodFavoritePlace),
    knowledgeProgress: z.array(zodKnowledgeProgress),
    policyTasks: z.array(zodPolicyTaskState),
    placeComments: z.array(zodPlaceComment).optional(),
  })
  .strict();