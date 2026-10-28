import { ArrowRight, ClipboardList, MessageCircle, School } from "lucide-react";
import { EnquiryForm } from "../../components/EnquiryForm";
import { PageHero } from "../../components/PageHero";
import { contentArray, contentText, isJsonObject, PublicContentNotice, usePublishedPageContent } from "./PublicSiteContent";

const steps = [
  { icon: MessageCircle, number: "01", title: "Start a conversation", description: "Share your questions through the enquiry form." },
  { icon: ClipboardList, number: "02", title: "Get the details", description: "The school can provide verified programme and application information." },
  { icon: School, number: "03", title: "Plan your next step", description: "Any visit or application process will be confirmed directly by the school." },
];

export default function AdmissionsPage() {
  const { content } = usePublishedPageContent("admissions");
  const publishedSteps = contentArray(content, "steps")
    .map((value) => isJsonObject(value) ? value : null)
    .filter((value): value is NonNullable<typeof value> => Boolean(value))
    .map((value, index) => ({
      title: contentText(value, "title", ""),
      description: contentText(value, "description", ""),
      number: String(index + 1).padStart(2, "0"),
      icon: [MessageCircle, ClipboardList, School][index % 3],
    }))
    .filter(({ title, description }) => title && description);
  const displayedSteps = publishedSteps.length ? publishedSteps : steps;

  return (
    <>
      <PageHero
        description={contentText(content, "heroDescription", "We’d love to help you discover whether Anushra Educational Centre is the right next step.")}
        eyebrow="Admissions"
        title={contentText(content, "heroTitle", "A bright next chapter starts here.")}
      />
      <div className="container"><PublicContentNotice contentKey="admissions" /></div>
      <section className="section-pad">
        <div className="container admissions-intro">
          <div>
            <span className="eyebrow">Your first step</span>
            <h2>{contentText(content, "introTitle", "Let’s begin with a conversation.")}</h2>
            <p>{contentText(content, "introBody", "Send an enquiry below, or contact the school directly once its verified contact details are available.")}</p>
            <p className="placeholder-note">Admissions availability, eligibility, fees, dates and application requirements have not been confirmed.</p>
          </div>
          <div className="admissions-steps">
            {displayedSteps.map(({ description, icon: Icon, number, title }) => (
              <article key={number}>
                <span className="admissions-steps__number">{number}</span>
                <span className="admissions-steps__icon"><Icon aria-hidden="true" size={20} /></span>
                <div><h3>{title}</h3><p>{description}</p></div>
                <ArrowRight aria-hidden="true" className="admissions-steps__arrow" size={18} />
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="enquiry-section section-pad">
        <div className="container enquiry-grid">
          <div className="enquiry-intro">
            <span className="eyebrow eyebrow--light">Start here</span>
            <h2>Have a question?<br /><em>We’re listening.</em></h2>
            <p>Submit an enquiry using the form. It will only be reported as received when the database confirms it was saved.</p>
            <p className="enquiry-intro__note">An email reply is not sent by this form.</p>
          </div>
          <div className="enquiry-form-wrap">
            <EnquiryForm admissions />
          </div>
        </div>
      </section>
    </>
  );
}
