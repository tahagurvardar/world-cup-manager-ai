import { useState } from "react";

const sizeClasses = {
  xs: "h-4 w-6",
  sm: "h-5 w-8",
  md: "h-7 w-10",
  lg: "h-9 w-14",
  xl: "h-12 w-20",
};

export default function Flag({ src, alt = "Team flag", size = "md", className = "" }) {
  const [failedSrc, setFailedSrc] = useState("");
  const sizeClass = sizeClasses[size] || sizeClasses.md;
  const classes = `${sizeClass} shrink-0 rounded-sm border border-white/15 bg-white/[0.06] object-cover shadow-sm ${className}`.trim();
  const failed = Boolean(src && failedSrc === src);

  if (!src || failed) {
    return (
      <span className={`grid place-items-center ${classes}`} aria-label={alt} role="img">
        <span className="h-2 w-2 rounded-full bg-pitch-300/80" />
      </span>
    );
  }

  return <img src={src} alt={alt} loading="lazy" className={classes} onError={() => setFailedSrc(src)} />;
}
