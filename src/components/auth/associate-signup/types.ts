import { z } from "zod";

// Experience type
export const experienceSchema = z.object({
  role: z.string().min(1),
  company: z.string().min(1),
  duration: z.string().min(1),
  sector: z.string().optional(),
});

export type Experience = z.infer<typeof experienceSchema>;

// Language type
export const languageSchema = z.object({
  language: z.string().min(1),
  level: z.enum(["native", "advanced", "intermediate", "basic"]),
});

export type Language = z.infer<typeof languageSchema>;

// Certification type
export const certificationSchema = z.object({
  name: z.string().min(1),
  issuingBody: z.string().min(1),
  year: z.string().min(4).max(4),
});

export type Certification = z.infer<typeof certificationSchema>;

// About form data based on status
export const aboutFormSchema = z.object({
  status: z.enum(["university_student", "master_student", "professional"]),
  
  // University Student fields
  university: z.string().optional(),
  course: z.string().optional(),
  gpa: z.string().optional(),
  
  // Master Student fields
  masterInstitution: z.string().optional(),
  masterType: z.string().optional(),
  masterGpa: z.string().optional(),
  previousUniversity: z.string().optional(),
  previousCourse: z.string().optional(),
  previousGpa: z.string().optional(),
  
  // Professional fields
  currentCompany: z.string().optional(),
  companySector: z.string().optional(),
  currentPosition: z.string().optional(),
  professionalUniversity: z.string().optional(),
  professionalDegree: z.string().optional(),
  hasMaster: z.boolean().optional(),
  professionalMasterInstitution: z.string().optional(),
  professionalMasterProgram: z.string().optional(),
  professionalMasterGpa: z.string().optional(),
  
  // Common fields
  professionalExperiences: z.array(experienceSchema).optional(),
  volunteerExperiences: z.array(experienceSchema).optional(),
  previousWorkExperiences: z.array(experienceSchema).optional(),
});

export type AboutFormData = z.infer<typeof aboutFormSchema>;

// Main signup form
export const signupSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/),
  password: z.string()
    .min(8)
    .regex(/[A-Z]/)
    .regex(/[0-9]/),
  confirmPassword: z.string(),
  
  // Profile presentation options
  useLinkedIn: z.boolean().optional(),
  useCv: z.boolean().optional(),
  useAbout: z.boolean().optional(),
  
  linkedinUrl: z.string().url().optional().or(z.literal("")),
  
  // About form data
  aboutData: aboutFormSchema.optional(),
  
  // Languages (required for all)
  languages: z.array(languageSchema).min(1),
  
  // Certifications (optional)
  certifications: z.array(certificationSchema).optional(),
  
  acceptTerms: z.coerce.boolean().refine((val) => val === true),
}).refine((data) => data.password === data.confirmPassword, {
  path: ["confirmPassword"],
}).refine((data) => data.useLinkedIn || data.useCv || data.useAbout, {
  path: ["useLinkedIn"],
}).refine((data) => !data.useLinkedIn || (data.linkedinUrl && data.linkedinUrl.trim() !== ""), {
  path: ["linkedinUrl"],
}).refine((data) => !data.useAbout || data.aboutData, {
  path: ["aboutData"],
});

export type SignupFormData = z.infer<typeof signupSchema>;
