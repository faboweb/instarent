import { ListingResult } from "../search/exa";
export interface WebsiteScraperConfig {
    smitheryUrl: string;
}
export interface WebsiteScraper {
    scrapePropertySites(location: string): Promise<ListingResult[]>;
    close(): Promise<void>;
}
export declare function createWebsiteScraper(config: WebsiteScraperConfig): Promise<WebsiteScraper>;
export declare function scrapeChiangMaiPropertySites(config: WebsiteScraperConfig): Promise<ListingResult[]>;
//# sourceMappingURL=websites.d.ts.map