import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";
import { fetchBanners } from "@/lib/content.functions";
import type { Banner } from "@/lib/content.server";

function Slide({ b }: { b: Banner }) {
  return (
    <div className="relative aspect-[16/7] min-h-[180px] w-full overflow-hidden rounded-2xl sm:aspect-[16/5]">
      <img src={b.image_url} alt={b.title} className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/40 to-transparent" />
      <div className="relative flex h-full max-w-xl flex-col justify-center gap-2 px-6 text-white sm:px-10">
        {b.title && <h2 className="font-display text-2xl font-bold sm:text-4xl">{b.title}</h2>}
        {b.subtitle && <p className="text-sm opacity-90 sm:text-base">{b.subtitle}</p>}
        {b.link_url && b.button_label && (
          <a href={b.link_url} data-testid={`banner-cta-${b.id}`} className="button-glow mt-2 inline-flex w-fit items-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5">
            {b.button_label}
          </a>
        )}
      </div>
      {b.link_url && !b.button_label && <a href={b.link_url} className="absolute inset-0" aria-label={b.title || "Banner"} />}
    </div>
  );
}

export function BannerSlider({ placement }: { placement: "home" | "category" }) {
  const q = useQuery({ queryKey: ["banners", placement], queryFn: () => fetchBanners({ data: { placement } }), staleTime: 60_000 });
  const [api, setApi] = useState<CarouselApi>();
  const [idx, setIdx] = useState(0);
  const list = q.data ?? [];

  useEffect(() => {
    if (!api || list.length < 2) return;
    const on = () => setIdx(api.selectedScrollSnap());
    api.on("select", on);
    const timer = setInterval(() => api.scrollNext(), 6000);
    return () => {
      clearInterval(timer);
      api.off("select", on);
    };
  }, [api, list.length]);

  if (!list.length) return null;
  return (
    <section className="relative" data-testid={`banner-slider-${placement}`}>
      <Carousel setApi={setApi} opts={{ loop: true }}>
        <CarouselContent className="-ml-0">
          {list.map((b) => <CarouselItem key={b.id} className="pl-0"><Slide b={b} /></CarouselItem>)}
        </CarouselContent>
      </Carousel>
      {list.length > 1 && (
        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
          {list.map((b, i) => (
            <button key={b.id} type="button" aria-label={`Slide ${i + 1}`} data-testid={`banner-dot-${i}`} onClick={() => api?.scrollTo(i)}
              className={`h-2 rounded-full transition-all ${i === idx ? "w-6 bg-white" : "w-2 bg-white/50"}`} />
          ))}
        </div>
      )}
    </section>
  );
}
