import React, { useState } from "react";
import { cn } from "../../lib/utils";

interface SmartImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallback?: React.ReactNode;
}

export function SmartImage({ className, src, alt, fallback, ...props }: SmartImageProps) {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  if (error || !src) {
    return <>{fallback || null}</>;
  }

  return (
    <img
      src={src}
      alt={alt}
      className={cn(
        "transition-opacity duration-300",
        !loaded && "opacity-0",
        loaded && "opacity-100",
        className
      )}
      onLoad={() => setLoaded(true)}
      onError={() => setError(true)}
      referrerPolicy="no-referrer"
      {...props}
    />
  );
}
