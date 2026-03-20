"use client";

import { useRef, useEffect } from "react";
import ProductCard from "./ProductCard";

export interface CarouselProduct {
  id: string;
  slug: string | null;
  title: string;
  price: string;
  condition: string;
  stockQuantity: number;
  imageUrl: string | null;
}

const CARD_W = 220; // px — card width
const GAP = 16; // px — gap between cards
const SPEED = 0.45; // px per rAF frame ≈ 27 px/s @ 60 fps

export default function FeaturedCarousel({ products }: { products: CarouselProduct[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const posRef = useRef(0);
  const pausedRef = useRef(false);
  const rafRef = useRef<number>(0);
  const drag = useRef({ active: false, startX: 0, startPos: 0, moved: 0 });

  // Total width of one full set of cards
  const halfWidth = products.length * (CARD_W + GAP);

  useEffect(() => {
    function tick() {
      if (!pausedRef.current && !drag.current.active) {
        posRef.current -= SPEED;
        if (posRef.current <= -halfWidth) posRef.current += halfWidth;
        if (trackRef.current) {
          trackRef.current.style.transform = `translateX(${posRef.current}px)`;
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [halfWidth]);

  function onMouseEnter() {
    pausedRef.current = true;
  }

  function onMouseLeave() {
    pausedRef.current = false;
    drag.current.active = false;
  }

  function onMouseDown(e: React.MouseEvent) {
    drag.current = { active: true, startX: e.clientX, startPos: posRef.current, moved: 0 };
  }

  function onMouseMove(e: React.MouseEvent) {
    if (!drag.current.active) return;
    const delta = e.clientX - drag.current.startX;
    drag.current.moved = Math.abs(delta);
    let newPos = drag.current.startPos + delta;
    // keep within the loopable range
    while (newPos > 0) newPos -= halfWidth;
    while (newPos <= -halfWidth) newPos += halfWidth;
    posRef.current = newPos;
    if (trackRef.current) trackRef.current.style.transform = `translateX(${newPos}px)`;
  }

  function onMouseUp() {
    drag.current.active = false;
  }

  // Suppress click-through if the user actually dragged
  function onClickCapture(e: React.MouseEvent) {
    if (drag.current.moved > 5) e.stopPropagation();
  }

  // Duplicate the list for seamless infinite looping
  const doubled = [...products, ...products];
  const trackWidth = doubled.length * (CARD_W + GAP);

  return (
    <div
      className="overflow-hidden cursor-grab active:cursor-grabbing select-none"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onClickCapture={onClickCapture}
      onDragStart={(e) => e.preventDefault()}
    >
      <div ref={trackRef} className="flex" style={{ width: trackWidth, gap: GAP }}>
        {doubled.map((product, i) => (
          <div key={`${product.id}-${i}`} style={{ width: CARD_W, flexShrink: 0 }}>
            <ProductCard
              id={product.id}
              slug={product.slug}
              title={product.title}
              price={product.price}
              condition={product.condition}
              stockQuantity={product.stockQuantity}
              imageUrl={product.imageUrl}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
