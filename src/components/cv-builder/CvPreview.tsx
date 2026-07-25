import { useLayoutEffect, useRef, useState } from "react";
import { CvData } from "@/lib/cvBuilder/types";

// A4 usable area at 96dpi minus ~15mm margins each side.
const A4_WIDTH_PX = 794;
const A4_HEIGHT_PX = 1123;
const PAGE_MARGIN_PX = 56;
const CONTENT_WIDTH_PX = A4_WIDTH_PX - PAGE_MARGIN_PX * 2;

// Two independent levers to fill (or fit) the page: font size barely moves
// (a CV with little content should never look "blown up"), spacing does
// most of the work of using the full page nicely.
const MIN_FONT_SCALE = 0.87;
const MAX_FONT_SCALE = 1.1;
const MIN_SPACE_SCALE = 0.6;
const MAX_SPACE_SCALE = 1.6;
// Last-resort uniform shrink if even the floor of both levers still overflows
// (pathologically long content) — clip-avoidance safety net, not a normal path.
const OVERFLOW_TRANSFORM_FLOOR = 0.7;

const BASE = {
  fsName: 20,
  fsContact: 10.5,
  fsSection: 11,
  fsEntryBold: 11,
  fsEntryItalic: 10.5,
  fsBullet: 10.5,
  fsPara: 10.5,
  spHeaderMb: 8,
  spContactMt: 2,
  spSectionPb: 2,
  spSectionMb: 6,
  spSectionMt: 12,
  spEntryGap: 6,
  spBulletGap: 2,
  lineHeight: 1.375,
};

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

function computeVars(fontScale: number, spaceScale: number): Record<string, string> {
  const lh = clamp(BASE.lineHeight * (1 + (spaceScale - 1) * 0.5), 1.1, 1.9);
  return {
    "--fs-name": `${BASE.fsName * fontScale}px`,
    "--fs-contact": `${BASE.fsContact * fontScale}px`,
    "--fs-section": `${BASE.fsSection * fontScale}px`,
    "--fs-entry-bold": `${BASE.fsEntryBold * fontScale}px`,
    "--fs-entry-italic": `${BASE.fsEntryItalic * fontScale}px`,
    "--fs-bullet": `${BASE.fsBullet * fontScale}px`,
    "--fs-para": `${BASE.fsPara * fontScale}px`,
    "--sp-header-mb": `${BASE.spHeaderMb * spaceScale}px`,
    "--sp-contact-mt": `${BASE.spContactMt * spaceScale}px`,
    "--sp-section-pb": `${BASE.spSectionPb * spaceScale}px`,
    "--sp-section-mb": `${BASE.spSectionMb * spaceScale}px`,
    "--sp-section-mt": `${BASE.spSectionMt * spaceScale}px`,
    "--sp-entry-gap": `${BASE.spEntryGap * spaceScale}px`,
    "--sp-bullet-gap": `${BASE.spBulletGap * spaceScale}px`,
    "--lh": `${lh}`,
  };
}

function SectionTitle({ children, isFirst }: { children: string; isFirst: boolean }) {
  return (
    <h2
      style={{
        fontSize: "var(--fs-section)",
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.03em",
        borderBottom: "1px solid #171717",
        paddingBottom: "var(--sp-section-pb)",
        marginBottom: "var(--sp-section-mb)",
        marginTop: isFirst ? 0 : "var(--sp-section-mt)",
      }}
    >
      {children}
    </h2>
  );
}

function EntryRow({ left, right, italic }: { left: string; right: string; italic?: boolean }) {
  if (!left && !right) return null;
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        fontStyle: italic ? "italic" : "normal",
        fontWeight: italic ? 400 : 700,
        fontSize: italic ? "var(--fs-entry-italic)" : "var(--fs-entry-bold)",
        lineHeight: "var(--lh)",
      }}
    >
      <span>{left}</span>
      <span style={{ whiteSpace: "nowrap" }}>{right}</span>
    </div>
  );
}

function Bullets({ items }: { items: string[] }) {
  const clean = items.filter((b) => b.trim());
  if (!clean.length) return null;
  return (
    <ul
      style={{
        listStyleType: "disc",
        paddingLeft: 16,
        fontSize: "var(--fs-bullet)",
        lineHeight: "var(--lh)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--sp-bullet-gap)",
      }}
    >
      {clean.map((b, i) => (
        <li key={i}>{b}</li>
      ))}
    </ul>
  );
}

export function CvPreview({ data, onOverflow }: { data: CvData; onOverflow?: (overflowing: boolean) => void }) {
  const outerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [vars, setVars] = useState<Record<string, string>>(() => computeVars(1, 1));
  const [transformScale, setTransformScale] = useState(1);

  useLayoutEffect(() => {
    const outerEl = outerRef.current;
    if (!outerEl) return;
    const maxHeight = A4_HEIGHT_PX - PAGE_MARGIN_PX * 2;

    // Measure on a detached clone (with the same font/color ancestor
    // context) so we never mutate the live, React-owned node — a prior
    // version mutated contentRef directly here and raced with React's own
    // re-render, leaving the transform stuck on a stale value.
    const outerClone = outerEl.cloneNode(true) as HTMLDivElement;
    outerClone.style.position = "fixed";
    outerClone.style.left = "-99999px";
    outerClone.style.top = "0";
    outerClone.style.visibility = "hidden";
    outerClone.style.pointerEvents = "none";
    document.body.appendChild(outerClone);
    const innerClone = outerClone.firstElementChild as HTMLDivElement;
    innerClone.style.transform = "none";

    const measure = (fontScale: number, spaceScale: number) => {
      const v = computeVars(fontScale, spaceScale);
      for (const [k, val] of Object.entries(v)) innerClone.style.setProperty(k, val);
      return innerClone.scrollHeight;
    };

    let fontScale = 1;
    let spaceScale = 1;
    const hAt1 = measure(1, 1);
    const hAtMinSpace = measure(1, MIN_SPACE_SCALE);
    const perUnitSpace = (hAt1 - hAtMinSpace) / (1 - MIN_SPACE_SCALE);

    if (hAt1 <= maxHeight) {
      // Shorter than the page — grow spacing first, then (a little) font, to fill it.
      if (perUnitSpace > 0) {
        spaceScale = clamp((maxHeight - hAtMinSpace) / perUnitSpace + MIN_SPACE_SCALE, 1, MAX_SPACE_SCALE);
      }
      const hAtSolvedSpace = measure(fontScale, spaceScale);
      if (spaceScale >= MAX_SPACE_SCALE - 0.001 && hAtSolvedSpace < maxHeight) {
        const hAtMaxFont = measure(MAX_FONT_SCALE, spaceScale);
        const perUnitFont = (hAtMaxFont - hAtSolvedSpace) / (MAX_FONT_SCALE - 1);
        if (perUnitFont > 0) {
          fontScale = clamp(1 + (maxHeight - hAtSolvedSpace) / perUnitFont, 1, MAX_FONT_SCALE);
        }
      }
    } else {
      // Longer than the page — shrink spacing first, then font, to fit it.
      spaceScale = perUnitSpace > 0
        ? clamp((maxHeight - hAtMinSpace) / perUnitSpace + MIN_SPACE_SCALE, MIN_SPACE_SCALE, 1)
        : MIN_SPACE_SCALE;
      const hAtSolvedSpace = measure(fontScale, spaceScale);
      if (spaceScale <= MIN_SPACE_SCALE + 0.001 && hAtSolvedSpace > maxHeight) {
        const hAtMinFont = measure(MIN_FONT_SCALE, spaceScale);
        const perUnitFont = (hAtSolvedSpace - hAtMinFont) / (1 - MIN_FONT_SCALE);
        fontScale = perUnitFont > 0
          ? clamp(1 - (maxHeight - hAtMinFont) / perUnitFont, MIN_FONT_SCALE, 1)
          : MIN_FONT_SCALE;
      }
    }

    const finalHeight = measure(fontScale, spaceScale);
    const residualScale = finalHeight > maxHeight ? clamp(maxHeight / finalHeight, OVERFLOW_TRANSFORM_FLOOR, 1) : 1;

    document.body.removeChild(outerClone);

    setVars(computeVars(fontScale, spaceScale));
    setTransformScale(residualScale);
    // Only the last-resort uniform shrink risks clipping — flag that case.
    onOverflow?.(residualScale <= OVERFLOW_TRANSFORM_FLOOR + 0.001);
  }, [data, onOverflow]);

  const contact = [data.header.location, data.header.phone, data.header.email, data.header.linkedin]
    .filter(Boolean)
    .join(" | ");

  const sectionsPresent = [
    !!data.summary,
    data.education.length > 0,
    data.experience.length > 0,
    data.leadership.length > 0,
    data.community.length > 0,
    data.additionalInfo.length > 0,
  ];
  const firstSectionIndex = sectionsPresent.findIndex(Boolean);

  return (
    <div
      id="cv-print-root"
      ref={outerRef}
      className="bg-white text-neutral-900 font-serif mx-auto shadow-sm overflow-hidden"
      style={{ width: A4_WIDTH_PX, height: A4_HEIGHT_PX, padding: PAGE_MARGIN_PX }}
    >
      <div
        ref={contentRef}
        style={{ ...vars, transform: `scale(${transformScale})`, transformOrigin: "top left", width: CONTENT_WIDTH_PX }}
      >
        <div style={{ textAlign: "center", marginBottom: "var(--sp-header-mb)" }}>
          <div style={{ fontSize: "var(--fs-name)", fontWeight: 700, letterSpacing: "0.02em" }}>
            {data.header.fullName || "Full Name"}
          </div>
          {contact && (
            <div style={{ fontSize: "var(--fs-contact)", marginTop: "var(--sp-contact-mt)" }}>{contact}</div>
          )}
        </div>

        {data.summary && (
          <section>
            <SectionTitle isFirst={firstSectionIndex === 0}>Professional Summary</SectionTitle>
            <p style={{ fontSize: "var(--fs-para)", lineHeight: "var(--lh)" }}>{data.summary}</p>
          </section>
        )}

        {data.education.length > 0 && (
          <section>
            <SectionTitle isFirst={firstSectionIndex === 1}>Education</SectionTitle>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-entry-gap)" }}>
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
            <SectionTitle isFirst={firstSectionIndex === 2}>Professional Experience</SectionTitle>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-entry-gap)" }}>
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
            <SectionTitle isFirst={firstSectionIndex === 3}>Leadership &amp; Entrepreneurship</SectionTitle>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-entry-gap)" }}>
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
            <SectionTitle isFirst={firstSectionIndex === 4}>Community &amp; Volunteering</SectionTitle>
            <p style={{ fontSize: "var(--fs-para)", lineHeight: "var(--lh)" }}>
              {data.community.filter(Boolean).join("; ")}
            </p>
          </section>
        )}

        {data.additionalInfo.length > 0 && (
          <section>
            <SectionTitle isFirst={firstSectionIndex === 5}>Additional Information</SectionTitle>
            <ul
              style={{
                fontSize: "var(--fs-para)",
                lineHeight: "var(--lh)",
                display: "flex",
                flexDirection: "column",
                gap: "var(--sp-bullet-gap)",
              }}
            >
              {data.additionalInfo
                .filter((i) => i.text?.trim())
                .map((i, idx) => (
                  <li key={idx}>
                    <span style={{ fontWeight: 700 }}>{i.label}: </span>
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
