export { SITE_URL, absoluteUrl } from "./site";
export { SEO_COPY } from "./copy";
export type { SeoCopy } from "./copy";
export { buildPageMetadata, toMetaDescription, ogLocale, DEFAULT_OG_IMAGE } from "./metadata";
export {
  serializeJsonLd,
  breadcrumbJsonLd,
  organizationJsonLd,
  webSiteJsonLd,
  productJsonLd,
} from "./json-ld";
export { productPrice, unitPrice, variantInStock, priceSummary } from "./pricing";
export type { PriceSummary, PricedProduct, PricedVariant } from "./pricing";
