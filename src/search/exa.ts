import Exa from "exa-js";

export interface SearchRequirements {
  location?: string;
  bedrooms?: number;
  maxBudget?: number;
  moveInDate?: string;
  extras?: string;
}

export interface ListingResult {
  externalId?: string;
  title: string;
  price: number;
  currency: string;
  location: string;
  bedrooms?: number;
  url: string;
  imageUrl?: string;
  description?: string;
  contactPhone?: string;
  contactEmail?: string;
}

export async function searchListings(
  exa: Exa,
  requirements: SearchRequirements
): Promise<ListingResult[]> {
  // Build search query
  const queryParts = ["apartment for rent"];

  if (requirements.location) {
    queryParts.push(`in ${requirements.location}`);
  }

  if (requirements.bedrooms !== undefined) {
    if (requirements.bedrooms === 0) {
      queryParts.push("studio");
    } else {
      queryParts.push(`${requirements.bedrooms} bedroom`);
    }
  }

  if (requirements.maxBudget) {
    queryParts.push(`under ${requirements.maxBudget} per month`);
  }

  if (requirements.extras) {
    queryParts.push(requirements.extras);
  }

  const query = queryParts.join(" ");
  console.log(`🔍 Searching Exa for: "${query}"`);

  try {
    const result = await exa.searchAndContents(query, {
      type: "neural",
      useAutoprompt: true,
      numResults: 10,
      text: { maxCharacters: 1000 },
    });

    // Parse results into listings
    const listings: ListingResult[] = [];

    for (const item of result.results) {
      const textContent = item.text || "";

      // Extract price
      const priceMatch = textContent.match(
        /[€$£]?\s*(\d{1,3}(?:[.,]\d{3})*|\d+)(?:\s*(?:€|EUR|USD|\$|£|GBP|\/month|per month|monthly|p\.?m\.?))/i
      );
      let price = 0;
      let currency = "EUR";

      if (priceMatch) {
        const priceStr = priceMatch[1].replace(/[.,]/g, "");
        price = parseInt(priceStr, 10) || 0;

        if (textContent.includes("$") || textContent.toLowerCase().includes("usd")) {
          currency = "USD";
        } else if (textContent.includes("£") || textContent.toLowerCase().includes("gbp")) {
          currency = "GBP";
        }
      }

      // Extract bedrooms
      const bedroomMatch = textContent.match(/(\d+)\s*(?:bed(?:room)?s?|BR|zimmer)/i);
      const bedrooms = bedroomMatch ? parseInt(bedroomMatch[1], 10) : undefined;

      if (item.url && item.title) {
        listings.push({
          externalId: item.id,
          title: item.title.slice(0, 200),
          price: price || requirements.maxBudget || 1000,
          currency,
          location: requirements.location || "Unknown",
          bedrooms,
          url: item.url,
          description: textContent.slice(0, 500),
        });
      }
    }

    // Sort by price and take top 5
    const filteredListings = listings
      .filter((l) => l.price > 0 && l.price <= (requirements.maxBudget || Infinity) * 1.2)
      .sort((a, b) => a.price - b.price)
      .slice(0, 5);

    // Add mock lister contact info to all listings
    const mockPhone = "+66630108133"; // Thailand: 0 6301 08133
    return filteredListings.map((listing) => ({
      ...listing,
      contactPhone: mockPhone,
    }));
  } catch (error) {
    console.error("Exa search error:", error);
    throw error;
  }
}

export function formatListingMessage(listing: ListingResult, index: number): string {
  const bedroomText =
    listing.bedrooms !== undefined
      ? listing.bedrooms === 0
        ? "Studio"
        : `${listing.bedrooms} BR`
      : "";

  return (
    `*${index + 1}\\. ${escapeMarkdown(listing.title)}*\n` +
    `💰 ${listing.currency} ${listing.price}/month\n` +
    `📍 ${escapeMarkdown(listing.location)}${bedroomText ? ` • ${bedroomText}` : ""}\n` +
    `🔗 [View listing](${listing.url})`
  );
}

function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, "\\$&");
}
