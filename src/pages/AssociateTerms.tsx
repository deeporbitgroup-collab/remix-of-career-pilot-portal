import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

const AssociateTerms = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-cloud-white to-runway-gray py-12 px-4">
      <div className="container max-w-4xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-3xl text-center text-primary">
              Associate Agreement – Terms and Conditions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px] pr-4">
              <div className="prose prose-sm max-w-none space-y-6">
                <section>
                  <h2 className="text-xl font-semibold text-primary mb-3">Introduction</h2>
                  <p className="text-steel-gray leading-relaxed">
                    Career Pilot is a digital platform providing university and career guidance services, connecting students with selected Associates (students or professionals operating in the relevant university or professional sectors).
                  </p>
                  <p className="text-steel-gray leading-relaxed">
                    Career Pilot offers students an initial free call to assess whether assistance can be provided.
                  </p>
                  <p className="text-steel-gray leading-relaxed">
                    If the student is deemed eligible, Career Pilot presents a list of available Associates whose profiles are consistent with the student's chosen university or field of interest. The student is free to choose the Associate.
                  </p>
                  <p className="text-steel-gray leading-relaxed">
                    If a selected Associate is unavailable, the student's request may be assigned to another Associate with a consistent profile, without any restrictions.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-primary mb-3">The Parties</h2>
                  <p className="text-steel-gray leading-relaxed">
                    <strong>Career Pilot</strong> (hereinafter the "Company" or the "Platform"), a digital guidance platform operating online.
                  </p>
                  <p className="text-steel-gray leading-relaxed">
                    <strong>The Associate</strong>, being the individual who registers on the Platform by autonomously entering his/her personal and professional information and accepting these Terms and Conditions prior to completing the registration process.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-primary mb-3">Formation of the Agreement</h2>
                  <p className="text-steel-gray leading-relaxed">
                    This Agreement is concluded electronically.
                  </p>
                  <p className="text-steel-gray leading-relaxed">
                    By registering on the Platform and accessing the Associate's personal area, the Associate declares that:
                  </p>
                  <ul className="list-disc pl-6 text-steel-gray space-y-1 mb-2">
                    <li>all information provided during registration is accurate, complete, and truthful;</li>
                    <li>he/she has read, understood, and fully accepted these Terms and Conditions.</li>
                  </ul>
                  <p className="text-steel-gray leading-relaxed">
                    Electronic acceptance through the registration process shall constitute full and binding acceptance of this Agreement.
                  </p>
                </section>

                <section className="mt-6">
                  <h2 className="text-2xl font-bold text-primary mb-4">SECTION ONE</h2>
                  
                  <h3 className="text-lg font-semibold text-primary mb-3">Art. 1 – Purpose and Role of the Associate</h3>
                  <p className="text-steel-gray leading-relaxed mb-2">
                    <strong>1.1.</strong> The Associate collaborates with Career Pilot by providing consultancy and support services to students referred through the Platform.
                  </p>
                  <p className="text-steel-gray leading-relaxed mb-2">
                    <strong>1.2.</strong> In addition to sharing his/her own experience, the Associate may be requested to carry out specific activities for students, including, but not limited to:
                  </p>
                  <ul className="list-disc pl-6 text-steel-gray space-y-2 mb-4">
                    <li>personalized timelines with deadlines, admission tests, applications, scholarships, and preparation plans;</li>
                    <li>comparative analyses between universities (including career opportunities, rankings, and non-public insights);</li>
                    <li>in-depth presentations of a single university (courses, campus environment, internships, teaching methods);</li>
                    <li>industry and career guidance with sector-specific insights, requirements, skills, and practical advice;</li>
                    <li>job placement support: the Company may share a student's CV with the Associate, who may attempt, through his/her own network, to facilitate internship or job opportunities. An "opportunity" shall be understood as an invitation to a job interview or assessment by a company.</li>
                  </ul>
                  <p className="text-steel-gray leading-relaxed mb-4">
                    <strong>1.3.</strong> If the Associate is unavailable or unable to provide the requested service, the Company may assign the request to another Associate with a profile consistent with the student's needs.
                  </p>

                  <h3 className="text-lg font-semibold text-primary mb-3">Art. 2 – Compensation</h3>
                  <p className="text-steel-gray leading-relaxed mb-2">
                    <strong>2.1.</strong> The compensation due to the Associate for each service is determined and displayed exclusively within the Associate's personal area on the Platform.
                  </p>
                  <p className="text-steel-gray leading-relaxed mb-2">
                    <strong>2.2.</strong> The personal area specifies:
                  </p>
                  <ul className="list-disc pl-6 text-steel-gray space-y-1 mb-2">
                    <li>the price paid by the student for each service;</li>
                    <li>the share of such price allocated to the Associate.</li>
                  </ul>
                  <p className="text-steel-gray leading-relaxed mb-2">
                    <strong>2.3.</strong> In addition to standard compensation, the Company may, at its sole discretion, grant bonuses to Associates who demonstrate particular commitment, assessed on the basis of:
                  </p>
                  <ul className="list-disc pl-6 text-steel-gray space-y-1 mb-2">
                    <li>a significant number of sessions concluded with positive student feedback;</li>
                    <li>the ability to bring new clients to the Platform.</li>
                  </ul>
                  <p className="text-steel-gray leading-relaxed mb-2">
                    <strong>2.4.</strong> The amount, criteria, and payment method of any bonus shall be determined solely by the Company and communicated through the Platform.
                  </p>
                  <p className="text-steel-gray leading-relaxed mb-4">
                    <strong>2.5.</strong> Compensation shall be paid to the Associate within ten (10) days from the completion of the service, subject to the technical time required for the Company to receive payment from the student.
                  </p>

                  <h3 className="text-lg font-semibold text-primary mb-3">Art. 3 – Non-Compete Obligation</h3>
                  <p className="text-steel-gray leading-relaxed mb-4">
                    <strong>3.1.</strong> For the entire duration of this Agreement and for six (6) months following its termination, the Associate undertakes not to engage, directly or indirectly, in activities competing with the Company within the territory of the Italian State.
                  </p>

                  <h3 className="text-lg font-semibold text-primary mb-3">Art. 3-bis – Non-Diversion and Non-Solicitation of Clients; Penalty Clause</h3>
                  <p className="text-steel-gray leading-relaxed mb-2">
                    For the purposes of this Article, <strong>"Clients"</strong> shall include:
                  </p>
                  <ul className="list-disc pl-6 text-steel-gray space-y-1 mb-2">
                    <li>(i) students who have contacted or been referred by the Company;</li>
                    <li>(ii) leads generated by the Company through its channels;</li>
                    <li>(iii) active or potential clients included in the Company's databases during the term of this Agreement.</li>
                  </ul>
                  <p className="text-steel-gray leading-relaxed mb-2">
                    The Associate undertakes, for the entire duration of this Agreement and for twelve (12) months following its termination, not to:
                  </p>
                  <ul className="list-disc pl-6 text-steel-gray space-y-1 mb-2">
                    <li>divert, solicit, or accept Clients outside the Platform;</li>
                    <li>manage paid services outside the Company's systems and procedures;</li>
                    <li>request or accept direct payments from Clients;</li>
                    <li>move communications or appointments to private channels for extra-contractual purposes.</li>
                  </ul>
                  <p className="text-steel-gray leading-relaxed mb-2">
                    By way of example, the following constitute a breach:
                  </p>
                  <ul className="list-disc pl-6 text-steel-gray space-y-1 mb-2">
                    <li>(a) offering or providing services to Clients outside the Platform;</li>
                    <li>(b) accepting direct payments;</li>
                    <li>(c) using confidential information for competitive purposes.</li>
                  </ul>
                  <p className="text-steel-gray leading-relaxed mb-2">
                    <strong>Penalty Clause (Art. 1382 Italian Civil Code).</strong>
                  </p>
                  <p className="text-steel-gray leading-relaxed mb-4">
                    In the event of a breach of this Article, the Associate shall be required to pay the Company a penalty of €1,000 (one thousand euros) for each Client unlawfully diverted and managed outside the Platform, without prejudice to the Company's right to claim compensation for any additional damages suffered. The penalty shall become due upon written request by the Company.
                  </p>

                  <h3 className="text-lg font-semibold text-primary mb-3">Art. 3-ter – Operational Commitments and Express Termination Clause</h3>
                  <p className="text-steel-gray leading-relaxed mb-2">
                    The Associate undertakes to:
                  </p>
                  <ul className="list-disc pl-6 text-steel-gray space-y-1 mb-2">
                    <li>(a) attend all scheduled appointments with Clients and the Company;</li>
                    <li>(b) provide notice of cancellations or rescheduling with at least 24 hours' advance notice;</li>
                    <li>(c) maintain professional standards of conduct.</li>
                  </ul>
                  <p className="text-steel-gray leading-relaxed mb-2">
                    No-shows, late cancellations, or repeated delays that compromise the service shall constitute a breach.
                  </p>
                  <p className="text-steel-gray leading-relaxed mb-2">
                    <strong>Express Termination Clause (Art. 1456 Italian Civil Code).</strong>
                  </p>
                  <p className="text-steel-gray leading-relaxed mb-2">
                    The Company may terminate this Agreement with immediate effect in the event of:
                  </p>
                  <ul className="list-disc pl-6 text-steel-gray space-y-1 mb-2">
                    <li>(a) repeated no-shows or late cancellations;</li>
                    <li>(b) substantiated complaints or negative conduct toward Clients;</li>
                    <li>(c) breach of confidentiality obligations;</li>
                    <li>(d) breach of Article 3-bis, even if occurring once.</li>
                  </ul>
                  <p className="text-steel-gray leading-relaxed mb-4">
                    The Company may temporarily suspend the Associate from the Platform pending verification of alleged breaches.
                  </p>

                  <h3 className="text-lg font-semibold text-primary mb-3">Art. 4 – Confidentiality</h3>
                  <p className="text-steel-gray leading-relaxed mb-4">
                    <strong>4.1.</strong> The Associate undertakes to keep all confidential information relating to the Company strictly confidential, except as required by law.
                  </p>

                  <h3 className="text-lg font-semibold text-primary mb-3">Art. 5 – Term</h3>
                  <p className="text-steel-gray leading-relaxed mb-4">
                    <strong>5.1.</strong> This Agreement shall enter into force upon electronic acceptance and shall remain effective for as long as the Associate maintains a relationship with the Platform.
                  </p>

                  <h3 className="text-lg font-semibold text-primary mb-3">Art. 6 – Governing Law and Jurisdiction</h3>
                  <p className="text-steel-gray leading-relaxed mb-2">
                    <strong>6.1.</strong> This Agreement shall be governed by Italian law.
                  </p>
                  <p className="text-steel-gray leading-relaxed mb-4">
                    <strong>6.2.</strong> Any dispute arising from or related to this Agreement shall fall under the exclusive jurisdiction of the Court of Milan.
                  </p>

                  <h3 className="text-lg font-semibold text-primary mb-3">Art. 7 – Final Provisions</h3>
                  <p className="text-steel-gray leading-relaxed mb-2">
                    <strong>7.1.</strong> The Introduction and Recitals form an integral part of this Agreement.
                  </p>
                  <p className="text-steel-gray leading-relaxed mb-4">
                    <strong>7.2.</strong> Any amendment must be made in writing or through updated Terms and Conditions published on the Platform.
                  </p>
                </section>

                <div className="mt-8 pt-6 border-t border-gray-200">
                  <p className="text-sm text-steel-gray text-center italic">
                    Read, confirmed, and signed.
                  </p>
                  <p className="text-sm text-steel-gray text-center mt-2">
                    Last updated: January 2025
                  </p>
                </div>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AssociateTerms;
