import { ListingResult } from "../search/exa";
export interface FacebookConfig {
    /** Smithery URL from dashboard (includes Browserbase credentials) */
    smitheryUrl: string;
    email: string;
    password: string;
}
export interface FacebookScraper {
    login(): Promise<void>;
    scrapeMarketplace(location: string): Promise<ListingResult[]>;
    findAndJoinGroups(keywords: string[]): Promise<string[]>;
    scrapeGroupListings(groupUrls: string[]): Promise<ListingResult[]>;
    close(): Promise<void>;
}
export declare function createFacebookScraper(config: FacebookConfig): Promise<FacebookScraper>;
export declare function scrapeChiangMaiListings(config: FacebookConfig): Promise<ListingResult[]>;
//# sourceMappingURL=facebook.d.ts.map