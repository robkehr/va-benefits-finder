import { z } from "zod";

export const benefitCategorySchema = z.enum([
  "property_tax",
  "vehicle",
  "recreation",
  "education",
  "employment",
  "financial",
  "other"
]);

export const benefitWhoSchema = z.enum([
  "veteran",
  "spouse",
  "surviving_spouse",
  "dependent_child"
]);

export const benefitSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().min(1),
  state: z.string().length(2),
  scope: z.enum(["state", "county", "municipal"]),
  counties: z.union([z.literal("all"), z.array(z.string().min(1)).min(1)]),
  category: benefitCategorySchema,
  summary: z.string().min(1),
  value: z.string().min(1).nullable(),
  source_name: z.string().min(1).optional(),
  eligibility: z.object({
    who: z.array(benefitWhoSchema).optional(),
    min_rating: z.number().int().min(0).max(100).optional(),
    p_and_t: z.boolean().optional(),
    tdiu: z.boolean().optional(),
    requires_homeowner: z.boolean().optional(),
    income_limit: z.string().min(1).optional(),
    discharge: z.array(z.enum(["honorable", "general", "oth", "other"])).optional(),
    wartime_required: z.boolean().optional(),
    special_statuses: z.array(z.string().min(1)).optional(),
    other_requirements: z.array(z.string().min(1)).optional()
  }),
  how_to_apply: z.array(z.string().min(1)).min(1),
  application_url: z.string().url(),
  source_url: z.string().url(),
  last_verified: z.coerce.date(),
  notes: z.string().optional()
});

export const benefitsSchema = z.array(benefitSchema);

export type Benefit = z.infer<typeof benefitSchema>;
