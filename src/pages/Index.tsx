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
      <div id="partnerships">
        <PartnershipsSection />
      </div>
      <WhyChooseUsSection />
      <div id="value-drivers">
        <ValueDriversSection />
      </div>
      <div id="contact">
        <ContactSection 
          isBookingOpen={isBookingOpen} 
          setIsBookingOpen={setIsBookingOpen} 
        />
      </div>
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
