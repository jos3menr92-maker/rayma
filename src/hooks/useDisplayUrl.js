import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

/**
 * Returns true if the stored value is a private file URI (not a public http URL).
 * Legacy documents stored public URLs; new documents store private file URIs.
 */
export function isPrivateFileUri(url) {
  return !!url && !url.startsWith("http");
}

/**
 * Takes any stored file reference (public URL or private file URI) and returns
 * a displayable URL. Private URIs are converted to time-limited signed URLs;
 * public URLs are returned as-is for backward compatibility.
 */
export function useDisplayUrl(url, expiresIn = 300) {
  const [displayUrl, setDisplayUrl] = useState(() => (url && url.startsWith("http") ? url : null));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!url) { setDisplayUrl(null); return; }

    // Legacy public URLs are directly displayable
    if (url.startsWith("http")) { setDisplayUrl(url); return; }

    // Private file URI — generate a time-limited signed URL
    let active = true;
    setLoading(true);
    base44.integrations.Core.CreateFileSignedUrl({ file_uri: url, expires_in: expiresIn })
      .then((res) => { if (active) setDisplayUrl(res.signed_url); })
      .catch(() => { if (active) setDisplayUrl(null); })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [url, expiresIn]);

  return { url: displayUrl, loading };
}