import { ArrowUpRight } from "lucide-react";
import type { NewsItem } from "../data/siteContent";
import { RouterButton } from "./Button";

type NewsCardProps = {
  item: NewsItem;
  published?: boolean;
};

export function NewsCard({ item, published = false }: NewsCardProps) {
  return (
    <article className="news-card">
      <div className="news-card__image">
        <img alt="" loading="lazy" src={item.image} />
        <span className="news-card__category">{item.category}</span>
      </div>
      <div className="news-card__body">
        <p className="news-card__date">{item.date}{published ? "" : " · Demo content"}</p>
        <h3>{item.title}</h3>
        <p>{item.description}</p>
        <RouterButton className="text-link" to="/news" variant="secondary">
          Read the story <ArrowUpRight aria-hidden="true" size={16} />
        </RouterButton>
      </div>
    </article>
  );
}
