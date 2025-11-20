import { useState, useEffect, useRef } from "react";
import { ArrowUp } from "lucide-react";
import { Button } from "./ui/button";

export const BackToTop = () => {
  const [isVisible, setIsVisible] = useState(false);
  const lastScrollY = useRef(0);
  const isAtTop = useRef(true);

  useEffect(() => {
    const toggleVisibility = () => {
      const currentScrollY = window.scrollY;

      // If we're at the top, mark it and hide button
      if (currentScrollY <= 10) {
        isAtTop.current = true;
        setIsVisible(false);
      } 
      // If we've scrolled down from top past 200px, show button
      else if (currentScrollY > 200 && isAtTop.current) {
        isAtTop.current = false;
        setIsVisible(true);
      }
      // Keep button visible if we're past 200px and not at top
      else if (currentScrollY > 200 && !isAtTop.current) {
        setIsVisible(true);
      }
      // Hide button if we're below threshold
      else if (currentScrollY <= 200 && !isAtTop.current) {
        setIsVisible(false);
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", toggleVisibility, { passive: true });

    return () => {
      window.removeEventListener("scroll", toggleVisibility);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
    // Immediately hide button after clicking
    setIsVisible(false);
    isAtTop.current = true;
  };

  if (!isVisible) return null;

  return (
    <Button
      onClick={scrollToTop}
      size="icon"
      className="fixed bottom-20 right-4 z-50 h-12 w-12 rounded-full shadow-lg animate-fade-in md:bottom-6 md:right-6"
      aria-label="Back to top"
    >
      <ArrowUp className="h-5 w-5" />
    </Button>
  );
};
