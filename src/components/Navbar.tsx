import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Menu, X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
interface NavbarProps {
  onOpenBooking: () => void;
  onOpenPathways?: () => void;
}
const Navbar = ({
  onOpenBooking,
  onOpenPathways
}: NavbarProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const {
    language,
    toggleLanguage
  } = useLanguage();
  const navItems = [{
    label: language === 'it' ? "Chi Siamo" : "About Us",
    href: "/#chi-siamo",
    sectionId: "about"
  }, {
    label: language === 'it' ? "Servizi" : "Services",
    href: "/#servizi",
    sectionId: "services"
  }, {
    label: language === 'it' ? "Esperti" : "Experts",
    href: "/#esperti",
    sectionId: "experts"
  }, {
    label: "Partnerships",
    href: "/#partnership",
    sectionId: "partnerships"
  }, {
    label: language === 'it' ? "Contatti" : "Contacts",
    href: "/#contatti",
    sectionId: "contact"
  }];

  const handleNavClick = (item: typeof navItems[0]) => {
    setIsOpen(false);
    if (item.href === "/talent-pool") {
      navigate("/talent-pool");
    } else if (item.sectionId) {
      // Se siamo già sulla home page, fai solo smooth scroll
      if (location.pathname === "/") {
        const element = document.getElementById(item.sectionId);
        if (element) {
          element.scrollIntoView({
            behavior: "smooth",
            block: "start"
          });
          // Update URL hash without navigation
          window.history.pushState(null, "", `#${item.sectionId}`);
        }
      } else {
        // Se siamo su un'altra pagina, naviga alla home con l'hash
        navigate(`/#${item.sectionId}`);
      }
    }
  };

  // Handle hash navigation on page load or route change
  useEffect(() => {
    if (location.pathname === "/" && location.hash) {
      const sectionId = location.hash.replace("#", "");
      // Map URL hash to actual section IDs
      const hashToSectionMap: Record<string, string> = {
        "chi-siamo": "about",
        "servizi": "services",
        "esperti": "experts",
        "partnership": "partnerships",
        "why-choose-us": "why-choose-us",
        "contatti": "contact"
      };
      const targetId = hashToSectionMap[sectionId] || sectionId;
      setTimeout(() => {
        const element = document.getElementById(targetId);
        if (element) {
          element.scrollIntoView({
            behavior: "smooth",
            block: "start"
          });
        }
      }, 100);
    }
  }, [location]);
  return <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm shadow-card-custom">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-[56px] md:h-16">
          {/* Brand (text-only, shifted left) */}
          <button onClick={() => navigate("/")} className="flex items-center cursor-pointer hover:opacity-90 transition-opacity -ml-1 md:-ml-2">
            <span className="text-[18px] md:text-2xl font-bold text-primary tracking-tight">Career Pilot</span>
          </button>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6 lg:space-x-10">
            {navItems.map(item => <button key={item.label} onClick={() => handleNavClick(item)} className={`text-steel-gray hover:text-primary transition-colors duration-300 font-medium flex items-center gap-2 ${location.pathname === "/" && location.hash === `#${item.sectionId}` ? "text-primary" : ""}`}>
                {item.label}
              </button>)}
          </div>

          {/* CTA Button */}
          <div className="hidden md:flex items-center space-x-3 lg:space-x-4">
            <button
              onClick={() => navigate('/auth')}
              className="text-sm font-semibold text-sky-blue hover:text-primary transition-colors duration-300"
            >
              Crew Portal
            </button>
            <Button className="bg-primary text-primary-foreground hover:opacity-90 shadow-aviation transition-all duration-300 transform hover:scale-105" onClick={() => navigate('/client-portal/auth')}>
              My Flight Plan
            </Button>
          </div>

          {/* Mobile Language Toggle and Menu Button */}
          <div className="md:hidden flex items-center space-x-2">
            {/* Mobile menu button */}
            <button className="p-2 min-w-[40px] min-h-[40px] flex items-center justify-center" onClick={() => setIsOpen(!isOpen)}>
              {isOpen ? <X className="h-6 w-6 text-primary" /> : <Menu className="h-6 w-6 text-primary" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isOpen && <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-0.5 bg-white shadow-lg rounded-lg mt-2">
              {navItems.map(item => <button key={item.label} onClick={() => handleNavClick(item)} className={`w-full flex items-center justify-between px-3 py-3 min-h-[44px] text-[16px] text-steel-gray hover:text-primary hover:bg-runway-gray rounded-md transition-colors duration-300 text-left ${location.pathname === "/" && location.hash === `#${item.sectionId}` ? "text-primary bg-runway-gray/50" : ""}`}>
                  <span>{item.label}</span>
                </button>)}
              
              <div className="px-3 py-2 mt-2 space-y-2">
                <Button
                  variant="outline"
                  className="w-full min-h-[48px] border-sky-blue text-sky-blue hover:bg-sky-blue/10 text-[16px]"
                  onClick={() => {
                    setIsOpen(false);
                    navigate('/auth');
                  }}
                >
                  Crew Portal
                </Button>
                <Button className="w-full min-h-[48px] bg-primary text-primary-foreground hover:opacity-90 text-[16px]" onClick={() => {
              setIsOpen(false);
              navigate('/client-portal/auth');
            }}>
                  My Flight Plan
                </Button>
              </div>
            </div>
          </div>}
      </div>
    </nav>;
};
export default Navbar;