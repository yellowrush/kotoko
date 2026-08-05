import { z } from 'zod';

export const zodChildProfile = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1).max(80),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  interests: z.array(z.string()),
  accessibilityNeeds: z.array(z.string()),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
  schemaVersion: z.number().int().positive(),
});