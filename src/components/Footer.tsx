import { Plane, Mail, Instagram, Linkedin } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { translations } from "@/utils/translations";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import deepOrbitLogo from "@/assets/deeporbit-group.jpg";
import qoraAiLogo from "@/assets/qora-ai-logo.png";

const Footer = () => {
  const { language } = useLanguage();
  const t = translations[language];
  
  // Scroll animations
  const footerAnimation = useScrollAnimation({ animationClass: 'animate-fade-up', delay: 100 });

  return (
    <footer className="bg-primary text-white py-8 md:py-16">
      <div ref={footerAnimation.ref} className={`container mx-auto px-4 ${footerAnimation.className}`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {/* Logo & Description */}
          <div className="md:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <Plane className="h-8 w-8" />
              <span className="text-2xl font-bold">Career Pilot</span>
            </div>
            <p className="text-gray-300 mb-6 max-w-md leading-relaxed">
              {t.footer.description}
            </p>
            <div className="flex space-x-4 mb-6">
              <a href="mailto:Careerpilot2025@gmail.com" className="hover:text-sky-blue transition-colors duration-300">
                <Mail className="h-6 w-6" />
              </a>
              <a href="https://instagram.com/careerpilot_official" className="hover:text-sky-blue transition-colors duration-300">
                <Instagram className="h-6 w-6" />
              </a>
              <a href="https://linkedin.com/company/career-pilot" className="hover:text-sky-blue transition-colors duration-300">
                <Linkedin className="h-6 w-6" />
              </a>
            </div>
          </div>

          {/* Services */}
          <div>
            <h3 className="text-xl font-bold mb-4">{t.footer.services.title}</h3>
            <ul className="space-y-2 text-gray-300">
              {t.footer.services.items.map((service, index) => (
                <li key={index}>
                  <a href="#servizi" className="hover:text-white transition-colors duration-300">
                    {service}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-xl font-bold mb-4">{t.footer.contacts.title}</h3>
            <ul className="space-y-2 text-gray-300">
              <li>
                <a href={`mailto:${t.footer.contacts.email}`} className="hover:text-white transition-colors duration-300">
                  {t.footer.contacts.email}
                </a>
              </li>
              <li>
                <a href="https://wa.me/message/NE3VRLLZ77CHE1" className="hover:text-white transition-colors duration-300" target="_blank" rel="noopener noreferrer">
                  WhatsApp: +44 7826932893
                </a>
              </li>
              <li>
                <a href="#contact" className="hover:text-white transition-colors duration-300">
                  {t.footer.contacts.bookCheckIn}
                </a>
              </li>
              <li>
                <a href="#about" className="hover:text-white transition-colors duration-300">
                  {t.footer.aboutUs.title}
                </a>
              </li>
              <li className="pt-2">
                <span className="text-gray-400 text-sm">
                  {t.footer.aboutUs.contribution}
                </span>
                <br />
                <a href="#contact" className="text-gray-300 hover:text-white transition-colors duration-300 text-sm underline">
                  {t.footer.aboutUs.learnMore}
                </a>
              </li>
              <li className="pt-1">
                <a href="#contact" className="text-gray-400 hover:text-gray-300 transition-colors duration-300 text-xs">
                  {t.footer.aboutUs.partnerships}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-600 mt-12 pt-8 flex flex-col items-center gap-6">
          {/* Ecosystem block */}
          <div className="flex flex-col items-center gap-3">
            <span className="text-gray-300 text-xs md:text-sm uppercase tracking-[0.18em]">
              {language === 'it' ? 'Parte dell\u2019ecosistema' : 'Part of the ecosystem'}
            </span>
            <a
              href="https://deeporbitgroup.com"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white rounded-lg px-5 py-3 hover:opacity-90 transition-opacity"
              aria-label="DeepOrbit Group"
            >
              <img src={deepOrbitLogo} alt="DeepOrbit Group" className="h-10 md:h-12 w-auto object-contain" />
            </a>
          </div>

          {/* Made by */}
          <a
            href="https://qoraai.it"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors text-sm group"
          >
            <span>{language === 'it' ? 'Sito realizzato da' : 'Website realized by'}</span>
            <span className="bg-white rounded-md px-2 py-1 group-hover:opacity-90 transition-opacity">
              <img src={qoraAiLogo} alt="Qora AI" className="h-5 md:h-6 w-auto object-contain" />
            </span>
          </a>

          <p className="text-gray-300 text-center text-sm">
            © 2025 Career Pilot. {language === 'it' ? 'Tutti i diritti riservati' : 'All rights reserved'}. | Made by students, for students.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;