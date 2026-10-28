import type { LucideIcon } from "lucide-react";

type FeatureCardProps = {
  description: string;
  icon: LucideIcon;
  title: string;
};

export function FeatureCard({ description, icon: Icon, title }: FeatureCardProps) {
  return (
    <article className="feature-card">
      <span aria-hidden="true" className="feature-card__icon">
        <Icon size={23} strokeWidth={1.7} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
    </article>
  );
}
