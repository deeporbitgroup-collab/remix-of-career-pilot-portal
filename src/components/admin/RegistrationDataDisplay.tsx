import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Linkedin, FileText, User, GraduationCap, Briefcase, Globe, Award, Building, BookOpen } from "lucide-react";
import { Json } from "@/integrations/supabase/types";

interface AboutData {
  status?: "university_student" | "master_student" | "professional";
  // University student
  university?: string;
  course?: string;
  gpa?: string;
  // Master student
  masterInstitution?: string;
  masterType?: string;
  masterGpa?: string;
  previousUniversity?: string;
  previousCourse?: string;
  previousGpa?: string;
  // Professional
  currentCompany?: string;
  companySector?: string;
  currentPosition?: string;
  professionalUniversity?: string;
  professionalDegree?: string;
  hasMaster?: boolean;
  professionalMasterInstitution?: string;
  professionalMasterProgram?: string;
  professionalMasterGpa?: string;
  // Common
  professionalExperiences?: Array<{ role: string; company: string; duration: string; sector?: string }>;
  volunteerExperiences?: Array<{ role: string; company: string; duration: string }>;
  previousWorkExperiences?: Array<{ role: string; company: string; duration: string; sector?: string }>;
}

interface Language {
  language: string;
  level: "native" | "advanced" | "intermediate" | "basic";
}

interface Certification {
  name: string;
  issuingBody: string;
  year: string;
}

interface ProfilePresentation {
  useLinkedIn?: boolean;
  useCv?: boolean;
  useAbout?: boolean;
}

interface RegistrationDataDisplayProps {
  aboutData: Json | null;
  languages: Json | null;
  certifications: Json | null;
  profilePresentation: Json | null;
  linkedinUrl: string | null;
}

const levelLabels: Record<string, string> = {
  native: "Madrelingua",
  advanced: "Avanzato",
  intermediate: "Intermedio",
  basic: "Base"
};

const statusLabels: Record<string, string> = {
  university_student: "Studente Universitario",
  master_student: "Studente Master",
  professional: "Professionista"
};

export default function RegistrationDataDisplay({
  aboutData,
  languages,
  certifications,
  profilePresentation,
  linkedinUrl
}: RegistrationDataDisplayProps) {
  const about = aboutData as unknown as AboutData | null;
  const langs = (Array.isArray(languages) ? languages : []) as unknown as Language[];
  const certs = (Array.isArray(certifications) ? certifications : []) as unknown as Certification[];
  const presentation = profilePresentation as unknown as ProfilePresentation | null;

  const hasRegistrationData = presentation || about || langs.length > 0 || certs.length > 0;

  if (!hasRegistrationData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Dati di Registrazione
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Nessun dato di registrazione dettagliato disponibile per questo associate.
            I dati saranno visibili per i nuovi utenti registrati con il modulo aggiornato.
          </p>
        </CardContent>
      </Card>
    );
  }

  const renderExperiences = (
    experiences: Array<{ role: string; company: string; duration: string; sector?: string }> | undefined,
    title: string,
    icon: React.ReactNode
  ) => {
    if (!experiences || experiences.length === 0) return null;
    return (
      <div className="space-y-2">
        <h5 className="text-sm font-semibold flex items-center gap-2">
          {icon}
          {title}
        </h5>
        <div className="space-y-2">
          {experiences.map((exp, idx) => (
            <div key={idx} className="bg-muted/50 rounded-lg p-3 text-sm">
              <div className="font-medium">{exp.role}</div>
              <div className="text-muted-foreground">{exp.company}</div>
              <div className="text-xs text-muted-foreground">{exp.duration}</div>
              {exp.sector && (
                <Badge variant="outline" className="mt-1 text-xs">{exp.sector}</Badge>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Profile Presentation Methods */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="h-5 w-5" />
            Metodi di Presentazione Scelti
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {presentation?.useLinkedIn && (
              <Badge variant="default" className="flex items-center gap-2 py-2 px-3">
                <Linkedin className="h-4 w-4" />
                LinkedIn
              </Badge>
            )}
            {presentation?.useCv && (
              <Badge variant="default" className="flex items-center gap-2 py-2 px-3">
                <FileText className="h-4 w-4" />
                CV
              </Badge>
            )}
            {presentation?.useAbout && (
              <Badge variant="default" className="flex items-center gap-2 py-2 px-3">
                <User className="h-4 w-4" />
                About
              </Badge>
            )}
            {!presentation && (
              <span className="text-muted-foreground text-sm">Non specificato</span>
            )}
          </div>
          {linkedinUrl && (
            <div className="mt-3">
              <span className="text-sm text-muted-foreground">LinkedIn URL: </span>
              <a href={linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm">
                {linkedinUrl}
              </a>
            </div>
          )}
        </CardContent>
      </Card>

      {/* About Data Section */}
      {about && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <GraduationCap className="h-5 w-5" />
              Informazioni About
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Status Badge */}
            <div>
              <span className="text-sm text-muted-foreground">Status: </span>
              <Badge variant="secondary" className="text-sm">
                {about.status ? statusLabels[about.status] || about.status : "Non specificato"}
              </Badge>
            </div>

            {/* University Student Section */}
            {about.status === "university_student" && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-muted/30 rounded-lg p-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Università</p>
                  <p className="font-medium">{about.university || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Corso di Laurea</p>
                  <p className="font-medium">{about.course || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Media</p>
                  <p className="font-medium">{about.gpa || "-"}</p>
                </div>
              </div>
            )}

            {/* Master Student Section */}
            {about.status === "master_student" && (
              <>
                <div className="space-y-2">
                  <h5 className="text-sm font-semibold flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    Master
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-muted/30 rounded-lg p-4">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase">Istituzione</p>
                      <p className="font-medium">{about.masterInstitution || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase">Tipo Master</p>
                      <p className="font-medium">{about.masterType || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase">Media</p>
                      <p className="font-medium">{about.masterGpa || "-"}</p>
                    </div>
                  </div>
                </div>
                {(about.previousUniversity || about.previousCourse) && (
                  <div className="space-y-2">
                    <h5 className="text-sm font-semibold flex items-center gap-2">
                      <GraduationCap className="h-4 w-4" />
                      Laurea Precedente
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-muted/30 rounded-lg p-4">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase">Università</p>
                        <p className="font-medium">{about.previousUniversity || "-"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase">Corso</p>
                        <p className="font-medium">{about.previousCourse || "-"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase">Media</p>
                        <p className="font-medium">{about.previousGpa || "-"}</p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Professional Section */}
            {about.status === "professional" && (
              <>
                <div className="space-y-2">
                  <h5 className="text-sm font-semibold flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    Posizione Attuale
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-muted/30 rounded-lg p-4">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase">Azienda</p>
                      <p className="font-medium">{about.currentCompany || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase">Posizione</p>
                      <p className="font-medium">{about.currentPosition || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase">Settore</p>
                      <p className="font-medium">{about.companySector || "-"}</p>
                    </div>
                  </div>
                </div>

                {(about.professionalUniversity || about.professionalDegree) && (
                  <div className="space-y-2">
                    <h5 className="text-sm font-semibold flex items-center gap-2">
                      <GraduationCap className="h-4 w-4" />
                      Formazione
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/30 rounded-lg p-4">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase">Università</p>
                        <p className="font-medium">{about.professionalUniversity || "-"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase">Titolo</p>
                        <p className="font-medium">{about.professionalDegree || "-"}</p>
                      </div>
                    </div>
                  </div>
                )}

                {about.hasMaster && (
                  <div className="space-y-2">
                    <h5 className="text-sm font-semibold flex items-center gap-2">
                      <BookOpen className="h-4 w-4" />
                      Master
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-muted/30 rounded-lg p-4">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase">Istituzione</p>
                        <p className="font-medium">{about.professionalMasterInstitution || "-"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase">Programma</p>
                        <p className="font-medium">{about.professionalMasterProgram || "-"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase">Voto</p>
                        <p className="font-medium">{about.professionalMasterGpa || "-"}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Previous Work Experiences */}
                {renderExperiences(
                  about.previousWorkExperiences,
                  "Esperienze Lavorative Precedenti",
                  <Briefcase className="h-4 w-4" />
                )}
              </>
            )}

            {/* Common Experiences */}
            {renderExperiences(
              about.professionalExperiences,
              "Esperienze Professionali",
              <Briefcase className="h-4 w-4" />
            )}
            {renderExperiences(
              about.volunteerExperiences,
              "Esperienze di Volontariato",
              <User className="h-4 w-4" />
            )}
          </CardContent>
        </Card>
      )}

      {/* Languages Section */}
      {langs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Globe className="h-5 w-5" />
              Lingue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {langs.map((lang, idx) => (
                <div key={idx} className="bg-muted/50 rounded-lg px-4 py-2">
                  <span className="font-medium">{lang.language}</span>
                  <Badge variant="outline" className="ml-2 text-xs">
                    {levelLabels[lang.level] || lang.level}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Certifications Section */}
      {certs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Award className="h-5 w-5" />
              Certificazioni
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {certs.map((cert, idx) => (
                <div key={idx} className="bg-muted/50 rounded-lg p-3">
                  <p className="font-medium">{cert.name}</p>
                  <p className="text-sm text-muted-foreground">{cert.issuingBody}</p>
                  <p className="text-xs text-muted-foreground">{cert.year}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
