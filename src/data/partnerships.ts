// Single source of truth for our partner brands. Used by the homepage
// "Our Partnerships" section (PartnershipsSection) and by the package card's
// "material included" strip (PartnerMaterials), so the two never drift apart.
export type PartnershipKey =
  | "careerBoost"
  | "alphaTest"
  | "astra"
  | "languageBoost"
  | "prepScholar"
  | "talflow"
  | "qora";

export interface Partnership {
  name: string;
  logo: string;
  translationKey: PartnershipKey;
  color: string;
}

export const partnerships: Partnership[] = [
  {
    name: "CareerBoost",
    logo: "/lovable-uploads/21bfcf0d-9e21-47fa-8c78-4f617ce0f8f9.png",
    translationKey: "careerBoost",
    color: "from-primary to-primary-light",
  },
  {
    name: "Alpha Test",
    logo: "/lovable-uploads/fc76acb0-80ad-4df5-a9c2-f8182b9512c0.png",
    translationKey: "alphaTest",
    color: "from-sky-blue to-secondary",
  },
  {
    name: "Astra Network",
    logo: "/lovable-uploads/263cca68-108a-4d1e-a97f-6baea557b69d.png",
    translationKey: "astra",
    color: "from-secondary to-accent",
  },
  {
    name: "LanguageBoost",
    logo: "/lovable-uploads/93f6b7f1-52a9-4366-8ca1-0704791a269e.png",
    translationKey: "languageBoost",
    color: "from-accent to-primary",
  },
  {
    name: "PrepScholar",
    logo: "/lovable-uploads/a632dfab-ff19-4aed-a581-9b6b885a5b48.png",
    translationKey: "prepScholar",
    color: "from-primary to-secondary",
  },
  {
    name: "Talflow.ai",
    logo: "/lovable-uploads/72e20d3a-ce5f-453c-8561-4d7e39e3d3df.png",
    translationKey: "talflow",
    color: "from-sky-blue to-primary",
  },
  {
    name: "Qora AI",
    logo: "/lovable-uploads/e49b4817-aef6-4f9b-b693-d089fe82a4fc.png",
    translationKey: "qora",
    color: "from-primary-light to-sky-blue",
  },
];
