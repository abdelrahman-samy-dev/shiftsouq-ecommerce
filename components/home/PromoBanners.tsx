// components/home/PromoBanners.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Autoplay, EffectFade } from "swiper/modules";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";

import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import "swiper/css/effect-fade";

interface PromoBannersProps {
  dict: any;
  locale: string;
}

export function PromoBanners({ dict, locale }: PromoBannersProps) {
  const isAr = locale === "ar";

  const sliderImages = [
    "https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=2000&auto=format&fit=crop", // Smartwatch Macro
    "https://images.unsplash.com/photo-1585386959984-a4155224a1ad?q=80&w=2000&auto=format&fit=crop", // Premium Perfume Macro
    "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=2000&auto=format&fit=crop", // Headphones Premium
  ];

  return (
    <section className="w-full flex flex-col lg:grid lg:grid-cols-12 gap-6" dir={isAr ? "rtl" : "ltr"}>

      {/* ── Left Component: Swiper Slider (col-span-8) ──────────────── */}
      <div className="lg:col-span-8 relative rounded-2xl overflow-hidden bg-surface dark:bg-surface-inset border border-border-subtle shadow-glow h-[400px] sm:h-[500px] group/slider">

        {/* Custom Pagination Styles specific to this Swiper */}
        <style dangerouslySetInnerHTML={{
          __html: `
          .promo-pagination .swiper-pagination-bullet {
            width: 8px;
            height: 8px;
            background-color: rgba(255, 255, 255, 0.5);
            border-radius: 4px;
            transition: all 0.4s ease;
            margin: 0 4px !important;
          }
          .promo-pagination .swiper-pagination-bullet-active {
            background-color: white;
            width: 24px;
          }
        `}} />

        <Swiper
          modules={[Navigation, Pagination, Autoplay, EffectFade]}
          effect="fade"
          speed={1000}
          loop={true}
          autoplay={{
            delay: 4500,
            disableOnInteraction: false,
          }}
          navigation={{
            prevEl: ".promo-prev",
            nextEl: ".promo-next",
          }}
          pagination={{
            el: ".promo-pagination",
            clickable: true,
          }}
          className="w-full h-full"
          key={locale}
        >
          {sliderImages.map((src, idx) => (
            <SwiperSlide key={idx} className="relative w-full h-full overflow-hidden">
              <div className="absolute inset-0 w-full h-full">
                <Image
                  src={src}
                  alt={`Promo Slide ${idx + 1}`}
                  fill
                  className="object-cover object-center scale-100 transition-transform duration-[10000ms] ease-out group-hover/slider:scale-105"
                  sizes="(max-width: 1024px) 100vw, 66vw"
                />
              </div>
              {/* Gradient Overlay for text readability */}
              <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent rtl:bg-gradient-to-l" />

              {/* Content Box */}
              <div className="absolute inset-0 flex flex-col justify-center px-8 sm:px-12 w-full sm:w-2/3">
                <h2 className="text-3xl sm:text-5xl font-bold text-white mb-4 drop-shadow-lg leading-tight">
                  {dict.promo?.left?.title || "A little text about the collection"}
                </h2>
                <p className="text-sm sm:text-lg text-gray-200 mb-8 drop-shadow-md">
                  {dict.promo?.left?.subtitle || "Write a smarter text that is short and smarter."}
                </p>
                <div>
                  <Link
                    href="/shop"
                    className="btn-hero text-base sm:text-lg"
                  >
                    <span>{dict.promo?.discover || "Discover"}</span>
                    <ArrowRight size={18} className={`transition-transform duration-300 group-hover/btn:translate-x-1 ${isAr ? 'rtl:-scale-x-100 group-hover/btn:-translate-x-1' : ''}`} />
                  </Link>
                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>

        {/* Navigation Arrows (Glassmorphism) */}
        <div className="promo-prev absolute top-1/2 start-4 z-10 w-10 h-10 border border-white/20 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center cursor-pointer text-white shadow-md transition-all duration-300 -translate-y-1/2 opacity-0 -translate-x-2 rtl:translate-x-2 group-hover/slider:opacity-100 group-hover/slider:translate-x-0 rtl:group-hover/slider:translate-x-0 hover:scale-110 hover:bg-white/30">
          <ChevronLeft size={20} className="rtl:rotate-180" />
        </div>
        <div className="promo-next absolute top-1/2 end-4 z-10 w-10 h-10 border border-white/20 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center cursor-pointer text-white shadow-md transition-all duration-300 -translate-y-1/2 opacity-0 translate-x-2 rtl:-translate-x-2 group-hover/slider:opacity-100 group-hover/slider:translate-x-0 rtl:group-hover/slider:translate-x-0 hover:scale-110 hover:bg-white/30">
          <ChevronRight size={20} className="rtl:rotate-180" />
        </div>

        {/* Pagination Dots */}
        <div className="absolute bottom-6 start-8 sm:start-12 z-10">
          <div className="promo-pagination flex items-center" />
        </div>
      </div>

      {/* ── Right Component: Stacked Banners (col-span-4) ─────────── */}
      <div className="lg:col-span-4 flex flex-col gap-6 h-[400px] sm:h-[500px]">

        {/* Top Banner */}
        <Link href="/category/accessories" className="group card-hover flex-1 relative rounded-2xl overflow-hidden bg-surface dark:bg-surface-inset border border-border-subtle shadow-glow">
          <div className="absolute inset-0">
            <Image
              src="https://images.unsplash.com/photo-1523170335258-f5ed11844a49?q=80&w=1000&auto=format&fit=crop"
              alt="Promo Banner Top"
              fill
              className="object-cover object-center transition-transform duration-[8000ms] group-hover:scale-110"
              sizes="(max-width: 1024px) 100vw, 33vw"
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute inset-0 flex flex-col justify-end p-6">
            <h3 className="text-2xl font-bold text-white mb-1 drop-shadow-md">
              {dict.promo?.rightTop?.title || "Urban Essentials"}
            </h3>
            <p className="text-sm text-gray-300 mb-4 drop-shadow-sm">
              {dict.promo?.rightTop?.subtitle || "Elevate your daily style."}
            </p>
            <div className="btn-glass self-start">
              <span>{dict.promo?.discover || "Discover"}</span>
              <ArrowRight size={14} className={`transition-transform duration-300 group-hover:translate-x-1 ${isAr ? 'rtl:-scale-x-100 group-hover:-translate-x-1' : ''}`} />
            </div>
          </div>
        </Link>

        {/* Bottom Banner */}
        <Link href="/category/men" className="group card-hover flex-1 relative rounded-2xl overflow-hidden bg-surface dark:bg-surface-inset border border-border-subtle shadow-glow">
          <div className="absolute inset-0">
            <Image
              src="https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?q=80&w=1000&auto=format&fit=crop"
              alt="Promo Banner Bottom"
              fill
              className="object-cover object-center transition-transform duration-[8000ms] group-hover:scale-110"
              sizes="(max-width: 1024px) 100vw, 33vw"
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute inset-0 flex flex-col justify-end p-6">
            <h3 className="text-2xl font-bold text-white mb-1 drop-shadow-md">
              {dict.promo?.rightBottom?.title || "Classic Fit"}
            </h3>
            <p className="text-sm text-gray-300 mb-4 drop-shadow-sm">
              {dict.promo?.rightBottom?.subtitle || "Timeless aesthetics."}
            </p>
            <div className="btn-glass self-start">
              <span>{dict.promo?.discover || "Discover"}</span>
              <ArrowRight size={14} className={`transition-transform duration-300 group-hover:translate-x-1 ${isAr ? 'rtl:-scale-x-100 group-hover:-translate-x-1' : ''}`} />
            </div>
          </div>
        </Link>

      </div>
    </section>
  );
}
