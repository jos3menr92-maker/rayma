/**
 * Compresses and resizes an image file using canvas before upload.
 * Reduces large phone photos (5-10MB) to a manageable size (~500KB-1MB),
 * preventing "Failed to fetch" timeouts during upload and LLM analysis.
 * Non-image files (PDFs) are returned as-is.
 */
export async function compressImage(file, maxWidth = 1600, maxHeight = 1600, quality = 0.8) {
  if (!file.type.startsWith("image/")) return file;

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let { naturalWidth: width, naturalHeight: height } = img;

      // Scale down if exceeds max dimensions
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return; }
          const compressed = new File(
            [blob],
            file.name.replace(/\.(png|webp|heic|heif)$/i, ".jpg"),
            { type: "image/jpeg", lastModified: Date.now() }
          );
          resolve(compressed);
        },
        "image/jpeg",
        quality
      );
    };
    img.onerror = () => resolve(file); // fallback to original on error
    img.src = URL.createObjectURL(file);
  });
}