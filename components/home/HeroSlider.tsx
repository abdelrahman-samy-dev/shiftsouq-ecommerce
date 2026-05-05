"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Autoplay, EffectFade } from "swiper/modules";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";

// Import Swiper styles
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import "swiper/css/effect-fade";

interface HeroSliderProps {
  dict: any;
  locale: string;
}

export function HeroSlider({ dict, locale }: HeroSliderProps) {
  const isAr = locale === "ar";
  const swiperRef = useRef(null);

  const slides = [
    {
      id: 1,
      image: "https://images.unsplash.com/photo-1505022610485-0249ba5b3675?q=80&w=2070&auto=format&fit=crop",
      title: dict.hero?.slide1?.title || "The Ultimate Collection",
      subtitle: dict.hero?.slide1?.subtitle || "Discover our new arrivals in premium menswear.",
      link: "/category/men",
    },
    {
      id: 2,
      image: "https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?q=80&w=2070&auto=format&fit=crop",
      title: dict.hero?.slide2?.title || "Step Up Your Game",
      subtitle: dict.hero?.slide2?.subtitle || "Exclusive sneakers for every occasion.",
      link: "/category/sneakers",
    },
    {
      id: 3,
      image: "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?q=80&w=2080&auto=format&fit=crop",
      title: dict.hero?.slide3?.title || "Timeless Elegance",
      subtitle: dict.hero?.slide3?.subtitle || "Luxury accessories that make a statement.",
      link: "/category/accessories",
    },
    {
      id: 4,
      image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?q=80&w=2070&auto=format&fit=crop",
      title: dict.hero?.slide4?.title || "Modern Essentials",
      subtitle: dict.hero?.slide4?.subtitle || "Elevate your everyday carry with our premium selection.",
      link: "/category/tech",
    },
  ];

  return (
    <>
      {/* Inject custom Swiper bullet styles */}
      <style dangerouslySetInnerHTML={{
        __html: `
        .swiper-pagination-custom .swiper-pagination-bullet {
          width: 24px;
          height: 4px;
          background-color: rgba(255, 255, 255, 0.4);
          border-radius: 4px;
          transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
          opacity: 1;
          margin: 0 6px !important;
        }
        .swiper-pagination-custom .swiper-pagination-bullet:hover {
          background-color: rgba(255, 255, 255, 0.8);
        }
        .swiper-pagination-custom .swiper-pagination-bullet-active {
          background-color: white;
          width: 48px;
          box-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
        }
      `}} />

      <section className="relative w-full h-[650px] sm:h-[750px] lg:h-[85vh] min-h-[600px] group overflow-hidden" dir={isAr ? "rtl" : "ltr"}>
        <Swiper
          modules={[Navigation, Pagination, Autoplay, EffectFade]}
          effect="fade"
          fadeEffect={{ crossFade: true }}
          speed={1200}
          loop={true}
          autoplay={{
            delay: 5500,
            disableOnInteraction: false,
          }}
          navigation={{
            prevEl: ".swiper-button-prev-custom",
            nextEl: ".swiper-button-next-custom",
          }}
          pagination={{
            el: ".swiper-pagination-custom",
            clickable: true,
          }}
          className="w-full h-full"
          key={locale} // Re-mount Swiper on locale change to fix RTL internal direction
        >
          {slides.map((slide) => (
            <SwiperSlide key={slide.id} className="relative w-full h-full overflow-hidden">
              {/* Background Image with subtle zoom animation */}
              <div className="absolute inset-0 w-full h-full">
                <Image
                  src={slide.image}
                  alt={slide.title}
                  fill
                  priority={slide.id === 1}
                  className="object-cover object-center scale-100 transition-transform duration-[10000ms] ease-out hover:scale-105"
                  sizes="100vw"
                />
              </div>

              {/* Cinematic Vignette Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/60 pointer-events-none" />

              {/* Centered Content Container */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="max-w-4xl w-full px-6 sm:px-8 text-center flex flex-col items-center">

                  {/* Small decorative line */}
                  <div className="w-12 h-1 bg-white/80 rounded-full mb-8 animate-fade-in-up" style={{ animationDelay: '100ms' }} />

                  <h2
                    className="text-4xl sm:text-6xl lg:text-7xl font-black text-white mb-6 uppercase tracking-wider drop-shadow-2xl animate-fade-in-up"
                    style={{ animationDelay: '200ms', textShadow: '0 4px 20px rgba(0,0,0,0.5)' }}
                  >
                    {slide.title}
                  </h2>

                  <p
                    className="text-lg sm:text-2xl text-gray-200 mb-10 max-w-2xl drop-shadow-lg leading-relaxed animate-fade-in-up font-light"
                    style={{ animationDelay: '300ms' }}
                  >
                    {slide.subtitle}
                  </p>

                  {/* Modern Premium Button */}
                  <div className="animate-fade-in-up" style={{ animationDelay: '400ms' }}>
                    <Link
                      href={slide.link}
                      className="btn-hero group relative text-base sm:text-lg"
                    >
                      <span className="relative z-10">{dict.hero?.discover || "Discover Now"}</span>
                      <ArrowRight size={20} className={`relative z-10 transition-transform duration-300 group-hover:translate-x-1 ${isAr ? 'rtl:-scale-x-100 group-hover:-translate-x-1' : ''}`} />

                      {/* Button Hover effect background */}
                      <div className="absolute inset-0 bg-gray-200 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out rounded-full" />
                    </Link>
                  </div>

                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>

        {/* Custom Navigation Arrows - Premium Glassmorphism */}
        <div className="swiper-button-prev-custom absolute top-1/2 start-4 sm:start-8 z-10 w-14 h-14 border border-white/20 bg-black/20 hover:bg-white/10 hover:border-white/60 backdrop-blur-md rounded-full flex items-center justify-center cursor-pointer text-white shadow-[0_4px_30px_rgba(0,0,0,0.3)] transition-all duration-500 -translate-y-1/2 opacity-0 -translate-x-4 rtl:translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 rtl:group-hover:translate-x-0 hover:scale-110">
          <ChevronLeft size={28} className="rtl:rotate-180" strokeWidth={1.5} />
        </div>
        <div className="swiper-button-next-custom absolute top-1/2 end-4 sm:end-8 z-10 w-14 h-14 border border-white/20 bg-black/20 hover:bg-white/10 hover:border-white/60 backdrop-blur-md rounded-full flex items-center justify-center cursor-pointer text-white shadow-[0_4px_30px_rgba(0,0,0,0.3)] transition-all duration-500 -translate-y-1/2 opacity-0 translate-x-4 rtl:-translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 rtl:group-hover:translate-x-0 hover:scale-110">
          <ChevronRight size={28} className="rtl:rotate-180" strokeWidth={1.5} />
        </div>

        {/* Custom Pagination - Centered Dashes */}
        <div className="absolute bottom-10 start-0 w-full z-10 flex justify-center">
          <div className="swiper-pagination-custom flex items-center justify-center" />
        </div>
      </section>
    </>
  );
}
