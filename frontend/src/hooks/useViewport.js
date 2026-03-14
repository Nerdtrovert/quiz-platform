import { useEffect, useState } from "react";

function getWidth() {
  if (typeof window === "undefined") return 1280;
  return window.innerWidth;
}

export default function useViewport() {
  const [width, setWidth] = useState(getWidth);

  useEffect(() => {
    const handleResize = () => setWidth(getWidth());
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return {
    width,
    isMobile: width < 768,
    isTablet: width < 1024,
  };
}
