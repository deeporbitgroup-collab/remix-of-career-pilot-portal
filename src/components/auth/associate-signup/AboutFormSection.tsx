import { useState, useCallback, memo } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, GraduationCap, Briefcase, BookOpen, Languages, Award } from "lucide-react";
import { AboutFormData, Experience, Language, Certification } from "./types";
import { translations } from "./translations";

// Memoized Experience Item to prevent re-renders
const ExperienceItem = memo(({
  experience,
  index,
  onUpdate,
  onRemove,
  isLoading,
  t,
}: {
  experience: Experience;
  index: number;
  onUpdate: (index: number, field: keyof Experience, value: string) => void;
  onRemove: (index: number) => void;
  isLoading: boolean;
  t: typeof translations.en;
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-background rounded border">
      <Input
        placeholder={t.role}
        defaultValue={experience.role}
        onBlur={(e) => onUpdate(index, "role", e.target.value)}
        disabled={isLoading}
      />
      <Input
        placeholder={t.company}
        defaultValue={experience.company}
        onBlur={(e) => onUpdate(index, "company", e.target.value)}
        disabled={isLoading}
      />
      <Input
        placeholder={t.duration}
        defaultValue={experience.duration}
        onBlur={(e) => onUpdate(index, "duration", e.target.value)}
        disabled={isLoading}
      />
      <div className="flex gap-2">
        <Input
          placeholder={t.sector}
          defaultValue={experience.sector || ""}
          onBlur={(e) => onUpdate(index, "sector", e.target.value)}
          disabled={isLoading}
          className="flex-1"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onRemove(index)}
          disabled={isLoading}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
});

ExperienceItem.displayName = "ExperienceItem";

// Memoized Experience List component
const ExperienceList = memo(({
  type,
  label,
  recommended = false,
  experiences,
  onAdd,
  onUpdate,
  onRemove,
  isLoading,
  t,
}: {
  type: string;
  label: string;
  recommended?: boolean;
  experiences: Experience[];
  onAdd: () => void;
  onUpdate: (index: number, field: keyof Experience, value: string) => void;
  onRemove: (index: number) => void;
  isLoading: boolean;
  t: typeof translations.en;
}) => {
  return (
    <div className="space-y-3 border border-border/50 rounded-lg p-4 bg-muted/20">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">
          {label} {recommended && <span className="text-muted-foreground text-xs">{t.experiencesRecommended}</span>}
        </Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onAdd}
          disabled={isLoading}
        >
          <Plus className="h-4 w-4 mr-1" />
          {t.addExperience}
        </Button>
      </div>
      
      {experiences.map((exp, index) => (
        <ExperienceItem
          key={`${type}-${index}`}
          experience={exp}
          index={index}
          onUpdate={onUpdate}
          onRemove={onRemove}
          isLoading={isLoading}
          t={t}
        />
      ))}
    </div>
  );
});

ExperienceList.displayName = "ExperienceList";

// Language Item component
const LanguageItem = memo(({
  lang,
  index,
  onUpdate,
  onRemove,
  isLoading,
  canRemove,
  t,
}: {
  lang: Language;
  index: number;
  onUpdate: (index: number, field: keyof Language, value: string) => void;
  onRemove: (index: number) => void;
  isLoading: boolean;
  canRemove: boolean;
  t: typeof translations.en;
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 p-3 bg-background rounded-lg border">
      <div className="space-y-1">
        <Label className="text-xs">{t.language}</Label>
        <Input
          placeholder={t.language}
          defaultValue={lang.language}
          onBlur={(e) => onUpdate(index, "language", e.target.value)}
          disabled={isLoading}
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">{t.level}</Label>
        <Select
          value={lang.level}
          onValueChange={(value) => onUpdate(index, "level", value)}
          disabled={isLoading}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="native">{t.levelNative}</SelectItem>
            <SelectItem value="advanced">{t.levelAdvanced}</SelectItem>
            <SelectItem value="intermediate">{t.levelIntermediate}</SelectItem>
            <SelectItem value="basic">{t.levelBasic}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-end">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onRemove(index)}
          disabled={isLoading || !canRemove}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
});

LanguageItem.displayName = "LanguageItem";

// Certification Item component
const CertificationItem = memo(({
  cert,
  index,
  onUpdate,
  onRemove,
  isLoading,
  t,
}: {
  cert: Certification;
  index: number;
  onUpdate: (index: number, field: keyof Certification, value: string) => void;
  onRemove: (index: number) => void;
  isLoading: boolean;
  t: typeof translations.en;
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_100px_auto] gap-3 p-3 bg-background rounded-lg border">
      <div className="space-y-1">
        <Label className="text-xs">{t.certificationName}</Label>
        <Input
          placeholder={t.certificationName}
          defaultValue={cert.name}
          onBlur={(e) => onUpdate(index, "name", e.target.value)}
          disabled={isLoading}
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">{t.issuingBody}</Label>
        <Input
          placeholder={t.issuingBody}
          defaultValue={cert.issuingBody}
          onBlur={(e) => onUpdate(index, "issuingBody", e.target.value)}
          disabled={isLoading}
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">{t.year}</Label>
        <Input
          placeholder="2024"
          defaultValue={cert.year}
          onBlur={(e) => onUpdate(index, "year", e.target.value)}
          disabled={isLoading}
          maxLength={4}
        />
      </div>
      <div className="flex items-end">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onRemove(index)}
          disabled={isLoading}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
});

CertificationItem.displayName = "CertificationItem";

interface AboutFormSectionProps {
  language: "it" | "en";
  aboutData: AboutFormData;
  onAboutDataChange: (data: AboutFormData) => void;
  languages: Language[];
  onLanguagesChange: (languages: Language[]) => void;
  certifications: Certification[];
  onCertificationsChange: (certifications: Certification[]) => void;
  isLoading: boolean;
  languagesError?: string;
}

const AboutFormSection = ({
  language,
  aboutData,
  onAboutDataChange,
  languages,
  onLanguagesChange,
  certifications,
  onCertificationsChange,
  isLoading,
  languagesError,
}: AboutFormSectionProps) => {
  const t = translations[language];

  const updateField = useCallback(<K extends keyof AboutFormData>(
    field: K,
    value: AboutFormData[K]
  ) => {
    onAboutDataChange({ ...aboutData, [field]: value });
  }, [aboutData, onAboutDataChange]);

  // Experience handlers
  const addExperience = useCallback((type: "professionalExperiences" | "volunteerExperiences" | "previousWorkExperiences") => {
    const current = aboutData[type] || [];
    onAboutDataChange({ ...aboutData, [type]: [...current, { role: "", company: "", duration: "", sector: "" }] });
  }, [aboutData, onAboutDataChange]);

  const removeExperience = useCallback((type: "professionalExperiences" | "volunteerExperiences" | "previousWorkExperiences", index: number) => {
    const current = aboutData[type] || [];
    onAboutDataChange({ ...aboutData, [type]: current.filter((_, i) => i !== index) });
  }, [aboutData, onAboutDataChange]);

  const updateExperience = useCallback((
    type: "professionalExperiences" | "volunteerExperiences" | "previousWorkExperiences",
    index: number,
    field: keyof Experience,
    value: string
  ) => {
    const current = aboutData[type] || [];
    const updated = current.map((exp, i) =>
      i === index ? { ...exp, [field]: value } : exp
    );
    onAboutDataChange({ ...aboutData, [type]: updated });
  }, [aboutData, onAboutDataChange]);

  // Language handlers
  const addLanguage = useCallback(() => {
    onLanguagesChange([...languages, { language: "", level: "intermediate" }]);
  }, [languages, onLanguagesChange]);

  const removeLanguage = useCallback((index: number) => {
    onLanguagesChange(languages.filter((_, i) => i !== index));
  }, [languages, onLanguagesChange]);

  const updateLanguage = useCallback((index: number, field: keyof Language, value: string) => {
    onLanguagesChange(
      languages.map((lang, i) =>
        i === index ? { ...lang, [field]: value } : lang
      )
    );
  }, [languages, onLanguagesChange]);

  // Certification handlers
  const addCertification = useCallback(() => {
    onCertificationsChange([...certifications, { name: "", issuingBody: "", year: "" }]);
  }, [certifications, onCertificationsChange]);

  const removeCertification = useCallback((index: number) => {
    onCertificationsChange(certifications.filter((_, i) => i !== index));
  }, [certifications, onCertificationsChange]);

  const updateCertification = useCallback((index: number, field: keyof Certification, value: string) => {
    onCertificationsChange(
      certifications.map((cert, i) =>
        i === index ? { ...cert, [field]: value } : cert
      )
    );
  }, [certifications, onCertificationsChange]);

  return (
    <div className="space-y-6 border border-primary/20 rounded-lg p-4 bg-primary/5">
      <div className="flex items-center gap-2">
        <BookOpen className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-lg">{t.aboutTitle}</h3>
      </div>

      {/* Status Selection */}
      <div className="space-y-2">
        <Label>{t.selectStatus}</Label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {(["university_student", "master_student", "professional"] as const).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => updateField("status", status)}
              disabled={isLoading}
              className={`p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${
                aboutData.status === status
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/50"
              }`}
            >
              {status === "university_student" && <GraduationCap className="h-6 w-6" />}
              {status === "master_student" && <BookOpen className="h-6 w-6" />}
              {status === "professional" && <Briefcase className="h-6 w-6" />}
              <span className="font-medium text-sm">
                {status === "university_student" && t.universityStudent}
                {status === "master_student" && t.masterStudent}
                {status === "professional" && t.professional}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* University Student Fields */}
      {aboutData.status === "university_student" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t.university}</Label>
              <Input
                value={aboutData.university || ""}
                onChange={(e) => updateField("university", e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label>{t.course}</Label>
              <Input
                value={aboutData.course || ""}
                onChange={(e) => updateField("course", e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label>{t.gpa}</Label>
              <Input
                value={aboutData.gpa || ""}
                onChange={(e) => updateField("gpa", e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>
          
          <ExperienceList
            type="professionalExperiences"
            label={t.professionalExperiences}
            recommended
            experiences={aboutData.professionalExperiences || []}
            onAdd={() => addExperience("professionalExperiences")}
            onUpdate={(idx, field, val) => updateExperience("professionalExperiences", idx, field, val)}
            onRemove={(idx) => removeExperience("professionalExperiences", idx)}
            isLoading={isLoading}
            t={t}
          />
          <ExperienceList
            type="volunteerExperiences"
            label={t.volunteerExperiences}
            recommended
            experiences={aboutData.volunteerExperiences || []}
            onAdd={() => addExperience("volunteerExperiences")}
            onUpdate={(idx, field, val) => updateExperience("volunteerExperiences", idx, field, val)}
            onRemove={(idx) => removeExperience("volunteerExperiences", idx)}
            isLoading={isLoading}
            t={t}
          />
        </div>
      )}

      {/* Master Student Fields */}
      {aboutData.status === "master_student" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t.masterInstitution}</Label>
              <Input
                value={aboutData.masterInstitution || ""}
                onChange={(e) => updateField("masterInstitution", e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label>{t.masterType}</Label>
              <Input
                value={aboutData.masterType || ""}
                onChange={(e) => updateField("masterType", e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label>{t.masterGpa}</Label>
              <Input
                value={aboutData.masterGpa || ""}
                onChange={(e) => updateField("masterGpa", e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="border-t pt-4">
            <Label className="text-base font-medium mb-3 block">{t.previousDegree}</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-sm">{t.previousUniversity}</Label>
                <Input
                  value={aboutData.previousUniversity || ""}
                  onChange={(e) => updateField("previousUniversity", e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">{t.previousCourse}</Label>
                <Input
                  value={aboutData.previousCourse || ""}
                  onChange={(e) => updateField("previousCourse", e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">{t.previousGpa}</Label>
                <Input
                  value={aboutData.previousGpa || ""}
                  onChange={(e) => updateField("previousGpa", e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>

          <ExperienceList
            type="professionalExperiences"
            label={t.professionalExperiences}
            experiences={aboutData.professionalExperiences || []}
            onAdd={() => addExperience("professionalExperiences")}
            onUpdate={(idx, field, val) => updateExperience("professionalExperiences", idx, field, val)}
            onRemove={(idx) => removeExperience("professionalExperiences", idx)}
            isLoading={isLoading}
            t={t}
          />
          <ExperienceList
            type="volunteerExperiences"
            label={t.volunteerExperiences}
            experiences={aboutData.volunteerExperiences || []}
            onAdd={() => addExperience("volunteerExperiences")}
            onUpdate={(idx, field, val) => updateExperience("volunteerExperiences", idx, field, val)}
            onRemove={(idx) => removeExperience("volunteerExperiences", idx)}
            isLoading={isLoading}
            t={t}
          />
        </div>
      )}

      {/* Professional Fields */}
      {aboutData.status === "professional" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>{t.currentCompany}</Label>
              <Input
                value={aboutData.currentCompany || ""}
                onChange={(e) => updateField("currentCompany", e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label>{t.companySector}</Label>
              <Input
                value={aboutData.companySector || ""}
                onChange={(e) => updateField("companySector", e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label>{t.currentPosition}</Label>
              <Input
                value={aboutData.currentPosition || ""}
                onChange={(e) => updateField("currentPosition", e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="border-t pt-4">
            <Label className="text-base font-medium mb-3 block">{t.educationBackground}</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm">{t.professionalUniversity}</Label>
                <Input
                  value={aboutData.professionalUniversity || ""}
                  onChange={(e) => updateField("professionalUniversity", e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">{t.professionalDegree}</Label>
                <Input
                  value={aboutData.professionalDegree || ""}
                  onChange={(e) => updateField("professionalDegree", e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center space-x-2 mb-4">
              <Checkbox
                id="hasMaster"
                checked={aboutData.hasMaster || false}
                onCheckedChange={(checked) => updateField("hasMaster", checked === true)}
                disabled={isLoading}
              />
              <Label htmlFor="hasMaster">{t.hasMaster}</Label>
            </div>

            {aboutData.hasMaster && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm">{t.professionalMasterInstitution}</Label>
                  <Input
                    value={aboutData.professionalMasterInstitution || ""}
                    onChange={(e) => updateField("professionalMasterInstitution", e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">{t.professionalMasterProgram}</Label>
                  <Input
                    value={aboutData.professionalMasterProgram || ""}
                    onChange={(e) => updateField("professionalMasterProgram", e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">{t.professionalMasterGpa}</Label>
                  <Input
                    value={aboutData.professionalMasterGpa || ""}
                    onChange={(e) => updateField("professionalMasterGpa", e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              </div>
            )}
          </div>

          <ExperienceList
            type="previousWorkExperiences"
            label={t.previousWorkExperiences}
            experiences={aboutData.previousWorkExperiences || []}
            onAdd={() => addExperience("previousWorkExperiences")}
            onUpdate={(idx, field, val) => updateExperience("previousWorkExperiences", idx, field, val)}
            onRemove={(idx) => removeExperience("previousWorkExperiences", idx)}
            isLoading={isLoading}
            t={t}
          />
        </div>
      )}

      {/* Languages Section - now inside About form */}
      <div className="space-y-4 border-t pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Languages className="h-5 w-5 text-primary" />
            <div>
              <h4 className="font-semibold">{t.languagesTitle}</h4>
              <p className="text-sm text-muted-foreground">{t.languagesDesc}</p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addLanguage}
            disabled={isLoading}
          >
            <Plus className="h-4 w-4 mr-1" />
            {t.addLanguage}
          </Button>
        </div>

        {languages.length === 0 && (
          <p className="text-sm text-muted-foreground italic py-2">
            {t.atLeastOneLanguage}
          </p>
        )}

        {languages.map((lang, index) => (
          <LanguageItem
            key={`lang-${index}`}
            lang={lang}
            index={index}
            onUpdate={updateLanguage}
            onRemove={removeLanguage}
            isLoading={isLoading}
            canRemove={languages.length > 1}
            t={t}
          />
        ))}

        {languagesError && <p className="text-sm text-destructive">{languagesError}</p>}
      </div>

      {/* Certifications Section - now inside About form */}
      <div className="space-y-4 border-t pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            <div>
              <h4 className="font-semibold">{t.certificationsTitle}</h4>
              <p className="text-sm text-muted-foreground">{t.certificationsDesc}</p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addCertification}
            disabled={isLoading}
          >
            <Plus className="h-4 w-4 mr-1" />
            {t.addCertification}
          </Button>
        </div>

        {certifications.map((cert, index) => (
          <CertificationItem
            key={`cert-${index}`}
            cert={cert}
            index={index}
            onUpdate={updateCertification}
            onRemove={removeCertification}
            isLoading={isLoading}
            t={t}
          />
        ))}
      </div>
    </div>
  );
};

export default AboutFormSection;
