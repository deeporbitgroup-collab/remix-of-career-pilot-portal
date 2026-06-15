import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, FileText, Upload } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

// Types for Brief Overview data
export interface HighSchoolData {
  schoolName: string;
  currentYear: string;
  expectedGraduation: string; // MM/YYYY
  grades: {
    year3: string;
    year4: string;
    year5: string;
    year4IsExpected: boolean;
    year5IsExpected: boolean;
  };
  targetUniversities: string[];
  coursesOfInterest: {
    primary: string;
    secondary?: string;
  };
  certifications: {
    name: string;
    date: string;
    expiryDate?: string;
  }[];
  extracurriculars: {
    organization: string;
    startDate: string;
    endDate: string;
    description: string;
  }[];
  languages: {
    language: string;
    level: string;
  }[];
  threeAdjectives: string;
}

export interface UniversityData {
  universityName: string;
  courseName: string;
  currentYear: string;
  currentGrade: string;
  expectedGraduation: string;
  workInterest: string;
  internshipType: string;
  internshipPaid: "paid" | "unpaid" | "both";
  highSchoolName: string;
  diplomaGrade: string;
  workExperiences: {
    company: string;
    position: string;
    startDate: string;
    endDate: string;
    description: string;
  }[];
  projects: {
    organization: string;
    role: string;
    startDate: string;
    endDate: string;
    description: string;
  }[];
  preferredCities: {
    primary: string;
    secondary?: string;
  };
  languages: {
    language: string;
    level: string;
  }[];
  threeAdjectives: string;
}

export type BriefOverviewData = {
  type: "high_school";
  data: HighSchoolData;
} | {
  type: "university";
  data: UniversityData;
} | {
  type: "graduate" | "professional";
  data: null;
};

interface BriefOverviewFormProps {
  status: string;
  cvFile: File | null;
  onCvChange: (file: File | null) => void;
  onBriefOverviewChange: (data: BriefOverviewData | null) => void;
  briefOverviewData: BriefOverviewData | null;
  showValidation?: boolean;
}

const LANGUAGE_LEVELS = [
  { value: "A1", label: "A1 — Elementary proficiency" },
  { value: "A2", label: "A2 — Limited working proficiency" },
  { value: "B1", label: "B1 — Professional working proficiency" },
  { value: "B2", label: "B2 — Intermediate / Upper-intermediate proficiency" },
  { value: "C1", label: "C1 — Advanced proficiency" },
  { value: "C2", label: "C2 — Full professional proficiency" },
  { value: "Native", label: "Native" },
];

const CURRENT_YEARS_HS = ["3rd Year", "4th Year", "5th Year"];
const CURRENT_YEARS_UNI = ["1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year", "Graduate"];

export const BriefOverviewForm = ({
  status,
  cvFile,
  onCvChange,
  onBriefOverviewChange,
  briefOverviewData,
  showValidation = false,
}: BriefOverviewFormProps) => {
  const isGraduateOrProfessional = status === "graduate" || status === "professional" || status === "master";
  const isHighSchool = status === "high_school";
  const isUniversity = status === "university";

  // High School State
  const [hsData, setHsData] = useState<HighSchoolData>({
    schoolName: "",
    currentYear: "",
    expectedGraduation: "",
    grades: {
      year3: "",
      year4: "",
      year5: "",
      year4IsExpected: false,
      year5IsExpected: false,
    },
    targetUniversities: [""],
    coursesOfInterest: { primary: "", secondary: "" },
    certifications: [],
    extracurriculars: [],
    languages: [{ language: "", level: "" }],
    threeAdjectives: "",
  });

  // University State
  const [uniData, setUniData] = useState<UniversityData>({
    universityName: "",
    courseName: "",
    currentYear: "",
    currentGrade: "",
    expectedGraduation: "",
    workInterest: "",
    internshipType: "",
    internshipPaid: "both",
    highSchoolName: "",
    diplomaGrade: "",
    workExperiences: [],
    projects: [],
    preferredCities: { primary: "", secondary: "" },
    languages: [{ language: "", level: "" }],
    threeAdjectives: "",
  });

  const [useCV, setUseCV] = useState<boolean>(isGraduateOrProfessional);
  const [useBriefOverview, setUseBriefOverview] = useState<boolean>(false);

  // Update parent when data changes
  useEffect(() => {
    if (isGraduateOrProfessional) {
      onBriefOverviewChange(null);
    } else if (useBriefOverview) {
      if (isHighSchool) {
        onBriefOverviewChange({ type: "high_school", data: hsData });
      } else if (isUniversity) {
        onBriefOverviewChange({ type: "university", data: uniData });
      }
    } else {
      onBriefOverviewChange(null);
    }
  }, [hsData, uniData, useBriefOverview, isHighSchool, isUniversity, isGraduateOrProfessional]);

  // Determine what year grades should be expected
  useEffect(() => {
    if (isHighSchool && hsData.currentYear) {
      const newGrades = { ...hsData.grades };
      if (hsData.currentYear === "3rd Year") {
        newGrades.year4IsExpected = true;
        newGrades.year5IsExpected = true;
      } else if (hsData.currentYear === "4th Year") {
        newGrades.year4IsExpected = false;
        newGrades.year5IsExpected = true;
      } else {
        newGrades.year4IsExpected = false;
        newGrades.year5IsExpected = false;
      }
      setHsData({ ...hsData, grades: newGrades });
    }
  }, [hsData.currentYear]);

  // Reset when status changes
  useEffect(() => {
    if (isGraduateOrProfessional) {
      setUseCV(true);
      setUseBriefOverview(false);
    } else {
      setUseCV(false);
      setUseBriefOverview(false);
    }
  }, [status]);

  const isValid = () => {
    if (isGraduateOrProfessional) {
      return cvFile !== null;
    }
    return cvFile !== null || useBriefOverview;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    onCvChange(file);
    if (file) {
      setUseCV(true);
      if (!isGraduateOrProfessional) {
        setUseBriefOverview(false);
      }
    }
  };

  const handleSelectBriefOverview = () => {
    if (!isGraduateOrProfessional) {
      setUseBriefOverview(true);
      setUseCV(false);
      onCvChange(null);
    }
  };

  const handleSelectCV = () => {
    setUseCV(true);
    setUseBriefOverview(false);
  };

  // Helper functions for arrays
  const addCertification = () => {
    setHsData({
      ...hsData,
      certifications: [...hsData.certifications, { name: "", date: "", expiryDate: "" }],
    });
  };

  const removeCertification = (index: number) => {
    setHsData({
      ...hsData,
      certifications: hsData.certifications.filter((_, i) => i !== index),
    });
  };

  const addExtracurricular = () => {
    setHsData({
      ...hsData,
      extracurriculars: [...hsData.extracurriculars, { organization: "", startDate: "", endDate: "", description: "" }],
    });
  };

  const removeExtracurricular = (index: number) => {
    setHsData({
      ...hsData,
      extracurriculars: hsData.extracurriculars.filter((_, i) => i !== index),
    });
  };

  const addLanguage = (type: "hs" | "uni") => {
    if (type === "hs") {
      setHsData({
        ...hsData,
        languages: [...hsData.languages, { language: "", level: "" }],
      });
    } else {
      setUniData({
        ...uniData,
        languages: [...uniData.languages, { language: "", level: "" }],
      });
    }
  };

  const removeLanguage = (type: "hs" | "uni", index: number) => {
    if (type === "hs") {
      setHsData({
        ...hsData,
        languages: hsData.languages.filter((_, i) => i !== index),
      });
    } else {
      setUniData({
        ...uniData,
        languages: uniData.languages.filter((_, i) => i !== index),
      });
    }
  };

  const addWorkExperience = () => {
    setUniData({
      ...uniData,
      workExperiences: [...uniData.workExperiences, { company: "", position: "", startDate: "", endDate: "", description: "" }],
    });
  };

  const removeWorkExperience = (index: number) => {
    setUniData({
      ...uniData,
      workExperiences: uniData.workExperiences.filter((_, i) => i !== index),
    });
  };

  const addProject = () => {
    setUniData({
      ...uniData,
      projects: [...uniData.projects, { organization: "", role: "", startDate: "", endDate: "", description: "" }],
    });
  };

  const removeProject = (index: number) => {
    setUniData({
      ...uniData,
      projects: uniData.projects.filter((_, i) => i !== index),
    });
  };

  const addUniversity = () => {
    setHsData({
      ...hsData,
      targetUniversities: [...hsData.targetUniversities, ""],
    });
  };

  const removeUniversity = (index: number) => {
    if (hsData.targetUniversities.length > 1) {
      setHsData({
        ...hsData,
        targetUniversities: hsData.targetUniversities.filter((_, i) => i !== index),
      });
    }
  };

  // Graduate/Professional - CV Required
  if (isGraduateOrProfessional) {
    return (
      <Card className={`mt-4 ${showValidation && !cvFile ? 'border-destructive' : ''}`}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Upload className="h-4 w-4" />
            CV Required
          </CardTitle>
          <CardDescription>
            As a Graduate/Professional, uploading your CV is required to create an account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            className={showValidation && !cvFile ? 'border-destructive' : ''}
          />
          {cvFile && (
            <p className="text-sm text-muted-foreground mt-2">
              Selected: {cvFile.name}
            </p>
          )}
          {showValidation && !cvFile && (
            <p className="text-sm text-destructive mt-2">CV is required</p>
          )}
        </CardContent>
      </Card>
    );
  }

  // High School / University - Choice between CV or Brief Overview
  return (
    <div className="mt-4 space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Profile Information</CardTitle>
          <CardDescription>
            Choose one option: upload your CV or complete the Brief Overview form
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Option Selection */}
          <div className="flex gap-4">
            <Button
              type="button"
              variant={useCV ? "default" : "outline"}
              onClick={handleSelectCV}
              className="flex-1"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload CV
            </Button>
            <Button
              type="button"
              variant={useBriefOverview ? "default" : "outline"}
              onClick={handleSelectBriefOverview}
              className="flex-1"
            >
              <FileText className="h-4 w-4 mr-2" />
              Brief Overview
            </Button>
          </div>

          {showValidation && !cvFile && !useBriefOverview && (
            <p className="text-sm text-destructive">Please upload a CV or complete the Brief Overview</p>
          )}

          {/* CV Upload Section */}
          {useCV && (
            <div className="space-y-2">
              <Label>Upload CV (PDF)</Label>
              <Input
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
              />
              {cvFile && (
                <p className="text-sm text-muted-foreground">
                  Selected: {cvFile.name}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Brief Overview Form */}
      {useBriefOverview && isHighSchool && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Brief Overview - High School Student</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* School Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>High School Name *</Label>
                <Input
                  value={hsData.schoolName}
                  onChange={(e) => setHsData({ ...hsData, schoolName: e.target.value })}
                  placeholder="Name of your high school"
                  required
                />
              </div>
              <div>
                <Label>Current Year *</Label>
                <Select
                  value={hsData.currentYear}
                  onValueChange={(value) => setHsData({ ...hsData, currentYear: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENT_YEARS_HS.map((year) => (
                      <SelectItem key={year} value={year}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Expected Graduation (MM/YYYY) *</Label>
              <Input
                value={hsData.expectedGraduation}
                onChange={(e) => setHsData({ ...hsData, expectedGraduation: e.target.value })}
                placeholder="06/2025"
                required
              />
            </div>

            {/* Grades */}
            <div>
              <Label className="text-base font-medium">Grades (Last 3 Years) *</Label>
              <div className="grid grid-cols-3 gap-4 mt-2">
                <div>
                  <Label className="text-sm">3rd Year</Label>
                  <Input
                    value={hsData.grades.year3}
                    onChange={(e) => setHsData({ ...hsData, grades: { ...hsData.grades, year3: e.target.value } })}
                    placeholder="e.g., 8.5/10"
                  />
                </div>
                <div>
                  <Label className="text-sm">
                    4th Year {hsData.grades.year4IsExpected && "(Expected)"}
                  </Label>
                  <Input
                    value={hsData.grades.year4}
                    onChange={(e) => setHsData({ ...hsData, grades: { ...hsData.grades, year4: e.target.value } })}
                    placeholder={hsData.grades.year4IsExpected ? "Expected grade" : "e.g., 8.5/10"}
                  />
                </div>
                <div>
                  <Label className="text-sm">
                    5th Year {hsData.grades.year5IsExpected && "(Expected)"}
                  </Label>
                  <Input
                    value={hsData.grades.year5}
                    onChange={(e) => setHsData({ ...hsData, grades: { ...hsData.grades, year5: e.target.value } })}
                    placeholder={hsData.grades.year5IsExpected ? "Expected grade" : "e.g., 8.5/10"}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Target Universities */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-base font-medium">Target Universities *</Label>
                <Button type="button" variant="outline" size="sm" onClick={addUniversity}>
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
              </div>
              <div className="space-y-2">
                {hsData.targetUniversities.map((uni, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={uni}
                      onChange={(e) => {
                        const newUnis = [...hsData.targetUniversities];
                        newUnis[index] = e.target.value;
                        setHsData({ ...hsData, targetUniversities: newUnis });
                      }}
                      placeholder="University name"
                    />
                    {hsData.targetUniversities.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeUniversity(index)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Courses of Interest */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Primary Course of Interest *</Label>
                <Input
                  value={hsData.coursesOfInterest.primary}
                  onChange={(e) => setHsData({ ...hsData, coursesOfInterest: { ...hsData.coursesOfInterest, primary: e.target.value } })}
                  placeholder="e.g., Economics"
                  required
                />
              </div>
              <div>
                <Label>Secondary Course (Optional)</Label>
                <Input
                  value={hsData.coursesOfInterest.secondary || ""}
                  onChange={(e) => setHsData({ ...hsData, coursesOfInterest: { ...hsData.coursesOfInterest, secondary: e.target.value } })}
                  placeholder="e.g., Business"
                />
              </div>
            </div>

            <Separator />

            {/* Certifications (Optional) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-base font-medium">Certifications (Optional)</Label>
                <Button type="button" variant="outline" size="sm" onClick={addCertification}>
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
              </div>
              {hsData.certifications.map((cert, index) => (
                <div key={index} className="border rounded-lg p-3 mb-2">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Input
                      value={cert.name}
                      onChange={(e) => {
                        const newCerts = [...hsData.certifications];
                        newCerts[index] = { ...cert, name: e.target.value };
                        setHsData({ ...hsData, certifications: newCerts });
                      }}
                      placeholder="Certification name"
                    />
                    <Input
                      type="date"
                      value={cert.date}
                      onChange={(e) => {
                        const newCerts = [...hsData.certifications];
                        newCerts[index] = { ...cert, date: e.target.value };
                        setHsData({ ...hsData, certifications: newCerts });
                      }}
                    />
                    <div className="flex gap-2">
                      <Input
                        type="date"
                        value={cert.expiryDate || ""}
                        onChange={(e) => {
                          const newCerts = [...hsData.certifications];
                          newCerts[index] = { ...cert, expiryDate: e.target.value };
                          setHsData({ ...hsData, certifications: newCerts });
                        }}
                        placeholder="Expiry (optional)"
                      />
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeCertification(index)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              {hsData.certifications.length === 0 && (
                <p className="text-sm text-muted-foreground">No certifications added</p>
              )}
            </div>

            {/* Extracurriculars (Optional) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-base font-medium">Extracurricular Activities (Optional)</Label>
                <Button type="button" variant="outline" size="sm" onClick={addExtracurricular}>
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
              </div>
              {hsData.extracurriculars.map((ext, index) => (
                <div key={index} className="border rounded-lg p-3 mb-2 space-y-3">
                  <div className="flex justify-between items-start">
                    <Input
                      value={ext.organization}
                      onChange={(e) => {
                        const newExts = [...hsData.extracurriculars];
                        newExts[index] = { ...ext, organization: e.target.value };
                        setHsData({ ...hsData, extracurriculars: newExts });
                      }}
                      placeholder="Organization/Activity name"
                      className="flex-1 mr-2"
                    />
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeExtracurricular(index)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      type="date"
                      value={ext.startDate}
                      onChange={(e) => {
                        const newExts = [...hsData.extracurriculars];
                        newExts[index] = { ...ext, startDate: e.target.value };
                        setHsData({ ...hsData, extracurriculars: newExts });
                      }}
                    />
                    <Input
                      type="date"
                      value={ext.endDate}
                      onChange={(e) => {
                        const newExts = [...hsData.extracurriculars];
                        newExts[index] = { ...ext, endDate: e.target.value };
                        setHsData({ ...hsData, extracurriculars: newExts });
                      }}
                    />
                  </div>
                  <Textarea
                    value={ext.description}
                    onChange={(e) => {
                      const newExts = [...hsData.extracurriculars];
                      newExts[index] = { ...ext, description: e.target.value };
                      setHsData({ ...hsData, extracurriculars: newExts });
                    }}
                    placeholder="Brief description of activities"
                    rows={2}
                  />
                </div>
              ))}
              {hsData.extracurriculars.length === 0 && (
                <p className="text-sm text-muted-foreground">No extracurriculars added</p>
              )}
            </div>

            <Separator />

            {/* Languages (Optional) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-base font-medium">Languages (Optional)</Label>
                <Button type="button" variant="outline" size="sm" onClick={() => addLanguage("hs")}>
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
              </div>
              {hsData.languages.map((lang, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <Input
                    value={lang.language}
                    onChange={(e) => {
                      const newLangs = [...hsData.languages];
                      newLangs[index] = { ...lang, language: e.target.value };
                      setHsData({ ...hsData, languages: newLangs });
                    }}
                    placeholder="Language"
                    className="flex-1"
                  />
                  <Select
                    value={lang.level}
                    onValueChange={(value) => {
                      const newLangs = [...hsData.languages];
                      newLangs[index] = { ...lang, level: value };
                      setHsData({ ...hsData, languages: newLangs });
                    }}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Level" />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGE_LEVELS.map((level) => (
                        <SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {hsData.languages.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeLanguage("hs", index)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {/* Three Adjectives */}
            <div>
              <Label>Three adjectives that describe you (Optional)</Label>
              <Input
                value={hsData.threeAdjectives}
                onChange={(e) => setHsData({ ...hsData, threeAdjectives: e.target.value })}
                placeholder="e.g., Ambitious, Creative, Determined"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {useBriefOverview && isUniversity && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Brief Overview - University Student</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* University Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>University Name *</Label>
                <Input
                  value={uniData.universityName}
                  onChange={(e) => setUniData({ ...uniData, universityName: e.target.value })}
                  placeholder="Name of your university"
                  required
                />
              </div>
              <div>
                <Label>Course/Degree Name *</Label>
                <Input
                  value={uniData.courseName}
                  onChange={(e) => setUniData({ ...uniData, courseName: e.target.value })}
                  placeholder="e.g., BSc Economics"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Current Year *</Label>
                <Select
                  value={uniData.currentYear}
                  onValueChange={(value) => setUniData({ ...uniData, currentYear: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENT_YEARS_UNI.map((year) => (
                      <SelectItem key={year} value={year}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Current Grade/GPA *</Label>
                <Input
                  value={uniData.currentGrade}
                  onChange={(e) => setUniData({ ...uniData, currentGrade: e.target.value })}
                  placeholder="e.g., 28/30 or 3.7 GPA"
                  required
                />
              </div>
              <div>
                <Label>Expected Graduation *</Label>
                <Input
                  value={uniData.expectedGraduation}
                  onChange={(e) => setUniData({ ...uniData, expectedGraduation: e.target.value })}
                  placeholder="MM/YYYY"
                  required
                />
              </div>
            </div>

            <Separator />

            {/* Career Interests */}
            <div>
              <Label>Work/Industry Interest *</Label>
              <Textarea
                value={uniData.workInterest}
                onChange={(e) => setUniData({ ...uniData, workInterest: e.target.value })}
                placeholder="Describe the industry or type of work you're interested in"
                rows={2}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Internship Type *</Label>
                <Input
                  value={uniData.internshipType}
                  onChange={(e) => setUniData({ ...uniData, internshipType: e.target.value })}
                  placeholder="e.g., Summer, Graduate, Part-time"
                  required
                />
              </div>
              <div>
                <Label>Internship Preference *</Label>
                <RadioGroup
                  value={uniData.internshipPaid}
                  onValueChange={(value: "paid" | "unpaid" | "both") => setUniData({ ...uniData, internshipPaid: value })}
                  className="flex gap-4 mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="paid" id="paid" />
                    <Label htmlFor="paid" className="font-normal">Paid</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="unpaid" id="unpaid" />
                    <Label htmlFor="unpaid" className="font-normal">Unpaid</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="both" id="both" />
                    <Label htmlFor="both" className="font-normal">Both</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>

            <Separator />

            {/* High School Background */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>High School Name *</Label>
                <Input
                  value={uniData.highSchoolName}
                  onChange={(e) => setUniData({ ...uniData, highSchoolName: e.target.value })}
                  placeholder="Name of your high school"
                  required
                />
              </div>
              <div>
                <Label>Diploma Grade *</Label>
                <Input
                  value={uniData.diplomaGrade}
                  onChange={(e) => setUniData({ ...uniData, diplomaGrade: e.target.value })}
                  placeholder="e.g., 95/100"
                  required
                />
              </div>
            </div>

            <Separator />

            {/* Work Experiences (Optional) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-base font-medium">Work Experiences (Optional)</Label>
                <Button type="button" variant="outline" size="sm" onClick={addWorkExperience}>
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
              </div>
              {uniData.workExperiences.map((exp, index) => (
                <div key={index} className="border rounded-lg p-3 mb-2 space-y-3">
                  <div className="flex justify-between items-start gap-2">
                    <Input
                      value={exp.company}
                      onChange={(e) => {
                        const newExps = [...uniData.workExperiences];
                        newExps[index] = { ...exp, company: e.target.value };
                        setUniData({ ...uniData, workExperiences: newExps });
                      }}
                      placeholder="Company name"
                      className="flex-1"
                    />
                    <Input
                      value={exp.position}
                      onChange={(e) => {
                        const newExps = [...uniData.workExperiences];
                        newExps[index] = { ...exp, position: e.target.value };
                        setUniData({ ...uniData, workExperiences: newExps });
                      }}
                      placeholder="Position"
                      className="flex-1"
                    />
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeWorkExperience(index)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      type="date"
                      value={exp.startDate}
                      onChange={(e) => {
                        const newExps = [...uniData.workExperiences];
                        newExps[index] = { ...exp, startDate: e.target.value };
                        setUniData({ ...uniData, workExperiences: newExps });
                      }}
                    />
                    <Input
                      type="date"
                      value={exp.endDate}
                      onChange={(e) => {
                        const newExps = [...uniData.workExperiences];
                        newExps[index] = { ...exp, endDate: e.target.value };
                        setUniData({ ...uniData, workExperiences: newExps });
                      }}
                    />
                  </div>
                  <Textarea
                    value={exp.description}
                    onChange={(e) => {
                      const newExps = [...uniData.workExperiences];
                      newExps[index] = { ...exp, description: e.target.value };
                      setUniData({ ...uniData, workExperiences: newExps });
                    }}
                    placeholder="Description of responsibilities"
                    rows={2}
                  />
                </div>
              ))}
              {uniData.workExperiences.length === 0 && (
                <p className="text-sm text-muted-foreground">No work experiences added</p>
              )}
            </div>

            {/* Projects/Extracurriculars (Optional) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-base font-medium">Projects / Extracurriculars (Optional)</Label>
                <Button type="button" variant="outline" size="sm" onClick={addProject}>
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
              </div>
              {uniData.projects.map((proj, index) => (
                <div key={index} className="border rounded-lg p-3 mb-2 space-y-3">
                  <div className="flex justify-between items-start gap-2">
                    <Input
                      value={proj.organization}
                      onChange={(e) => {
                        const newProjs = [...uniData.projects];
                        newProjs[index] = { ...proj, organization: e.target.value };
                        setUniData({ ...uniData, projects: newProjs });
                      }}
                      placeholder="Organization/Project name"
                      className="flex-1"
                    />
                    <Input
                      value={proj.role}
                      onChange={(e) => {
                        const newProjs = [...uniData.projects];
                        newProjs[index] = { ...proj, role: e.target.value };
                        setUniData({ ...uniData, projects: newProjs });
                      }}
                      placeholder="Your role"
                      className="flex-1"
                    />
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeProject(index)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      type="date"
                      value={proj.startDate}
                      onChange={(e) => {
                        const newProjs = [...uniData.projects];
                        newProjs[index] = { ...proj, startDate: e.target.value };
                        setUniData({ ...uniData, projects: newProjs });
                      }}
                    />
                    <Input
                      type="date"
                      value={proj.endDate}
                      onChange={(e) => {
                        const newProjs = [...uniData.projects];
                        newProjs[index] = { ...proj, endDate: e.target.value };
                        setUniData({ ...uniData, projects: newProjs });
                      }}
                    />
                  </div>
                  <Textarea
                    value={proj.description}
                    onChange={(e) => {
                      const newProjs = [...uniData.projects];
                      newProjs[index] = { ...proj, description: e.target.value };
                      setUniData({ ...uniData, projects: newProjs });
                    }}
                    placeholder="Description of activities"
                    rows={2}
                  />
                </div>
              ))}
              {uniData.projects.length === 0 && (
                <p className="text-sm text-muted-foreground">No projects added</p>
              )}
            </div>

            <Separator />

            {/* Preferred Cities (Optional) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Preferred City to Work (Optional)</Label>
                <Input
                  value={uniData.preferredCities.primary}
                  onChange={(e) => setUniData({ ...uniData, preferredCities: { ...uniData.preferredCities, primary: e.target.value } })}
                  placeholder="e.g., Milan"
                />
              </div>
              <div>
                <Label>Second Preferred City (Optional)</Label>
                <Input
                  value={uniData.preferredCities.secondary || ""}
                  onChange={(e) => setUniData({ ...uniData, preferredCities: { ...uniData.preferredCities, secondary: e.target.value } })}
                  placeholder="e.g., London"
                />
              </div>
            </div>

            {/* Languages (Optional) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-base font-medium">Languages (Optional)</Label>
                <Button type="button" variant="outline" size="sm" onClick={() => addLanguage("uni")}>
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
              </div>
              {uniData.languages.map((lang, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <Input
                    value={lang.language}
                    onChange={(e) => {
                      const newLangs = [...uniData.languages];
                      newLangs[index] = { ...lang, language: e.target.value };
                      setUniData({ ...uniData, languages: newLangs });
                    }}
                    placeholder="Language"
                    className="flex-1"
                  />
                  <Select
                    value={lang.level}
                    onValueChange={(value) => {
                      const newLangs = [...uniData.languages];
                      newLangs[index] = { ...lang, level: value };
                      setUniData({ ...uniData, languages: newLangs });
                    }}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Level" />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGE_LEVELS.map((level) => (
                        <SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {uniData.languages.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeLanguage("uni", index)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {/* Three Adjectives */}
            <div>
              <Label>Three adjectives that describe you (Optional)</Label>
              <Input
                value={uniData.threeAdjectives}
                onChange={(e) => setUniData({ ...uniData, threeAdjectives: e.target.value })}
                placeholder="e.g., Ambitious, Creative, Determined"
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BriefOverviewForm;
