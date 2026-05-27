import { z } from 'zod'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const NAME_REGEX = /^[a-zA-Z\s]+$/

export const ticketSchema = z.object({
  customer_name: z
    .string()
    .min(1, 'Please enter a valid full name')
    .min(2, 'Please enter a valid full name')
    .regex(NAME_REGEX, 'Please enter a valid full name'),
  customer_email: z
    .string()
    .min(1, 'Please enter a valid email address')
    .regex(EMAIL_REGEX, 'Please enter a valid email address'),
  subject: z
    .string()
    .min(1, 'Subject must be at least 10 characters')
    .min(10, 'Subject must be at least 10 characters')
    .max(100, 'Subject must be at most 100 characters'),
  description: z
    .string()
    .min(1, 'Please describe the issue (min 20 characters)')
    .min(20, 'Please describe the issue (min 20 characters)'),
  priority: z.enum(['Low', 'Medium', 'High']),
})
