import { BookOpen, Compass, PencilRuler, UsersRound } from "lucide-react";
import { PageHero } from "../../components/PageHero";
import { SectionHeading } from "../../components/SectionHeading";
import { contentArray, contentText, isJsonObject, PublicContentNotice, usePublishedPageContent } from "./PublicSiteContent";

const areas = [
  { icon: BookOpen, title: "A strong foundation", description: "Build essential skills through clear explanations and purposeful practice." },
  { icon: Compass, title: "Explore new ideas", description: "Encourage thoughtful questions and connections across different subjects." },
  { icon: PencilRuler, title: "Learn by doing", description: "Make space for creative thinking, reflection and hands-on discovery." },
  { icon: UsersRound, title: "Grow together", description: "Develop confidence through collaboration and respectful encouragement." },
];

export default function AcademicsPage() {
  const { content } = usePublishedPageContent("academics");
  const publishedAreas = contentArray(content, "areas")
    .map((value) => isJsonObject(value) ? value : null)
    .filter((value): value is NonNullable<typeof value> => Boolean(value))
    .map((value, index) => ({
      title: contentText(value, "title", ""),
      description: contentText(value, "description", ""),
      icon: [BookOpen, Compass, PencilRuler, UsersRound][index % 4],
    }))
    .filter(({ title, description }) => title && description);
  const displayedAreas = publishedAreas.length ? publishedAreas : areas;

  return (
    <>
      <PageHero
        description={contentText(content, "heroDescription", "A learning experience shaped around curiosity, confidence and the next question.")}
        eyebrow="Academics"
        title={contentText(content, "heroTitle", "The joy of figuring it out.")}
      />
      <div className="container"><PublicContentNotice contentKey="academics" /></div>
      <section className="section-pad">
        <div className="container">
          <SectionHeading
            description={contentText(content, "introDescription", "A starting framework for sharing how learning works at Anushra.")}
            eyebrow="A thoughtful foundation"
            title={contentText(content, "introTitle", "Learning, with room to grow")}
          />
          <div className="academic-area-grid">
            {displayedAreas.map(({ description, icon: Icon, title }) => (
              <article className="academic-area-card" key={title}>
                <span><Icon aria-hidden="true" size={24} /></span>
                <div><h3>{title}</h3><p>{description}</p></div>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="academics-notice section-pad">
        <div className="container academics-notice__inner">
          <span className="eyebrow">Important information</span>
          <h2>{contentText(content, "noticeTitle", "School programme details are being confirmed.")}</h2>
          <p>{contentText(content, "noticeBody", "Curriculum, grade levels, subjects, school calendar and teaching approach must be confirmed by Anushra Educational Centre before publication. No curriculum or accreditation claims are made here.")}</p>
        </div>
      </section>
    </>
  );
}
