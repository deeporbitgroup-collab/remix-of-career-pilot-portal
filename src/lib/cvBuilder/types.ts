// Fixed CV template — the layout/sections never change; only the text content
// does. The AI (cv-ai edge function) fills these fields, it never invents the
// structure. Mirrors the reference one-page CV format (docs/cv-builder-template.md).

export interface CvEntry {
  // Institution / Company / Organization name.
  org: string;
  location: string;
  // Degree+major (education) or job title (experience/leadership).
  role: string;
  dateRange: string;
  bullets: string[];
}

export interface CvAdditionalInfoItem {
  // e.g. "Languages", "Finance & Modelling", "Certifications".
  label: string;
  text: string;
}

export interface CvData {
  header: {
    fullName: string;
    location: string;
    phone: string;
    email: string;
    linkedin: string;
  };
  summary: string;
  education: CvEntry[];
  experience: CvEntry[];
  // Optional section — omit (empty array) when the candidate has nothing to put here.
  leadership: CvEntry[];
  // Optional section — short one-line bullets (e.g. volunteering entries).
  community: string[];
  // Optional section — grouped bullets like "Languages: ...", "Certifications: ...".
  additionalInfo: CvAdditionalInfoItem[];
}

export const EMPTY_CV_DATA: CvData = {
  header: { fullName: "", location: "", phone: "", email: "", linkedin: "" },
  summary: "",
  education: [],
  experience: [],
  leadership: [],
  community: [],
  additionalInfo: [],
};

export type CvBuilderMode = "improve" | "scratch";
