# E-Commerce / Product Design

You're designing for selling — the design should make products look desirable and purchasing effortless.

## Core Principles

- **Product is hero.** Large, clean product images. Everything else supports the product.
- **Trust signals everywhere.** Reviews, ratings, secure checkout badges, return policy.
- **Urgency without sleaze.** "Only 3 left" is fine. Fake countdown timers are not.
- **Frictionless path to purchase.** Add to cart -> Checkout in as few steps as possible.

## Key Pages

**Product listing**: Grid of product cards. Each: image (aspect-square), name, price, rating. Filter sidebar optional.
**Product detail**: Large image left (or top on mobile) + details right. Price prominent. Add to cart button BIG.
**Cart**: Line items with image, name, qty, price. Clear subtotal. Prominent checkout button.
**Checkout**: Minimal distractions. No nav links. Just the form and order summary.

## Product Cards

```jsx
<div className="flex flex-col gap-3 grow">
  <div className="w-full aspect-square bg-muted rounded-xl overflow-hidden">
    <img src="https://placehold.co/400x400" className="w-full h-full" alt="Product" />
  </div>
  <div className="flex flex-col gap-1">
    <span className="text-sm font-medium text-foreground">Product Name</span>
    <span className="text-sm font-bold text-foreground">$49.00</span>
  </div>
</div>
```

## Pricing Display

- Current price: font-bold, larger size, text-foreground
- Original price (on sale): text-muted-foreground, line-through, smaller
- Discount badge: bg-destructive text-destructive-foreground, text-xs, rounded-full, px-2 py-0.5
