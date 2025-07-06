import HashMap "mo:base/HashMap";
import Result "mo:base/Result";
import Time "mo:base/Time";
import Principal "mo:base/Principal";
import Array "mo:base/Array";
import Nat "mo:base/Nat";
import Text "mo:base/Text";
import Iter "mo:base/Iter";

module EmoteManager {
    public type Emote = {
        id: Text;
        name: Text;
        creator: Principal;
        imageData: Blob;
        tier: Nat;
        animated: Bool;
        rarity: EmoteRarity;
        mintCount: Nat;
        maxMint: ?Nat;
        price: Nat;
        royalty: Nat;
        createdAt: Int;
        isApproved: Bool;
        category: EmoteCategory;
    };

    public type EmoteRarity = {
        #Common;
        #Uncommon;
        #Rare;
        #Epic;
        #Legendary;
    };

    public type EmoteCategory = {
        #Reaction;
        #Gaming;
        #Celebration;
        #Animal;
        #Meme;
        #Custom;
    };

    public type EmoteCollection = {
        owner: Principal;
        emotes: [Text];
        lastUpdated: Int;
    };

    public type NFTMetadata = {
        id: Text;
        name: Text;
        description: Text;
        image: Blob;
        attributes: [(Text, Text)];
        creator: Principal;
        owner: Principal;
        mintedAt: Int;
        transferHistory: [Transfer];
    };

    public type Transfer = {
        from: Principal;
        to: Principal;
        timestamp: Int;
        price: ?Nat;
    };

    public type MarketplaceListing = {
        id: Text;
        seller: Principal;
        emoteId: Text;
        price: Nat;
        listedAt: Int;
        status: ListingStatus;
    };

    public type ListingStatus = {
        #Active;
        #Sold;
        #Cancelled;
        #Expired;
    };

    public class EmoteManager() {
        // State variables
        private var emotes = HashMap.HashMap<Text, Emote>(0, Text.equal, Text.hash);
        private var collections = HashMap.HashMap<Principal, EmoteCollection>(0, Principal.equal, Principal.hash);
        private var nfts = HashMap.HashMap<Text, NFTMetadata>(0, Text.equal, Text.hash);
        private var marketplaceListings = HashMap.HashMap<Text, MarketplaceListing>(0, Text.equal, Text.hash);
        private var emoteCounter: Nat = 0;

        public func createEmote(caller: Principal, name: Text, imageData: Blob, tier: Nat, animated: Bool, category: EmoteCategory) : async Result.Result<Text, Text> {
            let emoteId = "emote_" # Nat.toText(emoteCounter);
            emoteCounter += 1;

            let newEmote: Emote = {
            id = emoteId;
            name = name;
            creator = caller;
            imageData = imageData;
            tier = tier;
            animated = animated;
            rarity = #Common;
            mintCount = 1;
            maxMint = null;
            price = calculateEmotePrice(tier, animated);
            royalty = 10; // 10% royalty to creator
            createdAt = Time.now();
            isApproved = false;
            category = category;
        };

        emotes.put(emoteId, newEmote);
        await addToCollection(caller, emoteId);
        #ok(emoteId)
    };

    public func purchaseEmote(caller: Principal, emoteId: Text) : async Result.Result<(), Text> {
        
        switch (emotes.get(emoteId)) {
            case (?emote) {
                if (emote.isApproved) {
                    // Check if user has required subscription tier
                    // This would integrate with the User Management canister
                    await addToCollection(caller, emoteId);
                    #ok()
                } else {
                    #err("Emote not approved")
                }
            };
            case null { #err("Emote not found") };
        }
    };

    public func mintNFT(caller: Principal, emoteId: Text, recipientId: Principal) : async Result.Result<Text, Text> {
        switch (emotes.get(emoteId)) {
            case (?emote) {
                if (emote.creator == caller) {
                    let nftId = "nft_" # emoteId # "_" # Nat.toText(emote.mintCount);
                    
                    let nft: NFTMetadata = {
                        id = nftId;
                        name = emote.name # " #" # Nat.toText(emote.mintCount);
                        description = "Limited edition NFT emote";
                        image = emote.imageData;
                        attributes = [
                            ("Rarity", rarityToText(emote.rarity)),
                            ("Tier", Nat.toText(emote.tier)),
                            ("Animated", if (emote.animated) "Yes" else "No"),
                            ("Creator", Principal.toText(emote.creator))
                        ];
                        creator = caller;
                        owner = recipientId;
                        mintedAt = Time.now();
                        transferHistory = [];
                    };
                    
                    nfts.put(nftId, nft);
                    
                    // Update emote mint count
                    let updatedEmote = {
                        emote with
                        mintCount = emote.mintCount + 1;
                    };
                    emotes.put(emoteId, updatedEmote);
                    
                    #ok(nftId)
                } else {
                    #err("Only creator can mint NFT")
                }
            };
            case null { #err("Emote not found") };
        }
    };

    public func listEmoteForSale(caller: Principal, emoteId: Text, price: Nat) : async Result.Result<Text, Text> {
        let listingId = "listing_" # Nat.toText(emoteCounter);
        emoteCounter += 1;

        // Check if caller owns the emote
        switch (collections.get(caller)) {
            case (?collection) {
                if (Array.find<Text>(collection.emotes, func(e) = e == emoteId) != null) {
                    let listing: MarketplaceListing = {
                        id = listingId;
                        seller = caller;
                        emoteId = emoteId;
                        price = price;
                        listedAt = Time.now();
                        status = #Active;
                    };
                    marketplaceListings.put(listingId, listing);
                    #ok(listingId)
                } else {
                    #err("Emote not owned by caller")
                }
            };
            case null { #err("Collection not found") };
        }
    };

    public func buyEmoteFromMarketplace(caller: Principal, listingId: Text) : async Result.Result<(), Text> {
        switch (marketplaceListings.get(listingId)) {
            case (?listing) {
                if (listing.status == #Active) {
                    // Transfer emote ownership
                    await removeFromCollection(listing.seller, listing.emoteId);
                    await addToCollection(caller, listing.emoteId);
                    
                    // Update listing status
                    let updatedListing = {
                        listing with
                        status = #Sold;
                    };
                    marketplaceListings.put(listingId, updatedListing);
                    
                    #ok()
                } else {
                    #err("Listing not active")
                }
            };
            case null { #err("Listing not found") };
        }
    };

    public func getUserEmotes(user: Principal) : [Emote] {
        switch (collections.get(user)) {
            case (?collection) {
                Array.mapFilter<Text, Emote>(
                    collection.emotes,
                    func(emoteId: Text) : ?Emote {
                        emotes.get(emoteId)
                    }
                )
            };
            case null { [] };
        }
    };

    public func getEmotesByCategory(category: EmoteCategory) : [Emote] {
        Array.filter<Emote>(
            Iter.toArray(emotes.vals()),
            func(emote: Emote) : Bool {
                emote.category == category and emote.isApproved
            }
        )
    };

    public func getMarketplaceListings() : [MarketplaceListing] {
        Array.filter<MarketplaceListing>(
            Iter.toArray(marketplaceListings.vals()),
            func(listing: MarketplaceListing) : Bool {
                listing.status == #Active
            }
        )
    };

    // Private helper functions
    private func addToCollection(user: Principal, emoteId: Text) : async () {
        switch (collections.get(user)) {
            case (?collection) {
                let updatedEmotes = Array.append<Text>(collection.emotes, [emoteId]);
                let updatedCollection = {
                    collection with
                    emotes = updatedEmotes;
                    lastUpdated = Time.now();
                };
                collections.put(user, updatedCollection);
            };
            case null {
                let newCollection: EmoteCollection = {
                    owner = user;
                    emotes = [emoteId];
                    lastUpdated = Time.now();
                };
                collections.put(user, newCollection);
            };
        }
    };

    private func removeFromCollection(user: Principal, emoteId: Text) : async () {
        switch (collections.get(user)) {
            case (?collection) {
                let updatedEmotes = Array.filter<Text>(
                    collection.emotes,
                    func(e: Text) : Bool { e != emoteId }
                );
                let updatedCollection = {
                    collection with
                    emotes = updatedEmotes;
                    lastUpdated = Time.now();
                };
                collections.put(user, updatedCollection);
            };
            case null { };
        }
    };

    private func calculateEmotePrice(tier: Nat, animated: Bool) : Nat {
        let basePrice = tier * 100;
        if (animated) {
            basePrice * 2
        } else {
            basePrice
        }
    };

    private func rarityToText(rarity: EmoteRarity) : Text {
        switch (rarity) {
            case (#Common) { "Common" };
            case (#Uncommon) { "Uncommon" };
            case (#Rare) { "Rare" };
            case (#Epic) { "Epic" };
            case (#Legendary) { "Legendary" };
        }
    };
        
    }; // End of EmoteManager class
}
