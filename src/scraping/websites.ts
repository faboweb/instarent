import { BrowserbaseClient, createBrowserbaseClient } from "./browserbase";
import { ListingResult, classifyContactMethod } from "../search/exa";

export interface WebsiteScraperConfig {
  smitheryUrl: string;
}

export interface WebsiteScraper {
  scrapePropertySites(location: string): Promise<ListingResult[]>;
  close(): Promise<void>;
}

interface PropertySiteListing {
  title?: string;
  price?: string;
  location?: string;
  url?: string;
  imageUrls?: string[];
  description?: string;
  bedrooms?: string;
  contactPhone?: string;
  contactEmail?: string;
}

// Property sites to scrape for Chiang Mai
const PROPERTY_SITES = [
  {
    name: "DDProperty",
    url: "https://www.ddproperty.com/en/rent",
    searchPath: "/search?location=chiang-mai",
  },
  {
    name: "FazWaz",
    url: "https://www.fazwaz.com/rent",
    searchPath: "/chiang-mai",
  },
  {
    name: "Hipflat",
    url: "https://www.hipflat.co.th/en/listings/chiang-mai",
  },
  {
    name: "Renthub",
    url: "https://www.renthub.in.th/en/rent",
    searchPath: "/chiang-mai",
  },
];

export async function createWebsiteScraper(
  config: WebsiteScraperConfig
): Promise<WebsiteScraper> {
  let browser: BrowserbaseClient | null = null;

  async function ensureBrowser(): Promise<BrowserbaseClient> {
    if (!browser) {
      browser = await createBrowserbaseClient({
        smitheryUrl: config.smitheryUrl,
      });
    }
    return browser;
  }

  function parsePrice(priceStr: string | undefined): { price: number; currency: string } {
    if (!priceStr) return { price: 0, currency: "THB" };

    // Thai Baht patterns
    const thbMatch = priceStr.match(/[฿]?\s*([\d,]+)\s*(?:THB|baht|\/month|\/mo|per month)?/i);
    if (thbMatch) {
      return {
        price: parseInt(thbMatch[1].replace(/,/g, ""), 10) || 0,
        currency: "THB",
      };
    }

    // USD patterns
    const usdMatch = priceStr.match(/\$\s*([\d,]+)/);
    if (usdMatch) {
      return {
        price: parseInt(usdMatch[1].replace(/,/g, ""), 10) || 0,
        currency: "USD",
      };
    }

    // Generic number
    const numMatch = priceStr.match(/([\d,]+)/);
    if (numMatch) {
      return {
        price: parseInt(numMatch[1].replace(/,/g, ""), 10) || 0,
        currency: "THB",
      };
    }

    return { price: 0, currency: "THB" };
  }

  function extractBedrooms(text: string | undefined): number | undefined {
    if (!text) return undefined;
    const match = text.match(/(\d+)\s*(?:bed(?:room)?s?|BR|ห้องนอน)/i);
    return match ? parseInt(match[1], 10) : undefined;
  }

  async function scrapePropertySites(location: string): Promise<ListingResult[]> {
    const client = await ensureBrowser();
    const allListings: ListingResult[] = [];

    console.log(`🌐 Scraping property websites for ${location}...`);

    for (let i = 0; i < PROPERTY_SITES.length; i++) {
      const site = PROPERTY_SITES[i];
      try {
        // Add delay between sites to avoid rate limits (except first site)
        if (i > 0) {
          const delay = 3000; // 3 seconds between sites
          console.log(`⏳ Waiting ${delay}ms before scraping next site...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        const siteUrl = site.searchPath
          ? `${site.url}${site.searchPath}`
          : site.url;

        console.log(`📡 Scraping ${site.name}: ${siteUrl}`);
        await client.navigate(siteUrl);

        // Wait for page to load
        await new Promise((resolve) => setTimeout(resolve, 3000));

        // Scroll to load more listings
        await client.act("Scroll down to load more property listings");
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Extract listings
        const extractionSchema = {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              price: { type: "string" },
              location: { type: "string" },
              url: { type: "string" },
              imageUrls: {
                type: "array",
                items: { type: "string" },
              },
              description: { type: "string" },
              bedrooms: { type: "string" },
              contactPhone: { type: "string" },
              contactEmail: { type: "string" },
            },
          },
        };

        const rawListings = (await client.extract(
          `Extract all property rental listings visible on this page. For each listing, get:
          - title: The property title/name
          - price: The rental price (include currency if visible)
          - location: The property location/address
          - url: The full URL to the listing detail page
          - imageUrls: ALL image URLs/photos associated with this listing (return as array of image URL strings)
          - description: The property description
          - bedrooms: Number of bedrooms if mentioned
          - contactPhone: Phone number if visible
          - contactEmail: Email address if visible
          
          Make sure to capture ALL images for each listing, not just one.`,
          extractionSchema
        )) as PropertySiteListing[];

        for (const raw of rawListings || []) {
          if (!raw.title || !raw.url) continue;

          const { price, currency } = parsePrice(raw.price);
          const bedrooms =
            raw.bedrooms
              ? parseInt(raw.bedrooms.replace(/[^\d]/g, ""), 10) || undefined
              : extractBedrooms(raw.title) || extractBedrooms(raw.description);

          // Process image URLs
          const imageUrls =
            raw.imageUrls && raw.imageUrls.length > 0
              ? raw.imageUrls.filter((url): url is string => !!url && url.trim().length > 0)
              : [];

          // Ensure URL is absolute
          let listingUrl = raw.url;
          if (!listingUrl.startsWith("http")) {
            if (listingUrl.startsWith("/")) {
              listingUrl = `${site.url}${listingUrl}`;
            } else {
              listingUrl = `${site.url}/${listingUrl}`;
            }
          }

          const listing: ListingResult = {
            externalId: listingUrl,
            title: raw.title.slice(0, 200),
            price,
            currency,
            location: raw.location || location,
            bedrooms,
            url: listingUrl,
            imageUrl: imageUrls[0], // Primary image
            imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
            description: raw.description?.slice(0, 500),
            contactPhone: raw.contactPhone,
            contactEmail: raw.contactEmail,
          };
          listing.contactMethod = classifyContactMethod(listing);
          allListings.push(listing);
        }

        console.log(`✅ Found ${rawListings?.length || 0} listings on ${site.name}`);
      } catch (error) {
        console.error(`❌ Error scraping ${site.name}:`, error);
      }
    }

    // Deduplicate by URL
    const seen = new Set<string>();
    const uniqueListings = allListings.filter((listing) => {
      if (seen.has(listing.url)) return false;
      seen.add(listing.url);
      return true;
    });

    console.log(`🏠 Total unique listings scraped: ${uniqueListings.length}`);
    return uniqueListings;
  }

  return {
    scrapePropertySites,

    async close(): Promise<void> {
      if (browser) {
        await browser.close();
        browser = null;
      }
    },
  };
}

// Convenience function to scrape all property sites for Chiang Mai
export async function scrapeChiangMaiPropertySites(
  config: WebsiteScraperConfig
): Promise<ListingResult[]> {
  const scraper = await createWebsiteScraper(config);
  try {
    return await scraper.scrapePropertySites("Chiang Mai");
  } finally {
    await scraper.close();
  }
}
