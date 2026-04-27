import { useEffect, useRef, useState } from "react";

function BackToTop() {
  const [isVisible, setIsVisible] = useState(false);
  const isVisibleRef = useRef(false);

  useEffect(() => {
    const handleScroll = () => {
      const nextIsVisible = window.scrollY > 320;
      if (nextIsVisible !== isVisibleRef.current) {
        isVisibleRef.current = nextIsVisible;
        setIsVisible(nextIsVisible);
      }
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <button
      type="button"
      className={`back-to-top${isVisible ? " visible" : ""}`}
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Back to top"
    >
      Top
    </button>
  );
}

export default BackToTop;
