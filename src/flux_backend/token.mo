import HashMap "mo:base/HashMap";
import Result "mo:base/Result";
import Time "mo:base/Time";
import Principal "mo:base/Principal";
import Array "mo:base/Array";
import Nat "mo:base/Nat";
import Text "mo:base/Text";
import Iter "mo:base/Iter";

module TokenManager {
    // Types
    public type TransactionType = {
        #Purchase;
        #Gift;
        #Subscription;
        #Bits;
        #Prediction;
        #Reward;
        #Withdrawal;
        #Refund;
    };

    public type Transaction = {
        id: Text;
        from: Principal;
        to: Principal;
        amount: Nat;
        transactionType: TransactionType;
        timestamp: Int;
        metadata: ?Text;
        status: TransactionStatus;
    };

    public type TransactionStatus = {
        #Pending;
        #Completed;
        #Failed;
        #Cancelled;
    };

    public type TokenBalance = {
        user: Principal;
        icpBalance: Nat;
        appCoinBalance: Nat;
        bitsBalance: Nat;
        lockedBalance: Nat;
        lastUpdated: Int;
    };

    public type RevenueShare = {
        creator: Principal;
        totalEarned: Nat;
        subscriptionRevenue: Nat;
        giftRevenue: Nat;
        adRevenue: Nat;
        bitsRevenue: Nat;
        lastPayout: Int;
        pendingPayout: Nat;
    };

    public type PayoutRequest = {
        id: Text;
        creator: Principal;
        amount: Nat;
        requestedAt: Int;
        status: PayoutStatus;
        processedAt: ?Int;
    };

    public type PayoutStatus = {
        #Pending;
        #Approved;
        #Rejected;
        #Processed;
    };

    public class TokenManager() {
        // State variables
        private var balances = HashMap.HashMap<Principal, TokenBalance>(0, Principal.equal, Principal.hash);
        private var transactions = HashMap.HashMap<Text, Transaction>(0, Text.equal, Text.hash);
        private var revenueShares = HashMap.HashMap<Principal, RevenueShare>(0, Principal.equal, Principal.hash);
        private var payoutRequests = HashMap.HashMap<Text, PayoutRequest>(0, Text.equal, Text.hash);
        private var exchangeRate: Nat = 1000; // 1 ICP = 1000 app coins
        private var transactionCounter: Nat = 0;

        // Public functions
        public func purchaseAppCoins(caller: Principal, icpAmount: Nat) : async Result.Result<Nat, Text> {
            let coinAmount = icpAmount * exchangeRate;
            
            switch (balances.get(caller)) {
                case (?balance) {
                    if (balance.icpBalance < icpAmount) {
                        return #err("Insufficient ICP balance");
                    };
                    let updatedBalance = {
                        balance with
                        icpBalance = Nat.sub(balance.icpBalance, icpAmount);
                        appCoinBalance = balance.appCoinBalance + coinAmount;
                        lastUpdated = Time.now();
                    };
                    balances.put(caller, updatedBalance);
                    
                    let _transaction = createTransaction(caller, caller, coinAmount, #Purchase, "ICP to App Coins");
                    #ok(coinAmount)
                };
                case null { #err("User balance not found") };
            }
        };

        public func purchaseBits(caller: Principal, coinAmount: Nat) : async Result.Result<Nat, Text> {
            let bitsAmount = coinAmount * 2; // 1 coin = 2 bits
            
            switch (balances.get(caller)) {
                case (?balance) {
                    if (balance.appCoinBalance >= coinAmount) {
                        let updatedBalance = {
                            balance with
                            appCoinBalance = Nat.sub(balance.appCoinBalance, coinAmount);
                            bitsBalance = balance.bitsBalance + bitsAmount;
                            lastUpdated = Time.now();
                        };
                        balances.put(caller, updatedBalance);
                        
                        let _transaction = createTransaction(caller, caller, bitsAmount, #Bits, "Coins to Bits");
                        #ok(bitsAmount)
                    } else {
                        #err("Insufficient coin balance")
                    }
                };
                case null { #err("User balance not found") };
            }
        };

        public func processSubscription(caller: Principal, streamer: Principal, tier: Nat) : async Result.Result<(), Text> {
            let subscriptionCost = getSubscriptionCost(tier);
            
            switch (balances.get(caller)) {
                case (?balance) {
                    if (balance.appCoinBalance >= subscriptionCost) {
                        // Deduct from subscriber
                        let updatedBalance = {
                            balance with
                            appCoinBalance = Nat.sub(balance.appCoinBalance, subscriptionCost);
                            lastUpdated = Time.now();
                        };
                        balances.put(caller, updatedBalance);
                        
                        // Add to creator revenue
                        let creatorRevenue = subscriptionCost * 70 / 100; // 70% to creator
                        await addCreatorRevenue(streamer, creatorRevenue, #Subscription);
                        
                        let _transaction = createTransaction(caller, streamer, subscriptionCost, #Subscription, "Tier " # Nat.toText(tier) # " Subscription");
                        #ok()
                    } else {
                        #err("Insufficient balance for subscription")
                    }
                };
                case null { #err("User balance not found") };
            }
        };

        public func sendGift(caller: Principal, recipient: Principal, giftType: Text, amount: Nat) : async Result.Result<(), Text> {
            switch (balances.get(caller)) {
                case (?balance) {
                    if (balance.appCoinBalance >= amount) {
                        let updatedBalance = {
                            balance with
                            appCoinBalance = Nat.sub(balance.appCoinBalance, amount);
                            lastUpdated = Time.now();
                        };
                        balances.put(caller, updatedBalance);
                        
                        // Add to recipient revenue
                        let recipientRevenue = amount * 80 / 100; // 80% to recipient
                        await addCreatorRevenue(recipient, recipientRevenue, #Gift);
                        
                        let _transaction = createTransaction(caller, recipient, amount, #Gift, giftType);
                        #ok()
                    } else {
                        #err("Insufficient balance for gift")
                    }
                };
                case null { #err("User balance not found") };
            }
        };

        public func cheerWithBits(caller: Principal, streamer: Principal, bitsAmount: Nat) : async Result.Result<(), Text> {
            switch (balances.get(caller)) {
                case (?balance) {
                    if (balance.bitsBalance >= bitsAmount) {
                        let updatedBalance = {
                            balance with
                            bitsBalance = Nat.sub(balance.bitsBalance, bitsAmount);
                            lastUpdated = Time.now();
                        };
                        balances.put(caller, updatedBalance);
                        
                        // Convert bits to coins for revenue (1 bit = 0.5 coins)
                        let coinValue = bitsAmount / 2;
                        let creatorRevenue = coinValue * 75 / 100; // 75% to creator
                        await addCreatorRevenue(streamer, creatorRevenue, #Bits);
                        
                        let _transaction = createTransaction(caller, streamer, bitsAmount, #Bits, "Bits Cheer");
                        #ok()
                    } else {
                        #err("Insufficient bits balance")
                    }
                };
                case null { #err("User balance not found") };
            }
        };

        public func requestPayout(caller: Principal, amount: Nat) : async Result.Result<Text, Text> {
            let requestId = "payout_" # Nat.toText(transactionCounter);
            transactionCounter += 1;
            
            switch (revenueShares.get(caller)) {
                case (?revenue) {
                    if (revenue.pendingPayout >= amount and amount >= 1000) { // Minimum 1000 coins
                        let payoutRequest: PayoutRequest = {
                            id = requestId;
                            creator = caller;
                            amount = amount;
                            requestedAt = Time.now();
                            status = #Pending;
                            processedAt = null;
                        };
                        payoutRequests.put(requestId, payoutRequest);
                        #ok(requestId)
                    } else {
                        #err("Insufficient pending payout or below minimum amount")
                    }
                };
                case null { #err("Creator revenue not found") };
            }
        };

        public func getBalance(user: Principal) : ?TokenBalance {
            balances.get(user)
        };

        public func getRevenueShare(creator: Principal) : ?RevenueShare {
            revenueShares.get(creator)
        };

        public func getTransactionHistory(user: Principal, limit: Nat) : [Transaction] {
            let userTransactions = Array.filter<Transaction>(
                Iter.toArray(transactions.vals()),
                func(t: Transaction) : Bool {
                    t.from == user or t.to == user
                }
            );
            
            let sortedTransactions = Array.sort<Transaction>(
                userTransactions,
                func(a: Transaction, b: Transaction) : {#less; #equal; #greater} {
                    if (a.timestamp > b.timestamp) #less
                    else if (a.timestamp < b.timestamp) #greater
                    else #equal
                }
            );
            
            if (sortedTransactions.size() <= limit) {
                sortedTransactions
            } else {
                Array.tabulate<Transaction>(limit, func(i) = sortedTransactions[i])
            }
        };

        // Private helper functions
        private func createTransaction(from: Principal, to: Principal, amount: Nat, txType: TransactionType, metadata: Text) : Transaction {
            let txId = "tx_" # Nat.toText(transactionCounter);
            transactionCounter += 1;
            
            let transaction: Transaction = {
                id = txId;
                from = from;
                to = to;
                amount = amount;
                transactionType = txType;
                timestamp = Time.now();
                metadata = ?metadata;
                status = #Completed;
            };
            
            transactions.put(txId, transaction);
            transaction
        };

        private func addCreatorRevenue(creator: Principal, amount: Nat, revenueType: TransactionType) : async () {
            switch (revenueShares.get(creator)) {
                case (?revenue) {
                    let updatedRevenue = switch (revenueType) {
                        case (#Subscription) {
                            {
                                revenue with
                                subscriptionRevenue = revenue.subscriptionRevenue + amount;
                                totalEarned = revenue.totalEarned + amount;
                                pendingPayout = revenue.pendingPayout + amount;
                            }
                        };
                        case (#Gift) {
                            {
                                revenue with
                                giftRevenue = revenue.giftRevenue + amount;
                                totalEarned = revenue.totalEarned + amount;
                                pendingPayout = revenue.pendingPayout + amount;
                            }
                        };
                        case (#Bits) {
                            {
                                revenue with
                                bitsRevenue = revenue.bitsRevenue + amount;
                                totalEarned = revenue.totalEarned + amount;
                                pendingPayout = revenue.pendingPayout + amount;
                            }
                        };
                        case (_) { revenue };
                    };
                    revenueShares.put(creator, updatedRevenue);
                };
                case null {
                    let newRevenue: RevenueShare = {
                        creator = creator;
                        totalEarned = amount;
                        subscriptionRevenue = if (revenueType == #Subscription) amount else 0;
                        giftRevenue = if (revenueType == #Gift) amount else 0;
                        adRevenue = 0;
                        bitsRevenue = if (revenueType == #Bits) amount else 0;
                        lastPayout = 0;
                        pendingPayout = amount;
                    };
                    revenueShares.put(creator, newRevenue);
                };
            }
        };

        private func getSubscriptionCost(tier: Nat) : Nat {
            switch (tier) {
                case (1) { 500 };  // Tier 1: 500 coins
                case (2) { 1000 }; // Tier 2: 1000 coins
                case (3) { 2500 }; // Tier 3: 2500 coins
                case (_) { 0 };
            }
        };
        
    }; // End of TokenManager class
}
