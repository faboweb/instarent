import { createBrowserbaseClient } from "./browserbase";
import { classifyContactMethod } from "../search/exa";
export async function createFacebookScraper(config) {
    let browser = null;
    let isLoggedIn = false;
    async function ensureBrowser() {
        if (!browser) {
            browser = await createBrowserbaseClient({
                smitheryUrl: config.smitheryUrl,
            });
        }
        return browser;
    }
    async function ensureLoggedIn() {
        if (!isLoggedIn) {
            await login();
        }
    }
    async function login() {
        const client = await ensureBrowser();
        console.log("🔐 Logging into Facebook...");
        await client.navigate("https://www.facebook.com/login");
        // Fill in login credentials
        await client.act(`Type "${config.email}" into the email or phone input field`);
        await client.act(`Type "${config.password}" into the password input field`);
        await client.act("Click the Log In button");
        // Wait for login to complete
        await new Promise((resolve) => setTimeout(resolve, 3000));
        // Verify login success by checking for common logged-in elements
        try {
            await client.observe("Look for the Facebook home feed or profile icon");
            isLoggedIn = true;
            console.log("✅ Successfully logged into Facebook");
        }
        catch {
            throw new Error("Facebook login failed - could not verify logged in state");
        }
    }
    function parsePrice(priceStr) {
        if (!priceStr)
            return { price: 0, currency: "THB" };
        // Thai Baht patterns
        const thbMatch = priceStr.match(/[฿]?\s*([\d,]+)\s*(?:THB|baht|\/month|\/mo)?/i);
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
    function extractBedrooms(text) {
        if (!text)
            return undefined;
        const match = text.match(/(\d+)\s*(?:bed(?:room)?s?|BR|ห้องนอน)/i);
        return match ? parseInt(match[1], 10) : undefined;
    }
    async function scrapeMarketplace(location) {
        const client = await ensureBrowser();
        await ensureLoggedIn();
        console.log(`🏠 Scraping Facebook Marketplace for rentals in ${location}...`);
        // Navigate to Marketplace property rentals
        const marketplaceUrl = `https://www.facebook.com/marketplace/category/propertyrentals?exact=false`;
        await client.navigate(marketplaceUrl);
        // Set location filter
        await client.act(`Click on the location filter and search for "${location}"`);
        await client.act(`Select ${location} from the location suggestions`);
        // Wait for listings to load
        await new Promise((resolve) => setTimeout(resolve, 2000));
        // Scroll to load more listings
        await client.act("Scroll down to load more listings");
        await new Promise((resolve) => setTimeout(resolve, 1500));
        // Extract listing data
        const extractionSchema = {
            type: "array",
            items: {
                type: "object",
                properties: {
                    title: { type: "string" },
                    price: { type: "string" },
                    location: { type: "string" },
                    url: { type: "string" },
                    imageUrl: { type: "string" },
                    imageUrls: {
                        type: "array",
                        items: { type: "string" },
                    },
                },
            },
        };
        const rawListings = (await client.extract("Extract all property rental listings visible on this page. For each listing, get the title, price, location, listing URL, and ALL image URLs (not just one). Include all photos/images associated with the listing. Return imageUrls as an array of image URL strings.", extractionSchema));
        const listings = [];
        for (const raw of rawListings || []) {
            if (!raw.title || !raw.url)
                continue;
            const { price, currency } = parsePrice(raw.price);
            const bedrooms = extractBedrooms(raw.title) || extractBedrooms(raw.description);
            // Process image URLs - use array if available, otherwise single imageUrl
            const imageUrls = raw.imageUrls && raw.imageUrls.length > 0
                ? raw.imageUrls.filter((url) => !!url && url.trim().length > 0)
                : raw.imageUrl
                    ? [raw.imageUrl]
                    : [];
            const listing = {
                externalId: raw.url,
                title: raw.title.slice(0, 200),
                price,
                currency,
                location: raw.location || location,
                bedrooms,
                url: raw.url.startsWith("http") ? raw.url : `https://www.facebook.com${raw.url}`,
                imageUrl: imageUrls[0], // Primary image (first one)
                imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
                description: raw.description?.slice(0, 500),
            };
            listing.contactMethod = classifyContactMethod(listing);
            listings.push(listing);
        }
        console.log(`📋 Found ${listings.length} listings on Marketplace`);
        return listings;
    }
    async function findAndJoinGroups(keywords) {
        const client = await ensureBrowser();
        await ensureLoggedIn();
        const joinedGroups = [];
        const searchTerms = keywords.length > 0 ? keywords : ["Chiang Mai rental", "Chiang Mai apartment", "เชียงใหม่ ให้เช่า"];
        console.log(`🔍 Searching for rental groups with keywords: ${searchTerms.join(", ")}`);
        for (const term of searchTerms) {
            // Search for groups
            const searchUrl = `https://www.facebook.com/search/groups?q=${encodeURIComponent(term)}`;
            await client.navigate(searchUrl);
            // Wait for results
            await new Promise((resolve) => setTimeout(resolve, 2000));
            // Extract group links
            const groupSchema = {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        name: { type: "string" },
                        url: { type: "string" },
                        memberCount: { type: "string" },
                    },
                },
            };
            const groups = (await client.extract("Extract all Facebook groups visible in the search results. Get the group name, URL, and member count.", groupSchema));
            // Try to join the top groups
            for (const group of (groups || []).slice(0, 3)) {
                if (!group.url)
                    continue;
                try {
                    const groupUrl = group.url.startsWith("http")
                        ? group.url
                        : `https://www.facebook.com${group.url}`;
                    await client.navigate(groupUrl);
                    await new Promise((resolve) => setTimeout(resolve, 1500));
                    // Check if already a member or can join
                    const joinResult = await client.act("If there is a 'Join Group' or 'Join' button, click it. If already a member, do nothing.");
                    if (joinResult && !joinResult.includes("already")) {
                        // Answer any membership questions if prompted
                        await client.act("If there are membership questions, answer them appropriately for someone looking to rent an apartment");
                        await client.act("Click any 'Submit' or 'Agree' button if present");
                    }
                    joinedGroups.push(groupUrl);
                    console.log(`✅ Requested to join group: ${group.name || groupUrl}`);
                }
                catch (error) {
                    console.log(`⚠️ Could not join group: ${group.url} - ${error}`);
                }
            }
        }
        console.log(`📝 Requested to join ${joinedGroups.length} groups`);
        return joinedGroups;
    }
    async function scrapeGroupListings(groupUrls) {
        const client = await ensureBrowser();
        await ensureLoggedIn();
        const allListings = [];
        for (const groupUrl of groupUrls) {
            console.log(`📖 Scraping listings from group: ${groupUrl}`);
            try {
                await client.navigate(groupUrl);
                await new Promise((resolve) => setTimeout(resolve, 2000));
                // Scroll to load posts
                await client.act("Scroll down to load more posts");
                await new Promise((resolve) => setTimeout(resolve, 1500));
                // Extract rental posts
                const postSchema = {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            title: { type: "string" },
                            price: { type: "string" },
                            location: { type: "string" },
                            description: { type: "string" },
                            imageUrl: { type: "string" },
                            imageUrls: {
                                type: "array",
                                items: { type: "string" },
                            },
                            url: { type: "string" },
                            contactInfo: { type: "string" },
                        },
                    },
                };
                const posts = (await client.extract("Extract all rental listing posts from this group. Look for posts about apartments, condos, or houses for rent. Get the title/subject, price, location, description, ALL images/photos (return imageUrls as an array of image URL strings), post URL, and contact information (phone, LINE ID, etc). Make sure to capture all photos in each post, not just one.", postSchema));
                for (const post of posts || []) {
                    if (!post.title && !post.description)
                        continue;
                    const { price, currency } = parsePrice(post.price);
                    const title = post.title || post.description?.slice(0, 100) || "Rental Listing";
                    const bedrooms = extractBedrooms(title) || extractBedrooms(post.description);
                    // Extract contact phone from contact info
                    let contactPhone;
                    if (post.contactInfo) {
                        const phoneMatch = post.contactInfo.match(/(\+?\d[\d\s-]{8,})/);
                        if (phoneMatch) {
                            contactPhone = phoneMatch[1].replace(/[\s-]/g, "");
                        }
                    }
                    // Process image URLs - use array if available, otherwise single imageUrl
                    const imageUrls = post.imageUrls && post.imageUrls.length > 0
                        ? post.imageUrls.filter((url) => !!url && url.trim().length > 0)
                        : post.imageUrl
                            ? [post.imageUrl]
                            : [];
                    const listing = {
                        externalId: post.url || `fb-group-${Date.now()}-${Math.random()}`,
                        title: title.slice(0, 200),
                        price,
                        currency,
                        location: post.location || "Chiang Mai",
                        bedrooms,
                        url: post.url?.startsWith("http") ? post.url : groupUrl,
                        imageUrl: imageUrls[0], // Primary image (first one)
                        imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
                        description: post.description?.slice(0, 500),
                        contactPhone,
                    };
                    listing.contactMethod = classifyContactMethod({
                        url: listing.url,
                        description: listing.description,
                        contactPhone: listing.contactPhone,
                        contactEmail: undefined,
                    });
                    allListings.push(listing);
                }
                console.log(`📋 Found ${posts?.length || 0} listings in group`);
            }
            catch (error) {
                console.log(`⚠️ Error scraping group ${groupUrl}: ${error}`);
            }
        }
        console.log(`📊 Total listings from groups: ${allListings.length}`);
        return allListings;
    }
    return {
        login,
        scrapeMarketplace,
        findAndJoinGroups,
        scrapeGroupListings,
        async close() {
            if (browser) {
                await browser.close();
                browser = null;
                isLoggedIn = false;
            }
        },
    };
}
// Convenience function to scrape all Facebook sources for Chiang Mai
export async function scrapeChiangMaiListings(config) {
    const scraper = await createFacebookScraper(config);
    const allListings = [];
    try {
        // Scrape Marketplace
        const marketplaceListings = await scraper.scrapeMarketplace("Chiang Mai");
        allListings.push(...marketplaceListings);
        // Find and join rental groups
        const groupUrls = await scraper.findAndJoinGroups([
            "Chiang Mai rental",
            "Chiang Mai apartment rent",
            "Chiang Mai condo",
            "เชียงใหม่ ให้เช่า คอนโด",
        ]);
        // Scrape listings from groups (those we're already members of will work)
        const groupListings = await scraper.scrapeGroupListings(groupUrls);
        allListings.push(...groupListings);
        // Deduplicate by URL
        const seen = new Set();
        const uniqueListings = allListings.filter((listing) => {
            if (seen.has(listing.url))
                return false;
            seen.add(listing.url);
            return true;
        });
        console.log(`🏠 Total unique listings scraped: ${uniqueListings.length}`);
        return uniqueListings;
    }
    finally {
        await scraper.close();
    }
}
//# sourceMappingURL=facebook.js.map