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
export declare function classifyContactMethod(listing: {
    url?: string;
    description?: string;
    contactPhone?: string;
    contactEmail?: string;
}): ContactMethod;
export interface ListingResult {
    externalId?: string;
    title: string;
    price: number;
    currency: string;
    location: string;
    bedrooms?: number;
    url: string;
    imageUrl?: string;
    imageUrls?: string[];
    description?: string;
    contactPhone?: string;
    contactEmail?: string;
    contactMethod?: ContactMethod;
}
export declare function searchListings(exa: Exa, requirements: SearchRequirements): Promise<ListingResult[]>;
export declare function formatListingMessage(listing: ListingResult, index: number): string;
//# sourceMappingURL=exa.d.ts.map