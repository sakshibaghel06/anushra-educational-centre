type PageHeroProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function PageHero({ description, eyebrow, title }: PageHeroProps) {
  return (
    <section className="page-hero">
      <div className="container page-hero__inner">
        <span className="eyebrow eyebrow--light">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
    </section>
  );
}
