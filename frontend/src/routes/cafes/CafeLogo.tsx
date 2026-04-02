import { useEffect, useState } from "react";

import { Typography } from "antd";

type CafeLogoProps = {
  logoUrl?: string | null;
  alt: string;
  variant: "grid" | "form";
};

const VARIANT_STYLES = {
  grid: {
    container: {
      width: 64,
      height: 40,
      borderRadius: 10,
      padding: 6,
    },
    fallbackText: "No logo",
  },
  form: {
    container: {
      width: 160,
      height: 96,
      borderRadius: 16,
      padding: 12,
    },
    fallbackText: "Preview unavailable",
  },
} as const;

export function CafeLogo({ logoUrl, alt, variant }: CafeLogoProps) {
  const normalizedLogoUrl = logoUrl?.trim() ?? "";
  const [hasLoadError, setHasLoadError] = useState(false);

  useEffect(() => {
    setHasLoadError(false);
  }, [normalizedLogoUrl]);

  const variantStyle = VARIANT_STYLES[variant];
  const showImage = normalizedLogoUrl.length > 0 && !hasLoadError;

  return (
    <div
      style={{
        ...variantStyle.container,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxSizing: "border-box",
        border: "1px solid #d9d9d9",
        background: "linear-gradient(135deg, #faf7f2 0%, #f3efe8 100%)",
        overflow: "hidden",
      }}
    >
      {showImage ? (
        <img
          alt={alt}
          src={normalizedLogoUrl}
          onError={() => setHasLoadError(true)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            display: "block",
          }}
        />
      ) : (
        <Typography.Text
          aria-label={`${alt} placeholder`}
          type="secondary"
          style={{
            fontSize: variant === "grid" ? 12 : 14,
            lineHeight: 1.2,
            textAlign: "center",
          }}
        >
          {variantStyle.fallbackText}
        </Typography.Text>
      )}
    </div>
  );
}
