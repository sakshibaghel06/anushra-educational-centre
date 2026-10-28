import { ArrowUpRight, Mail, MapPin, Phone, Sparkles } from "lucide-react";
import { Link } from "react-router";
import { navigationLinks, verifiedContact } from "../data/siteContent";
import { Brand } from "./Brand";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-main">
          <div className="footer-brand">
            <Brand />
            <p>
              A thoughtful beginning for a lifelong love of learning.
              <span className="footer-placeholder">School introduction to be verified.</span>
            </p>
          </div>
          <div className="footer-links">
            <h2>Explore</h2>
            {navigationLinks.slice(1, 6).map((link) => (
              <Link key={link.to} to={link.to}>
                {link.label}
              </Link>
            ))}
          </div>
          <div className="footer-contact">
            <h2>Get in touch</h2>
            <p><MapPin aria-hidden="true" size={16} /> {verifiedContact.address}</p>
            <p><Phone aria-hidden="true" size={16} /> {verifiedContact.phone}</p>
            <p><Mail aria-hidden="true" size={16} /> {verifiedContact.email}</p>
            <span className="footer-contact__note">Contact details pending verification</span>
          </div>
          <div className="footer-note">
            <span className="footer-note__icon"><Sparkles aria-hidden="true" size={19} /></span>
            <p>A thoughtful start begins with a conversation.</p>
            <Link to="/contact">Say hello <ArrowUpRight aria-hidden="true" size={15} /></Link>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Anushra Educational Centre</span>
          <span>Website content and contact details are being verified.</span>
        </div>
      </div>
    </footer>
  );
}
