import { CalendarDays, Newspaper } from "lucide-react";
import { NewsCard } from "../../components/NewsCard";
import { PageHero } from "../../components/PageHero";
import { newsItems } from "../../data/siteContent";
import { contentArray, contentText, isJsonObject, publicImageUrl, PublicContentNotice, usePublishedPageContent } from "./PublicSiteContent";

export default function NewsPage() {
  const { content } = usePublishedPageContent("news");
  const publishedNews = contentArray(content, "items")
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
      <PageHero
        description={contentText(content, "heroDescription", "A place for the little moments, learning highlights and school updates worth sharing.")}
        eyebrow="News & events"
        title={contentText(content, "heroTitle", "Good things are growing.")}
      />
      <div className="container"><PublicContentNotice contentKey="news" /></div>
      <section className="section-pad">
        <div className="container">
          {!publishedNews.length && <div className="news-page-banner">
            <CalendarDays aria-hidden="true" size={20} />
            <p><strong>Demo content:</strong> The stories below are examples, not official Anushra news or scheduled events.</p>
          </div>}
          <div className="news-grid news-grid--page">
            {displayedNews.map((item) => <NewsCard item={item} key={item.title} published={Boolean(publishedNews.length)} />)}
          </div>
          {!publishedNews.length && <div className="empty-state">
            <Newspaper aria-hidden="true" className="empty-state__symbol" size={28} strokeWidth={1.7} />
            <h2>More stories are on their way.</h2>
            <p>Verified school news and event dates will be added when available.</p>
          </div>}
        </div>
      </section>
    </>
  );
}
