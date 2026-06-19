import { useState } from "react";
import { Plane, Mail, Instagram, Linkedin, Send } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { translations } from "@/utils/translations";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import deepOrbitLogo from "@/assets/deeporbit-group.jpg";
import qoraAiLogo from "@/assets/qora-ai-logo.png";

const Footer = () => {
  const { language } = useLanguage();
  const t = translations[language];

  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [subscribing, setSubscribing] = useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = newsletterEmail.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      toast.error(language === 'it' ? 'Inserisci un indirizzo email valido.' : 'Please enter a valid email address.');
      return;
    }
    setSubscribing(true);
    try {
      const { error } = await supabase.functions.invoke('newsletter-subscribe', { body: { email } });
      if (error) throw error;
      toast.success(language === 'it' ? 'Iscrizione completata! Grazie.' : "You're subscribed! Thank you.");
      setNewsletterEmail("");
    } catch (err) {
      toast.error(language === 'it' ? 'Iscrizione non riuscita. Riprova.' : 'Subscription failed. Please try again.');
    } finally {
      setSubscribing(false);
    }
  };

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

            {/* Newsletter signup */}
            <div className="max-w-md">
              <h3 className="text-base font-semibold mb-1">
                {language === 'it' ? 'Iscriviti alla nostra newsletter' : 'Subscribe to our newsletter'}
              </h3>
              <p className="text-gray-300 text-sm mb-3">
                {language === 'it'
                  ? 'Opportunità, scadenze e aggiornamenti — direttamente nella tua inbox.'
                  : 'Opportunities, deadlines and updates — straight to your inbox.'}
              </p>
              <form onSubmit={handleSubscribe} className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="email"
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  placeholder={language === 'it' ? 'La tua email' : 'Your email'}
                  className="flex-1 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-gray-400 focus:border-sky-blue focus:outline-none"
                  aria-label={language === 'it' ? 'Email per la newsletter' : 'Newsletter email'}
                />
                <button
                  type="submit"
                  disabled={subscribing}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-primary transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  <Send className="h-4 w-4" />
                  {subscribing
                    ? (language === 'it' ? 'Invio...' : 'Sending...')
                    : (language === 'it' ? 'Iscriviti' : 'Subscribe')}
                </button>
              </form>
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