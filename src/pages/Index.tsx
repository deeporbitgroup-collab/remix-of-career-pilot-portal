import { useState } from "react";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import AboutSection from "@/components/AboutSection";
import ServicesSection from "@/components/ServicesSection";
import ExpertsSection from "@/components/ExpertsSection";
import PartnershipsSection from "@/components/PartnershipsSection";
import ValueDriversSection from "@/components/ValueDriversSection";
import WhyChooseUsSection from "@/components/WhyChooseUsSection";
import ContactSection from "@/components/ContactSection";
import Footer from "@/components/Footer";
import BookingPopup from "@/components/BookingPopup";
import PathwaysOverlay from "@/components/PathwaysOverlay";

const Index = () => {
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [isPathwaysOpen, setIsPathwaysOpen] = useState(false);

  return (
    <div className="min-h-screen">
      <Navbar 
        onOpenBooking={() => setIsBookingOpen(true)} 
        onOpenPathways={() => setIsPathwaysOpen(true)}
      />
      <HeroSection />
      <div id="about">
        <AboutSection />
      </div>
      <div id="services">
        <ServicesSection />
      </div>
      <div id="experts">
        <ExpertsSection />
      </div>
      <div id="partnerships" className="scroll-mt-20">
        <PartnershipsSection />
      </div>
      {/* Mobile redesign: these sections are desktop-only ("Fly higher with us",
          "Value drivers", and the standalone "Book free check-in" — the check-in
          lives in the hero on mobile). Desktop is unchanged. */}
      <div className="hidden md:block">
        <WhyChooseUsSection />
      </div>
      <div id="value-drivers" className="hidden md:block">
        <ValueDriversSection />
      </div>
      <div id="contact" className="hidden md:block">
        <ContactSection
          isBookingOpen={isBookingOpen}
          setIsBookingOpen={setIsBookingOpen}
        />
      </div>
      {/* Discreet hint — mobile only */}
      <p className="md:hidden px-4 py-4 text-center text-[12px] text-muted-foreground">
        For the full experience, the team recommends viewing on desktop.
      </p>
      <Footer />
      <BookingPopup 
        isOpen={isBookingOpen} 
        onClose={() => setIsBookingOpen(false)} 
      />
      <PathwaysOverlay 
        isOpen={isPathwaysOpen} 
        onClose={() => setIsPathwaysOpen(false)} 
      />
    </div>
  );
};

export default Index;
