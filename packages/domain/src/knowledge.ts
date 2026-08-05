import type { ContentStatus } from './place';

export type KnowledgeCategory =
  | 'development'
  | 'health'
  | 'nutrition'
  | 'safety'
  | 'education'
  | 'parenting'
  | 'travel'
  | 'policy';

export type SourceReference = {
  title: string;
  url?: string;
  publishedAt?: string;
};

export type KnowledgeContent = {
  id: string;
  title: string;
  summary: string;
  body: string;
  minAgeMonths: number;
  maxAgeMonths: number;
  categories: KnowledgeCategory[];
  locale: string;
  sourceReferences: SourceReference[];
  reviewedAt?: string;
  validFrom?: string;
  validUntil?: string;
  status: ContentStatus;
};