import { z } from 'zod';
import {
  sanitizeEmail,
  sanitizeIpAddress,
  sanitizeMultilineText,
  sanitizePhone,
  sanitizeText,
  sanitizeUrl,
} from './sanitize';

const PHONE_REGEX = /^(?:\+?\d[\d\s\-()]{7,}\d)$/;

export const contactLeadSchema = z.object({
  name: z
    .string()
    .transform((value) => sanitizeText(value, 120))
    .refine((value) => value.length >= 2, 'Name is required.'),
  company: z
    .string()
    .optional()
    .transform((value) => sanitizeText(value, 160)),
  email: z
    .string()
    .transform((value) => sanitizeEmail(value))
    .refine((value) => z.email().safeParse(value).success, 'A valid email address is required.'),
  phone: z
    .string()
    .transform((value) => sanitizePhone(value))
    .refine((value) => PHONE_REGEX.test(value), 'A valid phone number is required.'),
  subject: z
    .string()
    .optional()
    .transform((value) => sanitizeText(value, 200)),
  productInterest: z
    .string()
    .optional()
    .transform((value) => sanitizeText(value, 200)),
  quantity: z
    .string()
    .optional()
    .transform((value) => sanitizeText(value, 120)),
  message: z
    .string()
    .transform((value) => sanitizeMultilineText(value, 5000))
    .refine((value) => value.length >= 5, 'Message is required.'),
  pageUrl: z
    .string()
    .optional()
    .transform((value) => sanitizeUrl(value)),
  productUrl: z
    .string()
    .optional()
    .transform((value) => sanitizeUrl(value)),
  ipAddress: z
    .string()
    .optional()
    .transform((value) => sanitizeIpAddress(value)),
});

export type ContactLead = z.infer<typeof contactLeadSchema>;

export function formatValidationErrors(result: z.ZodError): string {
  return result.issues.map((issue) => issue.message).join(' ');
}
