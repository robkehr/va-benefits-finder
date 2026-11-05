import { z } from "zod";

export const countyInfoSchema = z.object({
  name: z.string().min(1),
  fips: z.string().regex(/^\d{5}$/),
  income_limit: z.string().nullable(),
  exemption: z.string().min(1),
  notes: z.string().nullable(),
  source_url: z.string().url().nullable(),
  source_name: z.string().nullable(),
  last_verified: z.coerce.date().nullable()
});

export const countyProgramSchema = z.object({
  name: z.string().min(1),
  statute: z.string().min(1),
  summary: z.string().min(1),
  base_eligibility: z.array(z.string().min(1)).min(1),
  how_to_apply: z.array(z.string().min(1)).min(1),
  source_url: z.string().url(),
  source_name: z.string().min(1)
});

export const stateCountyDataSchema = z.object({
  state: z.string().length(2),
  // Optional: states without a verified county-level program omit this and show a research-gap note.
  program: countyProgramSchema.optional(),
  counties: z.array(countyInfoSchema).min(1)
});

export type CountyInfo = z.infer<typeof countyInfoSchema>;
export type StateCountyData = z.infer<typeof stateCountyDataSchema>;
