import * as React from "react";

type Orientation = "portrait" | "landscape";

export function useMobileOrientation() {
  const [orientation, setOrientation] = React.useState<Orientation | undefined>(
    undefined
  );

  React.useEffect(() => {
    // Initial orientation detection
    const updateOrientation = () => {
      if (window.innerHeight > window.innerWidth) {
        setOrientation("portrait");
      } else {
        setOrientation("landscape");
      }
    };

    // Set initial orientation
    updateOrientation();

    // Listen for orientation changes
    window.addEventListener("resize", updateOrientation);
    window.addEventListener("orientationchange", updateOrientation);

    return () => {
      window.removeEventListener("resize", updateOrientation);
      window.removeEventListener("orientationchange", updateOrientation);
    };
  }, []);

  return orientation;
}