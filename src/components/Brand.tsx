import { Link } from "react-router";
import { useState } from "react";

type BrandProps = {
  onClick?: () => void;
};

export function Brand({ onClick }: BrandProps) {
  const [logoAvailable, setLogoAvailable] = useState(true);

  return (
    <Link aria-label="Anushra Educational Centre home" className="brand" onClick={onClick} to="/">
      {logoAvailable && (
        <img
          alt=""
          className="brand__image"
          onError={() => setLogoAvailable(false)}
          src="/images/WhatsApp%20Image%202026-10-28%20at%209.36.41%20AM.jpeg"
        />
      )}
      <span className="brand__copy">
        <strong>Anushra</strong>
        <span>Educational Centre</span>
      </span>
    </Link>
  );
}
