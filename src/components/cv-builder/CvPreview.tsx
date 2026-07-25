import { useLayoutEffect, useRef, useState } from "react";
import { CvData } from "@/lib/cvBuilder/types";

// A4 usable area at 96dpi minus ~15mm margins each side.
const A4_WIDTH_PX = 794;
const A4_HEIGHT_PX = 1123;
const PAGE_MARGIN_PX = 56;
const MIN_SCALE = 0.7;

function SectionTitle({ children }: { children: string }) {
  return (
    <h2 className="text-[11px] font-bold uppercase tracking-wide border-b border-neutral-900 pb-0.5 mb-1.5 mt-3 first:mt-0">
      {children}
    </h2>
  );
}

function EntryRow({ left, right, italic }: { left: string; right: string; italic?: boolean }) {
  if (!left && !right) return null;
  return (
    <div className={`flex justify-between gap-3 ${italic ? "italic text-[10.5px]" : "font-bold text-[11px]"}`}>
      <span>{left}</span>
      <span className="whitespace-nowrap">{right}</span>
    </div>
  );
}

function Bullets({ items }: { items: string[] }) {
  const clean = items.filter((b) => b.trim());
  if (!clean.length) return null;
  return (
    <ul className="list-disc pl-4 text-[10.5px] leading-snug space-y-0.5">
      {clean.map((b, i) => (
        <li key={i}>{b}</li>
      ))}
    </ul>
  );
}

const CONTENT_WIDTH_PX = A4_WIDTH_PX - PAGE_MARGIN_PX * 2;

export function CvPreview({ data, onOverflow }: { data: CvData; onOverflow?: (overflowing: boolean) => void }) {
  const outerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const maxHeight = A4_HEIGHT_PX - PAGE_MARGIN_PX * 2;
    const measure = () => {
      // scrollHeight reflects the untransformed layout box regardless of any
      // CSS transform already applied — no need to reset the scale first
      // (doing so via a direct DOM mutation raced with React's own state
      // update and could leave the transform stuck).
      const naturalHeight = el.scrollHeight;
      const fit = naturalHeight > maxHeight ? maxHeight / naturalHeight : 1;
      setScale(Math.max(MIN_SCALE, Math.min(1, fit)));
      // Below MIN_SCALE we clip rather than shrink further (unreadable text
      // otherwise) — surface that so the caller can warn instead of silently
      // losing content off the bottom of the page.
      onOverflow?.(fit < MIN_SCALE);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [data, onOverflow]);

  const contact = [data.header.location, data.header.phone, data.header.email, data.header.linkedin]
    .filter(Boolean)
    .join(" | ");

  return (
    <div
      id="cv-print-root"
      ref={outerRef}
      className="bg-white text-neutral-900 font-serif mx-auto shadow-sm overflow-hidden"
      style={{ width: A4_WIDTH_PX, height: A4_HEIGHT_PX, padding: PAGE_MARGIN_PX }}
    >
      <div
        ref={contentRef}
        style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: CONTENT_WIDTH_PX }}
      >
        <div className="text-center mb-2">
          <div className="text-xl font-bold tracking-wide">{data.header.fullName || "Full Name"}</div>
          {contact && <div className="text-[10.5px] mt-0.5">{contact}</div>}
        </div>

        {data.summary && (
          <section>
            <SectionTitle>Professional Summary</SectionTitle>
            <p className="text-[10.5px] leading-snug">{data.summary}</p>
          </section>
        )}

        {data.education.length > 0 && (
          <section>
            <SectionTitle>Education</SectionTitle>
            <div className="space-y-1.5">
              {data.education.map((e, i) => (
                <div key={i}>
                  <EntryRow left={e.org} right={e.location} />
                  <EntryRow left={e.role} right={e.dateRange} italic />
                  <Bullets items={e.bullets} />
                </div>
              ))}
            </div>
          </section>
        )}

        {data.experience.length > 0 && (
          <section>
            <SectionTitle>Professional Experience</SectionTitle>
            <div className="space-y-1.5">
              {data.experience.map((e, i) => (
                <div key={i}>
                  <EntryRow left={e.org} right={e.location} />
                  <EntryRow left={e.role} right={e.dateRange} italic />
                  <Bullets items={e.bullets} />
                </div>
              ))}
            </div>
          </section>
        )}

        {data.leadership.length > 0 && (
          <section>
            <SectionTitle>Leadership &amp; Entrepreneurship</SectionTitle>
            <div className="space-y-1.5">
              {data.leadership.map((e, i) => (
                <div key={i}>
                  <EntryRow left={e.org} right={e.location} />
                  <EntryRow left={e.role} right={e.dateRange} italic />
                  <Bullets items={e.bullets} />
                </div>
              ))}
            </div>
          </section>
        )}

        {data.community.length > 0 && (
          <section>
            <SectionTitle>Community &amp; Volunteering</SectionTitle>
            <p className="text-[10.5px] leading-snug">
              {data.community.filter(Boolean).join("; ")}
            </p>
          </section>
        )}

        {data.additionalInfo.length > 0 && (
          <section>
            <SectionTitle>Additional Information</SectionTitle>
            <ul className="text-[10.5px] leading-snug space-y-0.5">
              {data.additionalInfo
                .filter((i) => i.text?.trim())
                .map((i, idx) => (
                  <li key={idx}>
                    <span className="font-bold">{i.label}: </span>
                    {i.text}
                  </li>
                ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
