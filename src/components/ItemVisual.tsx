"use client";

import {
  Bean,
  Beef,
  Drumstick,
  Droplets,
  Fish,
  Package,
  ShoppingBasket,
  Wheat,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { BUILT_IN_IMAGES } from "@/lib/catalogStore";

const ICONS: Record<string, LucideIcon> = {
  "icon:wheat": Wheat,
  "icon:bean": Bean,
  "icon:droplets": Droplets,
  "icon:package": Package,
  "icon:drumstick": Drumstick,
  "icon:beef": Beef,
  "icon:fish": Fish,
  "icon:basket": ShoppingBasket,
};

export function isPhotoUrl(imageUrl: string) {
  return (
    imageUrl.startsWith("data:image/") ||
    imageUrl.startsWith("https://") ||
    imageUrl.startsWith("http://")
  );
}

export function ItemVisual({
  imageUrl,
  name,
}: {
  imageUrl: string;
  name: string;
}) {
  if (isPhotoUrl(imageUrl)) {
    return (
      // User-supplied photos can be data URLs or external links, which next/image will not accept.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt=""
        className="h-44 w-full rounded-2xl object-cover"
      />
    );
  }

  const Icon = ICONS[imageUrl] ?? Package;
  return (
    <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-navy text-white">
      <Icon aria-hidden="true" size={36} />
      <span className="sr-only">{name}</span>
    </div>
  );
}

export function ImagePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const [link, setLink] = useState(
    isPhotoUrl(value) && !value.startsWith("data:") ? value : "",
  );

  function applyLink(nextLink: string) {
    const next = nextLink.trim();
    if (next.startsWith("http://") || next.startsWith("https://")) {
      onChange(next);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-base font-bold text-navy">Picture</p>
      <div className="flex flex-wrap gap-2">
        {BUILT_IN_IMAGES.map((image) => {
          const selected = value === image.id;
          return (
            <button
              key={image.id}
              type="button"
              aria-pressed={selected}
              onClick={() => {
                setLink("");
                onChange(image.id);
              }}
              className={
                selected
                  ? "min-h-12 rounded-lg bg-navy px-3 text-base font-bold text-white"
                  : "min-h-12 rounded-lg border-2 border-navy bg-white px-3 text-base font-bold text-navy"
              }
            >
              {image.label}
            </button>
          );
        })}
      </div>
      <label className="block text-base font-bold text-navy">
        <span className="mb-1 block">Or paste an image link</span>
        <input
          value={link}
          onChange={(event) => setLink(event.target.value)}
          onBlur={() => applyLink(link)}
          placeholder="https://"
          className="min-h-12 w-full rounded-lg border-2 border-navy px-3 text-lg"
        />
      </label>
      <label className="block text-base font-bold text-navy">
        <span className="mb-1 block">Or upload a photo (under 1.2 MB)</span>
        <input
          type="file"
          accept="image/*"
          className="block w-full text-base"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            if (file.size > 1_200_000) {
              window.alert("Please choose a photo under 1.2 MB, or paste an image link.");
              return;
            }
            const reader = new FileReader();
            reader.onload = () => {
              const result = reader.result;
              if (typeof result === "string") {
                setLink("");
                onChange(result);
              }
            };
            reader.readAsDataURL(file);
          }}
        />
      </label>
    </div>
  );
}
