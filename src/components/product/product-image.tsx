import Image from "next/image";

/** next/image wrapper: SVG artwork is served as-is, raster photography is optimised. */
export function ProductImage({
  src,
  alt,
  width,
  height,
  priority = false,
  sizes = "(min-width: 1024px) 40vw, 90vw",
  className = "",
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  priority?: boolean;
  sizes?: string;
  className?: string;
}) {
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      sizes={sizes}
      preload={priority}
      loading={priority ? "eager" : "lazy"}
      unoptimized={src.endsWith(".svg")}
      className={className}
    />
  );
}
