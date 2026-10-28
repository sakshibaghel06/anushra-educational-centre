import { Heart, Lightbulb, Sprout, Star } from "lucide-react";
import { PageHero } from "../../components/PageHero";
import { SectionHeading } from "../../components/SectionHeading";
import { contentArray, contentText, isJsonObject, PublicContentNotice, usePublishedPageContent } from "./PublicSiteContent";

const values = [
  { description: "Meet each new idea with an open mind and a willingness to explore.", icon: Lightbulb, title: "Curiosity" },
  { description: "Create room for kindness, belonging and thoughtful support.", icon: Heart, title: "Care" },
  { description: "Notice every step forward and keep learning along the way.", icon: Sprout, title: "Growth" },
  { description: "Help every learner see the possibilities in their own potential.", icon: Star, title: "Confidence" },
];

export default function AboutPage() {
  const { content } = usePublishedPageContent("about");
  const publishedValues = contentArray(content, "values")
    .map((value) => isJsonObject(value) ? value : null)
    .filter((value): value is NonNullable<typeof value> => Boolean(value))
    .map((value, index) => ({
      title: contentText(value, "title", ""),
      description: contentText(value, "description", ""),
      icon: [Lightbulb, Heart, Sprout, Star][index % 4],
    }))
    .filter(({ title, description }) => title && description);
  const displayedValues = publishedValues.length ? publishedValues : values;

  return (
    <>
      <PageHero
        description={contentText(content, "heroDescription", "A place for bright beginnings, thoughtful learning and all the possibilities still ahead.")}
        eyebrow="A little about us"
        title={contentText(content, "heroTitle", "Learning begins with belonging.")}
      />
      <div className="container"><PublicContentNotice contentKey="about" /></div>
      <section className="section-pad">
        <div className="container about-intro">
          <div>
            <span className="eyebrow">Our story</span>
            <h2>{contentText(content, "storyTitle", "Every great journey starts with a first step.")}</h2>
          </div>
          <div className="about-intro__copy">
            <p>{contentText(content, "storyBody", "Anushra Educational Centre is building a welcoming space where learners can ask questions, make discoveries and grow in confidence. We believe every child deserves the encouragement to find their own way forward.")}</p>
            {!(typeof content?.storyBody === "string" && content.storyBody.trim()) && <p className="placeholder-note">
              This is a draft introduction, not an official history. The
              centre’s founding story, values and details will be added after
              they are verified.
            </p>}
          </div>
        </div>
      </section>
      <section className="values-section section-pad">
        <div className="container">
          <SectionHeading
            align="center"
            description={contentText(content, "valuesDescription", "A starting point for the kind of learning community we hope to build.")}
            eyebrow="What guides us"
            title={contentText(content, "valuesTitle", "A few things we believe")}
          />
          <div className="value-grid">
            {displayedValues.map(({ description, icon: Icon, title }) => (
              <article className="value-card" key={title}>
                <Icon aria-hidden="true" size={25} strokeWidth={1.6} />
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
          {!publishedValues.length && <p className="demo-disclaimer">Guiding values shown are illustrative and should be confirmed by the school.</p>}
        </div>
      </section>
    </>
  );
}
