/**
 * Client-side image utilities.
 *
 * Pure functions with no React dependency — can be imported from any
 * client component or utility module.
 */

export function formatBytes(value: number): string {
  if (value < 1024) {
    return `${value} B`;
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }

  return `${(value / (1024 * 1024)).toFixed(2)} MB`;
}

function fitImage(width: number, height: number, maxSide: number) {
  const ratio = Math.min(1, maxSide / Math.max(width, height));
  return {
    height: Math.round(height * ratio),
    width: Math.round(width * ratio),
  };
}

async function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Gagal membaca file gambar."));
    image.src = source;
  });
}

export async function convertImageToWebp(file: File): Promise<File> {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await loadImage(objectUrl);
    const dimensions = fitImage(image.naturalWidth, image.naturalHeight, 1600);
    const canvas = document.createElement("canvas");
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Browser tidak bisa membuat canvas untuk konversi WebP.");
    }

    context.drawImage(image, 0, 0, dimensions.width, dimensions.height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/webp", 0.88);
    });

    if (!blob) {
      throw new Error("Konversi ke WebP gagal.");
    }

    const baseName = file.name.replace(/\.[^.]+$/, "") || "foto-presensi";
    return new File([blob], `${baseName}.webp`, {
      lastModified: Date.now(),
      type: "image/webp",
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
