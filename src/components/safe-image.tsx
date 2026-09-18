"use client";

import React, { useState, useEffect } from "react";
import { Building2, FileText, ImageIcon } from "lucide-react";

interface SafeImageProps {
  src?: string | null;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
  imgStyle?: React.CSSProperties;
  fallbackType?: "property" | "blog" | "generic";
  iconSize?: number;
  priority?: boolean;
}

export function SafeImage({
  src,
  alt = "",
  className,
  style,
  imgStyle,
  fallbackType = "blog",
  iconSize = 22,
}: SafeImageProps) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">(() =>
    src ? "loading" : "error"
  );

  useEffect(() => {
    if (!src) {
      setStatus("error");
      return;
    }
    setStatus("loading");
  }, [src]);

  const FallbackIcon =
    fallbackType === "property"
      ? Building2
      : fallbackType === "blog"
      ? FileText
      : ImageIcon;

  return (
    <div
      className={`safe-image-wrapper ${className || ""}`}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        backgroundColor: "#f1f5f9",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        ...style,
      }}
    >
      {/* Fallback & Loading Placeholder */}
      {status !== "loaded" && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#f8fafc",
            color: "#94a3b8",
            zIndex: 1,
            pointerEvents: "none",
          }}
        >
          <FallbackIcon
            size={iconSize}
            style={{
              opacity: 0.65,
              animation: status === "loading" ? "safe-image-pulse 1.6s ease-in-out infinite" : "none",
            }}
          />
        </div>
      )}

      {/* Actual Image */}
      {src && status !== "error" && (
        <img
          src={src}
          alt={status === "loaded" ? alt : ""}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onLoad={() => setStatus("loaded")}
          onError={() => setStatus("error")}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: status === "loaded" ? 1 : 0,
            transition: "opacity 0.25s ease-in-out",
            zIndex: 2,
            ...imgStyle,
          }}
        />
      )}
    </div>
  );
}
