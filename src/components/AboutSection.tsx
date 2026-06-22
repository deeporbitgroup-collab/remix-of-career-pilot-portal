import { useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Linkedin, ExternalLink } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import leoneFassioImg from "@/assets/team/leone-fassio.jpeg";
import andreaImg from "@/assets/team/andrea-alivernini.jpg";
import riccardoImg from "@/assets/team/riccardo-pizzo.jpg";
import lucaImg from "@/assets/team/luca-spedo.jpg";
import enricoImg from "@/assets/team/enrico-lutea.jpg";
import elisabettaImg from "@/assets/team/elisabetta-fabris.jpeg";

type Member = {
  name: string;
  role: string;
  location: string;
  bio: string;
  image: string;
  linkedin: string;
  bw?: boolean;
};

const AboutSection = () => {
  const { language } = useLanguage();
  const titleAnimation = useScrollAnimation({ delay: 0 });
  const descAnimation = useScrollAnimation({ delay: 100 });
  const cardAnimation = useScrollAnimation({ delay: 200 });
  const marketingTitleAnim = useScrollAnimation({ delay: 0 });
  const marketingAnim = useScrollAnimation({ delay: 150 });
  const teamCard1Animation = useScrollAnimation({ delay: 0 });
  const teamCard2Animation = useScrollAnimation({ delay: 200 });
  const mobileScrollerRef = useRef<HTMLDivElement>(null);
  const [mobileIdx, setMobileIdx] = useState(0);

  const founders: Member[] = [
    {
      name: "Leone Fassio",
      role: "Founder & Head of Strategy",
      location: "London, United Kingdom",
      bio:
        "Founder of DeepOrbit Group | CareerPilot, Qoraai, Aurévia, Entity & SkaleStudio, Dean's list ESCP Business School, Real estate Investment Cost Analyst at Yard Reaas, Investment Banking at Fante Group, Private Banking at Nevastar Finance",
      image: leoneFassioImg,
      linkedin: "https://www.linkedin.com/in/leone-fassio/",
      bw: true,
    },
    {
      name: "Andrea Alivernini",
      role: "Partner - Growth & Partnerships",
      location: "Cambridge, MA, USA",
      bio:
        "First year Master in Finance Student at MIT, Head of Ventures at Innovis VC, Investment Research at ISF, Junior Consultant Project Manager at Ohla Group, ESCP Dean's list.",
      image: andreaImg,
      linkedin: "https://www.linkedin.com/in/andrea-alivernini/",
      bw: true,
    },
    {
      name: "Elisabetta Fabris",
      role: "Partner - Development & Operations",
      location: "Milan, Italy",
      bio:
        "First year Master Bocconi · Senior Rep. Western Europe AmplifyME · Former Board Member Minerva IMS · Programs: Goldman Sachs Trader Academy, J.P. Morgan Winning Women, Deutsche Bank Women in Finance, UBS, HSBC, BlackRock, Pimco & more · 3° place EMEA – Citadel European Datathon · Nova 111.",
      image: elisabettaImg,
      linkedin: "https://www.linkedin.com/in/elisabetta-fabris/",
      bw: true,
    },
  ];

  const skaleTeam: Member[] = [
    {
      name: "Riccardo Pizzo",
      role: "Co-Founder",
      location: "Skale Studio",
      bio: "",
      image: riccardoImg,
      linkedin: "https://skalestudio.online",
      bw: true,
    },
    {
      name: "Enrico Lutea",
      role: "Co-Founder",
      location: "Skale Studio",
      bio: "",
      image: enricoImg,
      linkedin: "https://skalestudio.online",
      bw: true,
    },
    {
      name: "Luca Spedo",
      role: "Partner",
      location: "Skale Studio",
      bio: "",
      image: lucaImg,
      linkedin: "https://skalestudio.online",
      bw: true,
    },
  ];

  const handleMobileScroll = () => {
    const el = mobileScrollerRef.current;
    if (!el) return;
    setMobileIdx(Math.round(el.scrollLeft / el.clientWidth));
  };

  const imgClass = (m: Member) =>
    `w-full h-full object-cover object-center ${m.bw ? "grayscale" : ""}`;

  return (
    <section className="py-10 md:py-20 bg-cloud-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-6 md:mb-16">
          <h2
            ref={titleAnimation.ref}
            className={`text-[26px] md:text-4xl lg:text-5xl font-bold text-primary mb-2 md:mb-6 leading-tight tracking-tight ${titleAnimation.className}`}
          >
            {language === "it" ? "Chi Siamo" : "About Us"}
          </h2>
          <div className="md:hidden h-[3px] w-12 bg-gradient-sky rounded-full mx-auto mb-3" />
          <p
            ref={descAnimation.ref}
            className={`text-[14px] md:text-xl text-steel-gray max-w-4xl mx-auto leading-relaxed px-2 ${descAnimation.className}`}
          >
            {language === "it"
              ? "Una rete di studenti e giovani professionisti delle migliori università e aziende, uniti per offrire supporto concreto nel tuo percorso."
              : "A network of students and young professionals from top universities and leading companies, united to provide concrete support along your journey."}
          </p>
        </div>

        {/* ===== MOBILE: Founders ===== */}
        <div ref={cardAnimation.ref} className={`md:hidden ${cardAnimation.className}`}>
          <h3 className="text-[18px] font-bold text-primary mb-3 text-center tracking-tight">
            Founders & Partners
          </h3>
          <div
            ref={mobileScrollerRef}
            onScroll={handleMobileScroll}
            className="flex gap-3 overflow-x-auto snap-x snap-mandatory -mx-4 px-4 pb-2"
            style={{ scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch", scrollbarWidth: "none" }}
          >
            {founders.map((member) => (
              <Card key={member.name} className="snap-center flex-none w-[88%] bg-white shadow-sm border border-border/60 overflow-hidden rounded-2xl">
                <div className="relative w-full aspect-[4/3] bg-muted overflow-hidden">
                  <img src={member.image} alt={member.name} className={imgClass(member)} loading="lazy" />
                  <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/55 to-transparent" />
                  <div className="absolute bottom-2 left-3 right-3">
                    <h4 className="text-white text-[15px] font-bold leading-tight drop-shadow">{member.name}</h4>
                    <p className="text-white/90 text-[11px] font-medium leading-tight">{member.role}</p>
                  </div>
                </div>
                <CardContent className="p-3">
                  <div className="flex items-center gap-1 text-muted-foreground mb-1.5 text-[10px]">
                    <MapPin className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">{member.location}</span>
                  </div>
                  <p className="text-steel-gray leading-snug text-[11px] line-clamp-4">{member.bio}</p>
                  <a href={member.linkedin} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-primary font-semibold text-[11px]">
                    <Linkedin className="h-3.5 w-3.5" /> LinkedIn
                  </a>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="flex justify-center gap-1.5 mt-3">
            {founders.map((_, i) => (
              <button
                key={i}
                onClick={() => mobileScrollerRef.current?.scrollTo({ left: i * mobileScrollerRef.current.clientWidth, behavior: "smooth" })}
                className={`rounded-full transition-all duration-300 ${mobileIdx === i ? "w-1.5 h-1.5 bg-primary" : "w-1.5 h-1.5 bg-primary/25"}`}
                aria-label={`Slide ${i + 1}`}
              />
            ))}
          </div>
        </div>

        {/* ===== DESKTOP: Founders ===== */}
        <div className="hidden md:block mb-16">
          <h3 className="text-2xl md:text-3xl font-bold text-primary mb-6 md:mb-10 text-center">
            Founders & Partners
          </h3>
          <div className="grid grid-cols-3 gap-6 max-w-6xl mx-auto">
            {founders.map((member, idx) => {
              const anim = idx === 0 ? teamCard1Animation : teamCard2Animation;
              return (
                <Card key={member.name} ref={anim.ref as any} className={`bg-gradient-card shadow-card-custom hover:shadow-hover-custom transition-all duration-500 overflow-hidden ${anim.className}`}>
                  <CardContent className="p-0">
                    <div className="flex flex-col">
                      <div className="relative w-full aspect-[4/3] bg-muted overflow-hidden">
                        <img src={member.image} alt={member.name} className={`w-full h-full object-cover object-top ${member.bw ? "grayscale" : ""}`} />
                      </div>
                      <div className="p-5 md:p-6 flex flex-col">
                        <h4 className="text-lg md:text-xl font-bold text-primary mb-1">{member.name}</h4>
                        <p className="text-sky-blue font-semibold mb-2 text-sm">{member.role}</p>
                        <div className="flex items-center gap-1.5 text-muted-foreground mb-3 text-sm">
                          <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                          <span className="truncate">{member.location}</span>
                        </div>
                        <p className="text-steel-gray leading-relaxed text-sm mb-4">
                          {member.bio}
                        </p>
                        <a href={member.linkedin} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-primary hover:text-primary/80 font-semibold text-sm transition-colors w-fit">
                          <Linkedin className="h-4 w-4" /> LinkedIn
                        </a>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* ===== SKALE STUDIO — COMPACT ===== */}
        <div className="mt-8 md:mt-4">
          <div ref={marketingTitleAnim.ref} className={`text-center mb-3 md:mb-5 ${marketingTitleAnim.className}`}>
            <h3 className="text-[16px] md:text-xl font-semibold text-steel-gray tracking-tight">
              Skale Studio
            </h3>
            <a href="https://skalestudio.online" target="_blank" rel="noopener noreferrer" className="text-primary font-medium text-[11px] md:text-xs inline-flex items-center gap-0.5 hover:underline">
              skalestudio.online <ExternalLink className="h-3 w-3" />
            </a>
            <p className="text-steel-gray text-[11px] md:text-sm mt-1">
              {language === "it" ? "Marketing & Comunicazione" : "Marketing & Communication"}
            </p>
          </div>

          {/* MOBILE: small centered strip — all three fit, no scroll. These are
              the Skale Studio (marketing) folks, kept visually secondary. */}
          <div className="md:hidden flex justify-center gap-2.5 px-2">
            {skaleTeam.map((member) => (
              <a
                key={member.name}
                href={member.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="group block w-[28%] max-w-[120px]"
              >
                <Card className="bg-white shadow-sm border border-border/60 overflow-hidden rounded-xl">
                  <div className="relative w-full aspect-[4/5] bg-muted overflow-hidden">
                    <img src={member.image} alt={member.name} className={imgClass(member)} loading="lazy" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                  </div>
                </Card>
                <p className="mt-1 text-center text-[10px] font-bold leading-tight text-primary truncate">{member.name}</p>
                <p className="text-center text-[9px] leading-tight text-steel-gray truncate">{member.role}</p>
              </a>
            ))}
          </div>

          {/* DESKTOP: small centered strip, clearly smaller than the founders. */}
          <div ref={marketingAnim.ref as any} className={`hidden md:flex justify-center gap-5 ${marketingAnim.className}`}>
            {skaleTeam.map((member) => (
              <a
                key={member.name}
                href={member.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="group block w-36"
              >
                <Card className="bg-white shadow-sm border border-border/60 hover:shadow-md transition-all duration-300 overflow-hidden rounded-xl">
                  <div className="relative w-full aspect-[4/5] bg-muted overflow-hidden">
                    <img
                      src={member.image}
                      alt={member.name}
                      className={`${imgClass(member)} transition-transform duration-700 group-hover:scale-105`}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/5 to-transparent" />
                  </div>
                </Card>
                <p className="mt-2 text-center text-xs font-bold leading-tight text-primary">{member.name}</p>
                <p className="text-center text-[10px] uppercase tracking-wide text-steel-gray">{member.role}</p>
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
