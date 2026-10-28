import { useState } from "react";
import { X } from "lucide-react";
import { galleryImages } from "../../data/siteContent";
import { PageHero } from "../../components/PageHero";
import { contentArray, contentText, isJsonObject, publicImageUrl, PublicContentNotice, usePublishedPageContent } from "./PublicSiteContent";

export default function GalleryPage() {
  const { content } = usePublishedPageContent("gallery");
  const publishedImages = contentArray(content, "images")
    .map((value) => isJsonObject(value) ? value : null)
    .filter((value): value is NonNullable<typeof value> => Boolean(value))
    .map((value) => ({
      alt: contentText(value, "alt", ""),
      image: publicImageUrl(value.image, ""),
      label: contentText(value, "label", ""),
    }))
    .filter(({ image, label }) => image && label);
  const images = publishedImages.length ? publishedImages : galleryImages;
  const illustrative = !publishedImages.length;
  const [selectedImage, setSelectedImage] = useState<(typeof images)[number] | null>(null);

  return (
    <>
      <PageHero
        description={contentText(content, "heroDescription", "A visual moodboard for the kinds of school moments we hope to celebrate.")}
        eyebrow="Gallery"
        title={contentText(content, "heroTitle", "A little window into learning.")}
      />
      <div className="container"><PublicContentNotice contentKey="gallery" /></div>
      <section className="section-pad">
        <div className="container">
          {illustrative && <div className="gallery-notice">
            <span className="gallery-notice__dot" />
            Illustrative demo imagery — these are not photographs of Anushra Educational Centre.
          </div>}
          <div className="gallery-grid">
            {images.map((item, index) => (
              <button
                aria-label={`View image: ${item.label}${illustrative ? " (illustrative demo image)" : ""}`}
                className={`gallery-tile gallery-tile--${index + 1}`}
                key={`${item.label}-${item.image}`}
                onClick={() => setSelectedImage(item)}
                type="button"
              >
                <img alt={item.alt} loading="lazy" src={item.image} />
                <span>{item.label}{illustrative && <small>Illustrative</small>}</span>
              </button>
            ))}
          </div>
        </div>
      </section>
      {selectedImage && (
        <div className="image-modal" onClick={() => setSelectedImage(null)} role="presentation">
          <div
            aria-labelledby="gallery-modal-title"
            aria-modal="true"
            className="image-modal__content"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <button aria-label="Close image preview" className="image-modal__close" onClick={() => setSelectedImage(null)} type="button"><X size={22} /></button>
            <img alt={selectedImage.alt} src={selectedImage.image} />
            <h2 id="gallery-modal-title">{selectedImage.label}</h2>
            <p>{illustrative ? "Illustrative demo image — not an official school photograph." : "Published school gallery image."}</p>
          </div>
        </div>
      )}
    </>
  );
}
