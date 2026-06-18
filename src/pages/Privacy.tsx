import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

const Privacy = () => {
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
              Privacy Policy & GDPR
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none space-y-6">
            <section>
              <h2 className="text-xl font-semibold text-primary mb-3">1. Introduction</h2>
              <p className="text-steel-gray leading-relaxed">
                Career Pilot respects your privacy and is committed to protecting your personal data.
                This privacy policy describes how we collect, use, and protect your information
                in accordance with the European Union's General Data Protection Regulation (GDPR).
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-primary mb-3">2. Data Controller</h2>
              <p className="text-steel-gray leading-relaxed">
                The controller of personal data is Career Pilot.
                For any privacy-related questions, you can contact us at:
                <a href="mailto:Careerpilot2025@gmail.com" className="text-primary hover:underline ml-1">
                  Careerpilot2025@gmail.com
                </a>
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-primary mb-3">3. Data Collected</h2>
              <p className="text-steel-gray leading-relaxed mb-3">
                We collect the following categories of personal data:
              </p>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-primary mb-2">For Students:</h3>
                  <ul className="list-disc pl-6 text-steel-gray space-y-1">
                    <li>Personal details (first name, last name, email, phone)</li>
                    <li>CV and cover letter</li>
                    <li>Profile photo</li>
                    <li>LinkedIn profile (if provided)</li>
                    <li>Professional preferences (sectors, company type, compensation)</li>
                    <li>Payment data (managed through secure payment systems)</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-primary mb-2">For Companies:</h3>
                  <ul className="list-disc pl-6 text-steel-gray space-y-1">
                    <li>Company name</li>
                    <li>Sector and size</li>
                    <li>Contact email</li>
                    <li>Company LinkedIn profile (if provided)</li>
                    <li>Company logo</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-primary mb-3">4. Purposes of Processing</h2>
              <p className="text-steel-gray leading-relaxed mb-3">
                Your personal data is processed for the following purposes:
              </p>
              <ul className="list-disc pl-6 text-steel-gray space-y-2">
                <li>Provide the consulting and intermediation services requested</li>
                <li>Manage registration and access to the Talent Pool</li>
                <li>Facilitate the connection between students and companies</li>
                <li>Process payments</li>
                <li>Send communications related to the services</li>
                <li>Improve the quality of our services</li>
                <li>Comply with legal and tax obligations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-primary mb-3">5. Legal Basis for Processing</h2>
              <p className="text-steel-gray leading-relaxed mb-3">
                The processing of your personal data is based on:
              </p>
              <ul className="list-disc pl-6 text-steel-gray space-y-2">
                <li><strong>Performance of the contract:</strong> to provide the requested services</li>
                <li><strong>Consent:</strong> for purposes that require your explicit consent</li>
                <li><strong>Legal obligation:</strong> to fulfill legal obligations</li>
                <li><strong>Legitimate interest:</strong> to improve our services</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-primary mb-3">6. Data Sharing</h2>
              <p className="text-steel-gray leading-relaxed mb-3">
                Your data may be shared with:
              </p>
              <ul className="list-disc pl-6 text-steel-gray space-y-2">
                <li><strong>Partner companies:</strong> only the profiles of approved students with active access to the Talent Pool are visible to registered companies</li>
                <li><strong>Service providers:</strong> for payment processing and platform hosting</li>
                <li><strong>Competent authorities:</strong> when required by law</li>
              </ul>
              <p className="text-steel-gray leading-relaxed mt-3">
                We do not sell or transfer your personal data to third parties for marketing purposes.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-primary mb-3">7. Data Retention</h2>
              <p className="text-steel-gray leading-relaxed">
                We retain your personal data for as long as necessary to provide the requested services and to fulfill legal obligations.
                When no longer needed, the data is securely deleted or anonymized.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-primary mb-3">8. Your GDPR Rights</h2>
              <p className="text-steel-gray leading-relaxed mb-3">
                In accordance with the GDPR, you have the right to:
              </p>
              <ul className="list-disc pl-6 text-steel-gray space-y-2">
                <li><strong>Access:</strong> request a copy of your personal data</li>
                <li><strong>Rectification:</strong> correct inaccurate or incomplete data</li>
                <li><strong>Erasure:</strong> request the deletion of your data ("right to be forgotten")</li>
                <li><strong>Restriction:</strong> restrict the processing of your data in certain circumstances</li>
                <li><strong>Portability:</strong> receive your data in a structured and readable format</li>
                <li><strong>Objection:</strong> object to the processing of your data for certain purposes</li>
                <li><strong>Withdrawal of consent:</strong> withdraw consent to processing at any time</li>
              </ul>
              <p className="text-steel-gray leading-relaxed mt-3">
                To exercise these rights, contact us at:
                <a href="mailto:Careerpilot2025@gmail.com" className="text-primary hover:underline ml-1">
                  Careerpilot2025@gmail.com
                </a>
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-primary mb-3">9. Data Security</h2>
              <p className="text-steel-gray leading-relaxed">
                We implement appropriate technical and organizational security measures to protect your personal data
                from unauthorized access, loss, destruction, or alteration. These include:
              </p>
              <ul className="list-disc pl-6 text-steel-gray space-y-2">
                <li>Encryption of data in transit and at rest</li>
                <li>Role-based access control</li>
                <li>Regular security audits</li>
                <li>Staff training on data protection</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-primary mb-3">10. Cookies and Tracking Technologies</h2>
              <p className="text-steel-gray leading-relaxed">
                We use cookies and similar technologies to improve your experience on the platform,
                analyze usage, and provide personalized features. You can manage your cookie preferences
                through your browser settings.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-primary mb-3">11. Data Transfer</h2>
              <p className="text-steel-gray leading-relaxed">
                Your personal data is stored within the European Union.
                In the event of a transfer to third countries, we ensure that appropriate safeguards are applied
                in accordance with the GDPR.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-primary mb-3">12. Minors</h2>
              <p className="text-steel-gray leading-relaxed">
                Our services are not intended for minors under 16 years of age. We do not knowingly collect personal data
                from minors under 16 without the consent of parents or legal guardians.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-primary mb-3">13. Changes to the Privacy Policy</h2>
              <p className="text-steel-gray leading-relaxed">
                We may update this Privacy Policy periodically. We will inform you of any substantial changes
                via email or through a notice on the platform. The updated version will always be available on this page.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-primary mb-3">14. Complaints</h2>
              <p className="text-steel-gray leading-relaxed">
                If you believe that your data protection rights have been violated,
                you have the right to file a complaint with the competent supervisory authority (the Italian Data Protection Authority).
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-primary mb-3">15. Contact</h2>
              <p className="text-steel-gray leading-relaxed">
                For any questions or requests regarding this Privacy Policy or the processing of your personal data,
                you can contact us at:
                <a href="mailto:Careerpilot2025@gmail.com" className="text-primary hover:underline ml-1">
                  Careerpilot2025@gmail.com
                </a>
              </p>
            </section>

            <div className="mt-8 pt-6 border-t border-gray-200">
              <p className="text-sm text-steel-gray text-center">
                Last updated: October 2025
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Privacy;
