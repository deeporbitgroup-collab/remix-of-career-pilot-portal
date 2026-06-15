import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Info, Rocket, Building2, Mail, Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import BookingPopup from "@/components/BookingPopup";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const TalentPool = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBookingOpen, setIsBookingOpen] = useState(false);

  // Scroll animations
  const titleAnimation = useScrollAnimation({ animationClass: 'animate-fade-up', delay: 100 });
  const descriptionAnimation = useScrollAnimation({ animationClass: 'animate-fade-up', delay: 200 });
  const cardAnimation = useScrollAnimation({ animationClass: 'animate-zoom-in', delay: 300 });
  const ctaAnimation = useScrollAnimation({ animationClass: 'animate-scale-up', delay: 400 });

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleAccessRequest = () => {
    const subject = encodeURIComponent("Talent Pool Access Request");
    const body = encodeURIComponent(
      `Hello,\n\nI would like to request early access to the Talent Pool service.\n\nFirst Name: [insert first name]\nLast Name: [insert last name]\nEmail: [insert email]\n\nThank you`
    );
    window.location.href = `mailto:Careerpilot2025@gmail.com?subject=${subject}&body=${body}`;
    setIsModalOpen(false);
  };

  const handleCompanyContact = () => {
    const subject = encodeURIComponent("Company Partnership Request - Talent Pool");
    const body = encodeURIComponent(
      `Hello,\n\nWe are interested in becoming a partner company to access the Talent Pool.\n\nCompany: [company name]\nContact Person: [contact name]\nEmail: [company email]\nPhone: [phone]\n\nWe would like to receive more information about the service.\n\nBest regards`
    );
    window.location.href = `mailto:Careerpilot2025@gmail.com?subject=${subject}&body=${body}`;
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Navbar onOpenBooking={() => setIsBookingOpen(true)} />

      <div className="container mx-auto px-4 pt-20 pb-12">
        <div className="max-w-4xl mx-auto">
          {/* Expanding Partnerships Banner */}
          <div className="mb-6 bg-gradient-to-r from-sky-blue/15 via-primary/10 to-sky-blue/15 border-2 border-primary/30 rounded-xl p-4 shadow-md animate-fade-in">
            <div className="flex items-start sm:items-center gap-3 justify-center text-center sm:text-left">
              <Rocket className="h-5 w-5 md:h-6 md:w-6 text-primary flex-shrink-0 mt-0.5 sm:mt-0" />
              <p className="text-sm md:text-base text-primary font-semibold">
                We are expanding our company partnerships to bring you greater opportunities — early access opening soon. Stay tuned!
              </p>
            </div>
          </div>

          {/* Header Section */}
          <div ref={titleAnimation.ref} className={`text-center mb-8 ${titleAnimation.className}`}>
            <h1 className="text-4xl lg:text-5xl font-bold text-primary mb-4">
              Talent Pool – Coming Soon 🚀
            </h1>

            <p ref={descriptionAnimation.ref} className={`text-xl lg:text-2xl text-steel-gray mb-6 ${descriptionAnimation.className}`}>
              The platform to connect students and young professionals with partner companies (startups, boutiques, SMEs).
            </p>
          </div>

          {/* Service Description */}
          <div ref={cardAnimation.ref} className={`bg-white rounded-xl shadow-card-custom p-6 mb-6 card-hover ${cardAnimation.className}`}>
            <h2 className="text-2xl font-semibold text-primary mb-3">
              How It Works
            </h2>
            <p className="text-lg text-steel-gray leading-relaxed">
              The Talent Pool will allow students to upload their CV and cover letter, while partner companies can discover new talents. It will serve as the platform that facilitates direct connections between job applicants and partner companies, with Career Pilot acting as a qualified intermediary to ensure the perfect match between supply and demand.
            </p>
          </div>

          {/* Development Notice */}
          <div className="bg-gradient-sky/10 border border-sky-500/20 rounded-xl p-5 mb-6 animate-scale-in animation-delay-300">
            <div className="flex items-center justify-center gap-3 mb-2">
              <Info className="w-6 h-6 text-sky-600" />
              <h3 className="text-xl font-semibold text-sky-900">
                Service Under Development
              </h3>
            </div>
            <p className="text-steel-gray text-center">
              🛠️ We are working to provide you with the best possible experience. The service will be available soon!
            </p>
          </div>

          {/* Student Access Request */}
          <div ref={ctaAnimation.ref} className={`text-center mb-8 ${ctaAnimation.className}`}>
            <Button 
              onClick={() => setIsModalOpen(true)}
              className="bg-gradient-sky text-white hover:opacity-90 shadow-aviation transition-all duration-300 transform hover:scale-105 px-8 py-6 text-lg animate-fade-in animation-delay-400"
            >
              <Rocket className="w-5 h-5 mr-2" />
              Request Access
            </Button>
          </div>

          {/* Companies Section */}
          <div className="bg-white rounded-xl shadow-card-custom p-6 animate-scale-in animation-delay-500">
            <div className="flex items-center gap-3 mb-3">
              <Building2 className="w-6 h-6 text-primary" />
              <h3 className="text-2xl font-semibold text-primary">
                Are you a company interested in becoming a partner?
              </h3>
            </div>
            <p className="text-lg text-steel-gray mb-5">
              If you are a company interested in partnering with Career Pilot to access the Talent Pool, contact us:
            </p>
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <Button 
                onClick={handleCompanyContact}
                variant="outline"
                className="border-primary text-primary hover:bg-primary hover:text-white transition-all duration-300"
              >
                <Mail className="w-4 h-4 mr-2" />
                Contact the Partnerships Team
              </Button>
              <a 
                href="mailto:Careerpilot2025@gmail.com" 
                className="text-primary hover:text-primary-light transition-colors duration-300 font-medium text-lg"
              >
                Careerpilot2025@gmail.com
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Access Request Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl text-primary">
              Talent Pool Access Request
            </DialogTitle>
            <DialogDescription className="text-steel-gray pt-4">
              The service is under development. You can request early access: we will receive your First Name, Last Name and Email and contact you when it's active.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 pt-4">
            <Button 
              onClick={handleAccessRequest}
              className="bg-gradient-sky text-white hover:opacity-90 shadow-aviation transition-all duration-300"
            >
              Send Request via Email
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setIsModalOpen(false)}
              className="border-steel-gray/20 text-steel-gray hover:bg-runway-gray"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <BookingPopup 
        isOpen={isBookingOpen}
        onClose={() => setIsBookingOpen(false)}
      />
    </div>
  );
};

export default TalentPool;
