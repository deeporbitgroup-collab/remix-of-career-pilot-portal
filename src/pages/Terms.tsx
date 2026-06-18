import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

const Terms = () => {
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
              Terms and Conditions
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none space-y-6">
            <section>
              <h2 className="text-xl font-semibold text-primary mb-3">1. Introduction</h2>
              <p className="text-steel-gray leading-relaxed">
                Welcome to Career Pilot. By using our services, you agree to be bound by these Terms and Conditions.
                Please read them carefully before using the platform.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-primary mb-3">2. Services Offered</h2>
              <p className="text-steel-gray leading-relaxed">
                Career Pilot offers consulting services for students and intermediation between students and companies through the Talent Pool.
                Our services include:
              </p>
              <ul className="list-disc pl-6 text-steel-gray space-y-2">
                <li>Personalized consulting for academic and professional pathways</li>
                <li>Access to the Talent Pool for verified students</li>
                <li>Direct connection with partner companies</li>
                <li>Support in the search for internship and job opportunities</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-primary mb-3">3. Registration and Account</h2>
              <p className="text-steel-gray leading-relaxed">
                To use certain platform services, you need to create an account. You agree to:
              </p>
              <ul className="list-disc pl-6 text-steel-gray space-y-2">
                <li>Provide accurate, complete, and up-to-date information</li>
                <li>Maintain the security of your account password</li>
                <li>Notify us immediately in case of unauthorized use of your account</li>
                <li>Be responsible for all activities that occur through your account</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-primary mb-3">4. Talent Pool - Students</h2>
              <p className="text-steel-gray leading-relaxed">
                Access to the Talent Pool for students is subject to the following conditions:
              </p>
              <ul className="list-disc pl-6 text-steel-gray space-y-2">
                <li>Approval of registration by Career Pilot</li>
                <li>Payment of a monthly subscription of €5</li>
                <li>If selected by a company, payment of €85 (including the subscription months already paid)</li>
                <li>Maintaining an up-to-date and professional profile</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-primary mb-3">5. Talent Pool - Companies</h2>
              <p className="text-steel-gray leading-relaxed">
                Access to the Talent Pool for companies is free and subject to the following conditions:
              </p>
              <ul className="list-disc pl-6 text-steel-gray space-y-2">
                <li>Registration and approval by Career Pilot</li>
                <li>Responsible use of students' information</li>
                <li>Compliance with employment and internship regulations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-primary mb-3">6. Payments and Refunds</h2>
              <p className="text-steel-gray leading-relaxed">
                All payments are processed securely. Payments for the monthly Talent Pool subscription are non-refundable.
                If selected by a company, the final payment of €85 includes the subscriptions already paid.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-primary mb-3">7. Intellectual Property</h2>
              <p className="text-steel-gray leading-relaxed">
                All content on the Career Pilot platform, including text, graphics, logos, icons, and software,
                is the property of Career Pilot or its content providers and is protected by Italian and international
                copyright laws.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-primary mb-3">8. Limitation of Liability</h2>
              <p className="text-steel-gray leading-relaxed">
                Career Pilot is committed to providing high-quality services; however:
              </p>
              <ul className="list-disc pl-6 text-steel-gray space-y-2">
                <li>We do not guarantee success in the search for job or internship opportunities</li>
                <li>We are not responsible for any damages arising from the use of the platform</li>
                <li>We are not responsible for the conduct of registered students or companies</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-primary mb-3">9. Changes to the Terms</h2>
              <p className="text-steel-gray leading-relaxed">
                We reserve the right to modify these Terms and Conditions at any time.
                Changes will be effective immediately upon their publication on the platform.
                By continuing to use our services after such changes, you accept the new terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-primary mb-3">10. Applicable Law</h2>
              <p className="text-steel-gray leading-relaxed">
                These Terms and Conditions are governed by Italian law. Any dispute will be subject
                to the exclusive jurisdiction of the Italian courts.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-primary mb-3">11. Contact</h2>
              <p className="text-steel-gray leading-relaxed">
                For any questions regarding these Terms and Conditions, you can contact us at:
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

export default Terms;
