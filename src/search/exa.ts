import Exa from "exa-js";

export interface SearchRequirements {
  location?: string;
  bedrooms?: number;
  maxBudget?: number;
  moveInDate?: string;
  extras?: string;
}

export type ContactMethod = "form" | "email" | "phone" | "line";

/**
 * Classify the contact method for a listing based on available contact information
 */
export function classifyContactMethod(listing: {
  url?: string;
  description?: string;
  contactPhone?: string;
  contactEmail?: string;
}): ContactMethod {
  const text = `${listing.url || ""} ${listing.description || ""}`.toLowerCase();

  // Check for LINE ID (common in Thailand)
  const linePatterns = [
    /\bline\s*:?\s*@?([a-z0-9_]+)/i,
    /\bline\s*id\s*:?\s*@?([a-z0-9_]+)/i,
    /\b@([a-z0-9_]+)\s*line/i,
    /\bline\s*@([a-z0-9_]+)/i,
  ];
  for (const pattern of linePatterns) {
    if (pattern.test(text)) {
      return "line";
    }
  }

  // Check for phone number
  if (listing.contactPhone) {
    const phonePattern = /(\+?\d[\d\s-]{8,})/;
    if (phonePattern.test(listing.contactPhone)) {
      return "phone";
    }
  }
  // Also check in description/URL
  if (/(\+?\d[\d\s-]{8,})|tel:|phone|call|โทร/i.test(text)) {
    return "phone";
  }

  // Check for email
  if (listing.contactEmail) {
    const emailPattern = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
    if (emailPattern.test(listing.contactEmail)) {
      return "email";
    }
  }
  // Also check in description/URL
  if (/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(text)) {
    return "email";
  }

  // Check for contact form (common patterns)
  if (
    /contact\s*form|inquiry\s*form|message\s*form|send\s*message|contact\s*us|inquiry/i.test(
      text
    ) ||
    /\/contact|\/inquiry|\/message/i.test(listing.url || "")
  ) {
    return "form";
  }

  // Default to form if URL suggests a listing page (most sites have contact forms)
  if (listing.url && /\/listing|\/property|\/rent|\/apartment/i.test(listing.url)) {
    return "form";
  }

  // Default fallback
  return "form";
}

export interface ListingResult {
  externalId?: string;
  title: string;
  price: number;
  currency: string;
  location: string;
  bedrooms?: number;
  url: string;
  imageUrl?: string; // Primary image (first image for backward compatibility)
  imageUrls?: string[]; // All image URLs
  description?: string;
  contactPhone?: string;
  contactEmail?: string;
  contactMethod?: ContactMethod;
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
        const listing: ListingResult = {
          externalId: item.id,
          title: item.title.slice(0, 200),
          price: price || requirements.maxBudget || 1000,
          currency,
          location: requirements.location || "Unknown",
          bedrooms,
          url: item.url,
          description: textContent.slice(0, 500),
        };
        listing.contactMethod = classifyContactMethod(listing);
        listings.push(listing);
      }
    }

    // Sort by price and take top 5
    const filteredListings = listings
      .filter((l) => l.price > 0 && l.price <= (requirements.maxBudget || Infinity) * 1.2)
      .sort((a, b) => a.price - b.price)
      .slice(0, 5);

    // Add mock lister contact info to all listings and re-classify
    const mockPhone = "+66838315388"; // Thailand: 0 8383 15388
    return filteredListings.map((listing) => {
      const updated = {
        ...listing,
        contactPhone: mockPhone,
      };
      updated.contactMethod = classifyContactMethod(updated);
      return updated;
    });
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

  const contactMethodEmoji: Record<ContactMethod, string> = {
    form: "📝",
    email: "📧",
    phone: "📞",
    line: "💬",
  };

  const contactMethodLabel: Record<ContactMethod, string> = {
    form: "Contact Form",
    email: "Email",
    phone: "Phone",
    line: "LINE",
  };

  const contactInfo =
    listing.contactMethod && listing.contactMethod !== "form"
      ? ` • ${contactMethodEmoji[listing.contactMethod]} ${contactMethodLabel[listing.contactMethod]}`
      : listing.contactMethod === "form"
        ? ` • ${contactMethodEmoji.form} ${contactMethodLabel.form}`
        : "";

  return (
    `*${index + 1}\\. ${escapeMarkdown(listing.title)}*\n` +
    `💰 ${listing.currency} ${listing.price}/month\n` +
    `📍 ${escapeMarkdown(listing.location)}${bedroomText ? ` • ${bedroomText}` : ""}${contactInfo}\n` +
    `🔗 [View listing](${listing.url})`
  );
}

function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, "\\$&");
}
