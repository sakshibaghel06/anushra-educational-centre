import {
  ArrowDown,
  ArrowRight,
  BookOpen,
  HeartHandshake,
  Lightbulb,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { Link } from "react-router";
import { FeatureCard } from "../../components/FeatureCard";
import { NewsCard } from "../../components/NewsCard";
import { RouterButton } from "../../components/Button";
import { SectionHeading } from "../../components/SectionHeading";
import { newsItems } from "../../data/siteContent";
import { contentArray, contentText, isJsonObject, publicImageUrl, PublicContentNotice, usePublishedPageContent } from "./PublicSiteContent";

const learningFeatures = [
  {
    description: "Make space for questions, discovery and the joy of understanding.",
    icon: Lightbulb,
    title: "Curiosity comes first",
  },
  {
    description: "Build confidence through thoughtful guidance and steady practice.",
    icon: BookOpen,
    title: "Learning with purpose",
  },
  {
    description: "Create a welcoming environment where every learner can take part.",
    icon: HeartHandshake,
    title: "Care in every step",
  },
];

export default function HomePage() {
  const { content } = usePublishedPageContent("home");
  const publishedNews = contentArray(content, "news")
    .map((value) => isJsonObject(value) ? value : null)
    .filter((value): value is NonNullable<typeof value> => Boolean(value))
    .map((value) => ({
      category: contentText(value, "category", ""),
      date: contentText(value, "date", ""),
      description: contentText(value, "description", ""),
      image: publicImageUrl(value.image, ""),
      title: contentText(value, "title", ""),
    }))
    .filter(({ title, description }) => title && description);
  const displayedNews = publishedNews.length ? publishedNews : newsItems;

  return (
    <>
      <section className="hero">
        <div className="hero__wash" />
        <div className="container hero__inner">
          <div className="hero__copy">
            <span className="eyebrow"><span className="eyebrow__dot" /> {contentText(content, "heroEyebrow", "A place to learn and grow")}</span>
            <h1>{contentText(content, "heroTitle", "A bright beginning. A confident future.")}</h1>
            <p>{contentText(content, "heroDescription", "At Anushra Educational Centre, every new idea can be the start of something wonderful. Let’s make room for learning, possibility and a little bit of magic.")}</p>
            <div className="hero__actions">
              <RouterButton to="/admissions">
                Explore admissions <ArrowRight aria-hidden="true" size={17} />
              </RouterButton>
              <RouterButton to="/about" variant="secondary">Get to know us</RouterButton>
            </div>
            <div className="hero__footnote">
              <span aria-hidden="true" className="hero__footnote-icon"><Sparkles size={16} /></span>
              <span>Official school details are being confirmed.</span>
            </div>
          </div>
          <div className="hero__visual" aria-label="Illustrative image of a student learning">
            <div className="hero__photo-wrap">
              <img
                alt="Illustrative photo of a student reading"
                fetchPriority="high"
                src={publicImageUrl(content?.heroImage, "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1000&q=90")}
              />
              <span className="hero__photo-label">A world of possibility</span>
            </div>
            <div className="hero__sun" />
            <div className="hero__float-card">
              <span className="hero__float-icon"><UsersRound size={20} /></span>
              <span><strong>Every learner</strong><small>has room to shine</small></span>
            </div>
            <span className="hero__vertical-note">LEARN · WONDER · GROW</span>
          </div>
        </div>
        <div className="container"><PublicContentNotice contentKey="home" /></div>
        <a className="hero__scroll" href="#welcome"><span>Scroll to discover</span><ArrowDown size={16} /></a>
      </section>

      <section className="welcome-section section-pad" id="welcome">
        <div className="container welcome-grid">
          <div className="welcome-photo">
            <img
              alt="Illustrative classroom scene with a teacher and students"
              loading="lazy"
              src={publicImageUrl(content?.welcomeImage, "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1000&q=85")}
            />
            <span className="welcome-photo__caption"><Sparkles size={15} /> A little wonder goes a long way</span>
            <span aria-hidden="true" className="welcome-photo__outline" />
          </div>
          <div className="welcome-copy">
            <span className="eyebrow">Welcome to Anushra</span>
            <h2>{contentText(content, "welcomeTitle", "Big things begin with small wonders.")}</h2>
            <p>{contentText(content, "welcomeBody", "Anushra Educational Centre is a place for questions, ideas and discoveries. We believe a positive learning experience can help children feel ready to explore what comes next.")}</p>
            {!(typeof content?.welcomeBody === "string" && content.welcomeBody.trim()) && <p className="placeholder-note">This introduction is provisional and will be updated with verified school information.</p>}
            <RouterButton to="/about" variant="secondary">Our story <ArrowRight size={16} /></RouterButton>
          </div>
        </div>
      </section>

      <section className="academics-preview section-pad">
        <div className="container">
          <SectionHeading
            align="center"
            description={contentText(content, "academicsDescription", "A thoughtful foundation for skills, confidence and a lasting love of learning.")}
            eyebrow="A thoughtful approach"
            title={contentText(content, "academicsTitle", "Learning that opens doors")}
          />
          <div className="feature-grid">
            {learningFeatures.map((feature) => <FeatureCard key={feature.title} {...feature} />)}
          </div>
          <div className="academic-note">
            <span><BookOpen size={17} /> Curriculum information to be confirmed</span>
            <RouterButton to="/academics" variant="secondary">Explore academics <ArrowRight size={16} /></RouterButton>
          </div>
        </div>
      </section>

      <section className="approach-section section-pad">
        <div className="container approach-grid">
          <div className="approach-copy">
            <span className="eyebrow eyebrow--light">Our learning approach</span>
            <h2>{contentText(content, "approachTitle", "Room to wonder. Space to become.")}</h2>
            <p>{contentText(content, "approachBody", "Learning is more than what happens in a book. It grows through questions, kind encouragement and the confidence to try again.")}</p>
            <RouterButton to="/academics" variant="light">Discover our approach <ArrowRight size={16} /></RouterButton>
          </div>
          <div className="approach-quote">
            <span aria-hidden="true" className="approach-quote__mark">“</span>
            <p>{contentText(content, "approachQuote", "Every question is an invitation to discover something new.")}</p>
            <span className="approach-quote__caption">{typeof content?.approachQuote === "string" && content.approachQuote.trim() ? "Published school content" : "A belief to grow with — school philosophy to be verified"}</span>
            <div className="approach-quote__spark"><Sparkles size={23} /></div>
          </div>
          <div className="approach-image">
            <img
              alt="Illustrative close-up of a student learning"
              loading="lazy"
              src={publicImageUrl(content?.approachImage, "https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?auto=format&fit=crop&w=1000&q=85")}
            />
          </div>
        </div>
      </section>

      <section className="news-preview section-pad">
        <div className="container">
          <div className="news-preview__heading">
            <SectionHeading
              description={publishedNews.length ? "Published school updates." : "Illustrative stories for the moments worth sharing. Official updates will appear here."}
              eyebrow="Notes from school life"
              title={contentText(content, "newsTitle", "Little moments, big memories")}
            />
            <Link className="underlined-link" to="/news">All news & events <ArrowRight size={16} /></Link>
          </div>
          <div className="news-grid">
            {displayedNews.slice(0, 3).map((item) => <NewsCard item={item} key={item.title} published={Boolean(publishedNews.length)} />)}
          </div>
          {!publishedNews.length && <p className="demo-disclaimer">Demo content — stories and images are illustrative, not official school updates.</p>}
        </div>
      </section>

      <section className="contact-cta">
        <div className="container contact-cta__inner">
          <div className="contact-cta__icon"><HeartHandshake size={26} /></div>
          <div>
            <span className="eyebrow eyebrow--light">A new chapter starts here</span>
            <h2>Let’s talk about what’s next.</h2>
            <p>Have a question? Our admissions enquiry form is ready for a demo.</p>
          </div>
          <RouterButton to="/contact" variant="light">Get in touch <ArrowRight size={16} /></RouterButton>
        </div>
        <div aria-hidden="true" className="contact-cta__decoration">✳</div>
      </section>
    </>
  );
}
