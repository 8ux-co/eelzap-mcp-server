import { z } from 'zod';

export const KeySchema = z
  .string()
  .min(1)
  .max(63)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/);
export const ItemSlugSchema = z
  .string()
  .min(1)
  .max(200)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const FieldKeySchema = z
  .string()
  .min(1)
  .max(63)
  .regex(/^[a-z0-9]+(_[a-z0-9]+)*$/);

export const UuidSchema = z.uuid();
export const LocaleSchema = z.string().min(2).max(16);
export const PaginationSchema = {
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
};

export const SearchSchema = z.string().min(1).optional();

export const FieldTypeSchema = z.enum([
  'TEXT',
  'LONG_TEXT',
  'RICH_TEXT',
  'NUMBER',
  'INTEGER',
  'BOOLEAN',
  'DATE',
  'DATETIME',
  'CURRENCY',
  'ENUM',
  'IMAGE',
  'VIDEO',
  'FILE',
  'GALLERY',
  'URL',
  'EMAIL',
]);

export const FieldConstraintsSchema = z
  .object({
    min: z.number().optional(),
    max: z.number().optional(),
    minLength: z.number().optional(),
    maxLength: z.number().optional(),
    regex: z.string().optional(),
    currencies: z
      .array(z.string().regex(/^[A-Z]{3}$/))
      .min(1)
      .optional(),
  })
  .strict()
  .optional();

export const EnumOptionsSchema = z
  .array(
    z.object({
      label: z.string().min(1),
      value: z.string().min(1),
      color: z.string().optional(),
    }),
  )
  .optional();

export const CollectionFieldCreateSchema = z.object({
  collectionId: UuidSchema,
  key: FieldKeySchema,
  label: z.string().min(1).max(100),
  type: FieldTypeSchema,
  required: z.boolean().optional(),
  isLocalized: z.boolean().optional(),
  isFilterable: z.boolean().optional(),
  isSortable: z.boolean().optional(),
  isUnique: z.boolean().optional(),
  sectionId: UuidSchema.optional(),
  constraints: FieldConstraintsSchema,
  defaultValue: z.string().optional(),
  options: EnumOptionsSchema,
  galleryMinItems: z.number().optional(),
  galleryMaxItems: z.number().optional(),
  galleryAllowedTypes: z.string().optional(),
});

export const CollectionFieldUpdateSchema = z.object({
  collectionId: UuidSchema,
  fieldId: UuidSchema,
  label: z.string().min(1).max(100).optional(),
  required: z.boolean().optional(),
  isLocalized: z.boolean().optional(),
  isFilterable: z.boolean().optional(),
  isSortable: z.boolean().optional(),
  isUnique: z.boolean().optional(),
  sectionId: UuidSchema.nullish(),
  constraints: FieldConstraintsSchema,
  defaultValue: z.string().optional(),
  options: EnumOptionsSchema,
  galleryMinItems: z.number().optional(),
  galleryMaxItems: z.number().optional(),
  galleryAllowedTypes: z.string().optional(),
});

export const SectionCreateSchema = z.object({
  key: FieldKeySchema,
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

export const SectionUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
});

type JsonObject = { [key: string]: JsonValue };
type JsonValue = string | number | boolean | null | JsonObject | JsonValue[];

const JsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(JsonValueSchema),
    z.record(z.string(), JsonValueSchema),
  ]),
);

const JsonObjectSchema: z.ZodType<JsonObject> = z.record(
  z.string(),
  JsonValueSchema,
);

export const SeoSchema = z.object({
  metaTitle: z.string().max(200).optional(),
  metaDescription: z.string().max(500).optional(),
  ogType: z.string().optional(),
  ogImageId: z.string().uuid().optional(),
  ogImageAlt: z.string().max(255).optional(),
  canonicalUrl: z.string().url().max(2048).optional(),
  twitterCard: z.enum(['SUMMARY', 'SUMMARY_LARGE_IMAGE']).optional(),
  noIndex: z.boolean().optional(),
  noFollow: z.boolean().optional(),
  keywords: z.string().optional(),
  structuredData: JsonObjectSchema.optional(),
  locale: LocaleSchema.optional(),
});
