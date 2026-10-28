import { Mail, MapPin, Phone, Clock3 } from "lucide-react";
import { EnquiryForm } from "../../components/EnquiryForm";
import { PageHero } from "../../components/PageHero";
import { verifiedContact } from "../../data/siteContent";
import { contentText, PublicContentNotice, usePublishedPageContent } from "./PublicSiteContent";

export default function ContactPage() {
  const { content, hasPublishedContent } = usePublishedPageContent("contact");
  const contact = {
    address: contentText(content, "address", verifiedContact.address),
    email: contentText(content, "email", verifiedContact.email),
    hours: contentText(content, "hours", verifiedContact.hours),
    phone: contentText(content, "phone", verifiedContact.phone),
  };
  const hasPublishedDetails = hasPublishedContent && Object.values(contact).some((value) =>
    !Object.values(verifiedContact).includes(value),
  );

  return (
    <>
      <PageHero
        description={contentText(content, "heroDescription", "Questions, ideas, or just want to learn more? We’d love to hear from you.")}
        eyebrow="Contact"
        title={contentText(content, "heroTitle", "Let’s start a conversation.")}
      />
      <div className="container"><PublicContentNotice contentKey="contact" /></div>
      <section className="section-pad">
        <div className="container contact-grid">
          <div className="contact-details">
            <span className="eyebrow">Reach the school</span>
            <h2>{contentText(content, "introTitle", "We’re here to help you find your next step.")}</h2>
            <p>{hasPublishedDetails ? contentText(content, "detailsNote", "Contact details published by the school.") : "Contact details below are placeholders until verified information is provided by the school."}</p>
            <div className="contact-detail-list">
              <div><span><MapPin size={19} /></span><p><strong>Visit us</strong>{contact.address}</p></div>
              <div><span><Phone size={19} /></span><p><strong>Call us</strong>{contact.phone}</p></div>
              <div><span><Mail size={19} /></span><p><strong>Email us</strong>{contact.email}</p></div>
              <div><span><Clock3 size={19} /></span><p><strong>Office hours</strong>{contact.hours}</p></div>
            </div>
            <div className="map-placeholder">
              <MapPin aria-hidden="true" size={25} />
              <span>Map will be added after the school address is confirmed.</span>
            </div>
          </div>
          <div className="contact-form-panel">
            <div className="contact-form-panel__heading">
              <h2>Send an enquiry</h2>
              <p>Submit a question to save it for the school administrator to review. No email is sent.</p>
            </div>
            <EnquiryForm />
          </div>
        </div>
      </section>
    </>
  );
}
