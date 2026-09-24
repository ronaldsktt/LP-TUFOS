import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PixCheckout } from "../components/PixCheckout";
import { CLONE_BODY, CLONE_CSS } from "../clone-data";
const reviewImages = [
  "/clones/cmueqtwv600w5xt5bgb4bp3h3/reviews/dep02.jpg",
  "/clones/cmueqtwv600w5xt5bgb4bp3h3/reviews/dep03.jpg",
  "/clones/cmueqtwv600w5xt5bgb4bp3h3/reviews/dep04.jpg",
  "/clones/cmueqtwv600w5xt5bgb4bp3h3/reviews/dep05.jpg",
  "/clones/cmueqtwv600w5xt5bgb4bp3h3/reviews/dep06.jpg",
  "/clones/cmueqtwv600w5xt5bgb4bp3h3/reviews/dep07.jpg",
  "/clones/cmueqtwv600w5xt5bgb4bp3h3/reviews/dep08.jpg",
];

function withoutEssencialPlan(html: string) {
  const cardStart = html.indexOf(
    '<div class="relative rounded-xl bg-[#0a0a0a] ring-1 ring-white/10 transition hover:-translate-y-0.5 p-7 lg:p-9 flex flex-col"',
  );
  const sectionClose = html.indexOf("</section>", cardStart);
  if (cardStart === -1 || sectionClose === -1) return html;

  return (
    html.slice(0, cardStart) +
    "</div></div></section>" +
    html.slice(sectionClose + "</section>".length)
  ).replace(
    "mt-14 grid grid-cols-1 lg:grid-cols-[1.1fr_.9fr] gap-5 lg:gap-6 items-stretch",
    "mt-14 grid grid-cols-1 max-w-xl mx-auto gap-5 items-stretch",
  );
}

const PAGE_BODY = withoutEssencialPlan(CLONE_BODY);

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes",
      },
      { name: "theme-color", content: "#000000" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      {
        name: "apple-mobile-web-app-status-bar-style",
        content: "black-translucent",
      },
      { name: "apple-mobile-web-app-title", content: "Biblioteca VIP" },
      { title: "Biblioteca VIP - Oásis Secreto" },
      {
        name: "description",
        content:
          "Biblioteca VIP - Oásis secreto do prazer em quadrinhos e vídeos. Pagamento único, acesso vitalício e entrega imediata.",
      },
      { property: "og:title", content: "Biblioteca VIP - Oásis Secreto" },
      {
        property: "og:description",
        content: "Oásis secreto do prazer em quadrinhos e vídeos",
      },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Bodoni+Moda:opsz,wght@6..96,400;700&family=Lora:ital,wght@0,400;0,600;1,400&family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
      },
    ],
    scripts: [
      {
        src: "https://scripts.converteai.net/ecb7cc3e-2f9b-4d53-9e24-e0b3f913bd3c/players/699f2e8448d2f9414f11d66a/v4/player.js",
        type: "module",
        async: true,
      },
    ],
  }),
  component: ClonePage,
});

function isBuyCta(element: HTMLElement) {
  const text = (element.innerText || element.textContent || "").toLowerCase();
  return (
    element.classList.contains("btn-compra") ||
    element.classList.contains("btn-gold-v2") ||
    text.includes("adquirir aplicativo") ||
    text.includes("quero meu acesso") ||
    text.includes("quero acesso")
  );
}

function ClonePage() {
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  useEffect(() => {
    const videos = Array.from(document.querySelectorAll<HTMLVideoElement>("video"));
    const handlers: Array<[HTMLElement, (e: Event) => void]> = [];

    for (const video of videos) {
      const overlay = video.nextElementSibling as HTMLElement | null;
      const overlayLabel = overlay?.querySelector("span");
      const initialLabel = overlayLabel?.textContent ?? "";
      const setOverlay = (visible: boolean, paused = false) => {
        if (overlay) overlay.style.display = visible ? "" : "none";
        if (overlayLabel && video.hasAttribute("data-main-video")) {
          overlayLabel.textContent = paused ? "PAUSADO" : initialLabel;
        }
      };
      let userStartedPlayback = false;
      video.muted = true;
      void video.play().catch(() => {
        video.addEventListener("canplay", () => void video.play(), { once: true });
      });
      const clickTarget = video.parentElement ?? video;
      const onClick = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        if (!userStartedPlayback) {
          userStartedPlayback = true;
          video.muted = false;
          void video.play();
          setOverlay(false);
        } else {
          userStartedPlayback = false;
          video.pause();
          setOverlay(true, true);
        }
      };
      const onPause = () => {
        if (userStartedPlayback) {
          userStartedPlayback = false;
          setOverlay(true, true);
        }
      };
      const onPlay = () => {
        if (userStartedPlayback) setOverlay(false);
      };
      clickTarget.addEventListener("click", onClick);
      video.addEventListener("pause", onPause);
      video.addEventListener("play", onPlay);
      handlers.push([clickTarget, onClick]);
      handlers.push([video, onPause]);
      handlers.push([video, onPlay]);
      clickTarget.style.cursor = "pointer";
    }

    const carousels = Array.from(document.querySelectorAll<HTMLElement>(".snap-x"));
    const scrollCleanups: Array<() => void> = [];
    for (const carousel of carousels) {
      const cards = Array.from(carousel.querySelectorAll<HTMLElement>(".snap-center"));
      if (!cards.length) continue;
      let dotsContainer: HTMLElement | null = null;
      let node: Element | null = carousel;
      for (let i = 0; i < 4 && node; i++) {
        node = node.nextElementSibling;
        if (node && node.children.length >= 2 && (node as HTMLElement).classList.contains("flex")) {
          dotsContainer = node as HTMLElement;
          break;
        }
      }
      if (!dotsContainer) continue;
      const dots = Array.from(dotsContainer.children) as HTMLElement[];
      if (dots.length !== cards.length) continue;

      const activeDot = dots[0]!;
      const inactiveDot = dots[1] ?? activeDot;
      const activeClass = activeDot.className;
      const inactiveClass = inactiveDot.className;
      const activeStyle = activeDot.getAttribute("style") ?? "";
      const inactiveStyle = inactiveDot.getAttribute("style") ?? "";

      const update = () => {
        const cr = carousel.getBoundingClientRect();
        const center = cr.left + cr.width / 2;
        let activeIndex = 0;
        let best = Infinity;
        cards.forEach((card, i) => {
          const r = card.getBoundingClientRect();
          const dist = Math.abs(r.left + r.width / 2 - center);
          if (dist < best) {
            best = dist;
            activeIndex = i;
          }
        });
        dots.forEach((dot, i) => {
          if (i === activeIndex) {
            dot.className = activeClass;
            dot.setAttribute("style", activeStyle);
          } else {
            dot.className = inactiveClass;
            dot.setAttribute("style", inactiveStyle);
          }
        });
      };
      const onScroll = () => update();
      carousel.addEventListener("scroll", onScroll, { passive: true });
      update();
      scrollCleanups.push(() => carousel.removeEventListener("scroll", onScroll));
    }

    const reviewImage = document.querySelector<HTMLImageElement>("[data-review-image]");
    if (reviewImage) {
      const reviewSection = reviewImage.closest("section");
      const previousButton = reviewSection?.querySelector<HTMLButtonElement>('[aria-label="Anterior"]');
      const nextButton = reviewSection?.querySelector<HTMLButtonElement>('[aria-label="Próximo"]');
      const reviewDots = Array.from(
        reviewSection?.querySelectorAll<HTMLButtonElement>('[aria-label^="Ir para slide"]') ?? [],
      );
      const allReviewImages = [reviewImage.currentSrc || reviewImage.src, ...reviewImages];
      const activeClass = reviewDots[0]?.className ?? "";
      const inactiveClass = reviewDots[1]?.className ?? activeClass;
      const activeStyle = reviewDots[0]?.getAttribute("style") ?? "";
      const inactiveStyle = reviewDots[1]?.getAttribute("style") ?? activeStyle;
      let activeReview = 0;

      const showReview = (index: number) => {
        activeReview = (index + allReviewImages.length) % allReviewImages.length;
        reviewImage.src = allReviewImages[activeReview] ?? allReviewImages[0] ?? "";
        reviewImage.alt = `Depoimento ${activeReview + 1}`;
        reviewDots.forEach((dot, dotIndex) => {
          const isActive = dotIndex === activeReview;
          dot.className = isActive ? activeClass : inactiveClass;
          dot.setAttribute("style", isActive ? activeStyle : inactiveStyle);
          dot.setAttribute("aria-current", isActive ? "true" : "false");
        });
      };

      const showPrevious = () => showReview(activeReview - 1);
      const showNext = () => showReview(activeReview + 1);
      previousButton?.addEventListener("click", showPrevious);
      nextButton?.addEventListener("click", showNext);
      reviewDots.forEach((dot, index) => {
        const showSelected = () => showReview(index);
        dot.addEventListener("click", showSelected);
        scrollCleanups.push(() => dot.removeEventListener("click", showSelected));
      });
      showReview(0);
      scrollCleanups.push(() => previousButton?.removeEventListener("click", showPrevious));
      scrollCleanups.push(() => nextButton?.removeEventListener("click", showNext));
    }

    const timerSpans = Array.from(
      document.querySelectorAll<HTMLElement>("span.tabular-v2.text-gold-grad"),
    ).filter((s) => /^\d{2}$/.test((s.textContent ?? "").trim()));
    const timers: HTMLElement[][] = [];
    for (let i = 0; i + 2 < timerSpans.length; i += 3) timers.push(timerSpans.slice(i, i + 3));
    let remaining = 19 * 60 + 35;
    const pad = (n: number) => String(n).padStart(2, "0");
    const renderTimers = () => {
      const h = Math.floor(remaining / 3600);
      const m = Math.floor((remaining % 3600) / 60);
      const s = remaining % 60;
      for (const [hEl, mEl, sEl] of timers) {
        if (hEl) hEl.textContent = pad(h);
        if (mEl) mEl.textContent = pad(m);
        if (sEl) sEl.textContent = pad(s);
      }
    };
    renderTimers();
    const timerId = window.setInterval(() => {
      if (remaining > 0) {
        remaining -= 1;
        renderTimers();
      } else {
        window.clearInterval(timerId);
      }
    }, 1000);
    scrollCleanups.push(() => window.clearInterval(timerId));

    const openCheckout = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
      setCheckoutOpen(true);
    };

    const buyButtons = Array.from(document.querySelectorAll<HTMLElement>("a, button")).filter(isBuyCta);
    for (const button of buyButtons) {
      button.addEventListener("click", openCheckout);
      if (button instanceof HTMLAnchorElement) {
        button.removeAttribute("target");
        button.setAttribute("href", "#comprar");
      }
      button.style.cursor = "pointer";
      scrollCleanups.push(() => button.removeEventListener("click", openCheckout));
    }

    return () => {
      for (const [element, handler] of handlers) element.removeEventListener("click", handler);
      for (const cleanup of scrollCleanups) cleanup();
    };
  }, []);

  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: `<style>${CLONE_CSS}</style>${PAGE_BODY}` }} />
      <PixCheckout open={checkoutOpen} onClose={() => setCheckoutOpen(false)} />
    </>
  );
}
