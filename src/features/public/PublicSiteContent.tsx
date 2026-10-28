import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Json } from "../../lib/database.types";
import { supabase } from "../../lib/supabase";

type ContentStatus = "loading" | "ready" | "unavailable" | "error";
type PublishedContentContext = {
  status: ContentStatus;
  records: Record<string, Json>;
};

const publicContentKeys = ["home", "about", "academics", "admissions", "faculty", "gallery", "news", "contact"];

const PublishedContentContext = createContext<PublishedContentContext>({
  status: "unavailable",
  records: {},
});

export function PublicSiteContentProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<ContentStatus>(supabase ? "loading" : "unavailable");
  const [records, setRecords] = useState<Record<string, Json>>({});

  useEffect(() => {
    if (!supabase) {
      setStatus("unavailable");
      return;
    }

    let active = true;
    const timeout = window.setTimeout(() => {
      if (active) setStatus("error");
    }, 10000);
    void (async () => {
      try {
        const { data, error } = await supabase
          .from("school_content")
          .select("content_key, content")
          .eq("is_published", true)
          .in("content_key", publicContentKeys);
        if (!active) return;
        if (error) {
          setStatus("error");
          return;
        }
        setRecords(Object.fromEntries((data ?? []).map(({ content_key, content }) => [content_key, content])));
        setStatus("ready");
      } catch {
        if (active) setStatus("error");
      } finally {
        window.clearTimeout(timeout);
      }
    })();

    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, []);

  const value = useMemo(() => ({ status, records }), [records, status]);
  return <PublishedContentContext.Provider value={value}>{children}</PublishedContentContext.Provider>;
}

export function usePublishedPageContent(contentKey: string) {
  const { records, status } = useContext(PublishedContentContext);
  const raw = records[contentKey];
  const content = isJsonObject(raw) ? raw : null;
  const hasPublishedContent = Boolean(content && Object.keys(content).length);

  return {
    content,
    status,
    hasPublishedContent,
  };
}

export function contentText(
  content: Record<string, Json | undefined> | null,
  key: string,
  fallback: string,
) {
  const value = content?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

export function contentArray(content: Record<string, Json | undefined> | null, key: string) {
  const value = content?.[key];
  return Array.isArray(value) ? value : [];
}

export function isJsonObject(value: Json | undefined): value is { [key: string]: Json | undefined } {
  return value !== undefined && value !== null && typeof value === "object" && !Array.isArray(value);
}

export function publicImageUrl(value: Json | undefined, fallback: string) {
  if (typeof value !== "string" || !value.trim()) return fallback;
  const url = value.trim();
  if (url.startsWith("/") && !url.startsWith("//")) return url;
  try {
    return new URL(url).protocol === "https:" ? url : fallback;
  } catch {
    return fallback;
  }
}

export function PublicContentNotice({ contentKey }: { contentKey: string }) {
  const { status, hasPublishedContent } = usePublishedPageContent(contentKey);

  if (status === "loading") {
    return <p className="public-content-notice" role="status">Loading approved website content; existing page information remains visible.</p>;
  }
  if (status === "error") {
    return <p className="public-content-notice public-content-notice--error" role="status">Published website content could not be loaded. Existing page information remains visible.</p>;
  }
  if (status === "ready" && !hasPublishedContent) {
    return <p className="public-content-notice" role="status">No approved content is published for this page yet; the existing placeholder information is shown.</p>;
  }
  return null;
}
