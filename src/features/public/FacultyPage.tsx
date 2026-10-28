import { HeartHandshake, Lightbulb, UsersRound } from "lucide-react";
import { PageHero } from "../../components/PageHero";
import { SectionHeading } from "../../components/SectionHeading";
import { contentArray, contentText, isJsonObject, publicImageUrl, PublicContentNotice, usePublishedPageContent } from "./PublicSiteContent";

const teamValues = [
  { icon: HeartHandshake, title: "Care that encourages", description: "Thoughtful support helps learners feel seen, respected and ready to try." },
  { icon: Lightbulb, title: "A love of learning", description: "Great teaching makes room for questions, new ideas and discovery." },
  { icon: UsersRound, title: "A learning community", description: "Families and educators can work together to support every learner." },
];

export default function FacultyPage() {
  const { content } = usePublishedPageContent("faculty");
  const faculty = contentArray(content, "people")
    .map((value) => isJsonObject(value) ? value : null)
    .filter((value): value is NonNullable<typeof value> => Boolean(value))
    .map((value) => ({
      name: contentText(value, "name", ""),
      role: contentText(value, "role", ""),
      biography: contentText(value, "biography", ""),
      image: publicImageUrl(value.image, ""),
    }))
    .filter(({ name, role }) => name && role);

  return (
    <>
      <PageHero
        description={contentText(content, "heroDescription", "The people who help a learning community feel welcoming, curious and full of possibility.")}
        eyebrow="Our people"
        title={contentText(content, "heroTitle", "Good learning grows together.")}
      />
      <div className="container"><PublicContentNotice contentKey="faculty" /></div>
      <section className="section-pad">
        <div className="container faculty-intro">
          <SectionHeading
            description={contentText(content, "introDescription", "We look forward to introducing the educators and team members who make Anushra special.")}
            eyebrow="Meet the team"
            title={contentText(content, "introTitle", "People make the difference.")}
          />
          {faculty.length ? (
            <div className="faculty-profile-grid">
              {faculty.map((person) => (
                <article className="faculty-profile" key={`${person.name}-${person.role}`}>
                  {person.image && <img alt="" loading="lazy" src={person.image} />}
                  <h3>{person.name}</h3>
                  <p className="faculty-profile__role">{person.role}</p>
                  {person.biography && <p>{person.biography}</p>}
                </article>
              ))}
            </div>
          ) : <div className="faculty-placeholder">
            <span className="faculty-placeholder__icon"><UsersRound size={29} /></span>
            <h3>Faculty profiles coming soon</h3>
            <p>
              Names, photographs, roles and qualifications will be published
              only after the school provides and verifies them. No faculty
              profiles are represented on this demo page.
            </p>
          </div>}
        </div>
      </section>
      <section className="values-section section-pad">
        <div className="container">
          <SectionHeading align="center" eyebrow="What matters in a classroom" title="The care behind the learning" />
          <div className="value-grid">
            {teamValues.map(({ description, icon: Icon, title }) => (
              <article className="value-card" key={title}>
                <Icon aria-hidden="true" size={25} strokeWidth={1.6} />
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
          <p className="demo-disclaimer">These are general design themes, not claims about individual staff or verified school practice.</p>
        </div>
      </section>
    </>
  );
}
