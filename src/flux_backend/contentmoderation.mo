import HashMap "mo:base/HashMap";
import Array "mo:base/Array";
import Time "mo:base/Time";
import Result "mo:base/Result";
import Principal "mo:base/Principal";
import Text "mo:base/Text";
import Float "mo:base/Float";
import Int "mo:base/Int";
import Iter "mo:base/Iter";
import Buffer "mo:base/Buffer";
import Nat "mo:base/Nat";

module ContentModerationManager {
    public type ModerationAction = {
        #Approve;
        #Reject;
        #FlagForReview;
        #RemoveContent;
        #SuspendUser;
        #BanUser;
        #AddWarning;
    };

    public type ModerationReason = {
        #Spam;
        #Harassment;
        #AdultContent;
        #Violence;
        #Misinformation;
        #Copyright;
        #Inappropriate;
        #Community;
    };

    public type ModerationRule = {
        id: Text;
        name: Text;
        description: Text;
        category: Text;
        severity: Nat; // 1-10 scale
        action: ModerationAction;
        enabled: Bool;
        patterns: [Text]; // Regex patterns or keywords
        threshold: Float; // Confidence threshold
    };

    public type ModerationReport = {
        id: Text;
        contentId: Text;
        contentType: Text; // "video", "comment", "stream", etc.
        reportedBy: Principal;
        reason: ModerationReason;
        description: Text;
        timestamp: Int;
        status: Text; // "pending", "reviewed", "resolved"
        moderatorId: ?Principal;
        moderationAction: ?ModerationAction;
        resolution: ?Text;
    };

    public type UserModerationHistory = {
        userId: Principal;
        warnings: Nat;
        suspensions: Nat;
        bans: Nat;
        lastAction: ?Int;
        totalReports: Nat;
        totalViolations: Nat;
        trustScore: Float; // 0-100 scale
    };

    public type AutoModerationResult = {
        contentId: Text;
        flagged: Bool;
        confidence: Float;
        reasons: [ModerationReason];
        suggestedAction: ModerationAction;
        timestamp: Int;
    };

    public class ContentModerationManager() {
        private var moderationRules = HashMap.HashMap<Text, ModerationRule>(0, Text.equal, Text.hash);
        private var moderationReports = HashMap.HashMap<Text, ModerationReport>(0, Text.equal, Text.hash);
        private var userModerationHistory = HashMap.HashMap<Principal, UserModerationHistory>(0, Principal.equal, Principal.hash);
        private var autoModerationResults = HashMap.HashMap<Text, AutoModerationResult>(0, Text.equal, Text.hash);
        private var moderators = HashMap.HashMap<Principal, {
            id: Principal;
            permissions: [Text];
            addedBy: Principal;
            addedAt: Int;
            active: Bool;
        }>(0, Principal.equal, Principal.hash);

        // Private utility functions
        private func generateReportId() : Text {
            // Simple ID generation - in production, use a more robust method
            Int.toText(Time.now())
        };

        private func performAutoModeration(contentId: Text, _contentType: Text, _content: Text) : async AutoModerationResult {
            // Placeholder implementation for auto-moderation logic
            // In a real implementation, this would use ML/AI services
            {
                contentId = contentId;
                flagged = false;
                confidence = 0.0;
                reasons = [];
                suggestedAction = #Approve;
                timestamp = Time.now();
            }
        };

        private func executeAutoAction(_result: AutoModerationResult) : async () {
            // Placeholder for executing auto-moderation actions
            ()
        };

        private func checkForMultipleReports(_contentId: Text) : async () {
            // Placeholder for checking multiple reports logic
            ()
        };

        private func executeModerationAction(_contentId: Text, _contentType: Text, _action: ModerationAction, _resolution: Text) : async () {
            // Placeholder for executing moderation actions
            ()
        };

        private func isAdmin(_userId: Principal) : Bool {
            // For now, return false (no admins configured)
            false
        };
        
        private func isModerator(userId: Principal) : Bool {
            // Check if user is a moderator
            switch (moderators.get(userId)) {
                case (?moderatorInfo) moderatorInfo.active;
                case null false;
            }
        };

        // Public methods
        public func scanContent(contentId: Text, contentType: Text, content: Text) : async AutoModerationResult {
            let result = await performAutoModeration(contentId, contentType, content);
            autoModerationResults.put(contentId, result);
            
            // If flagged, automatically take action based on severity
            if (result.flagged and result.confidence > 0.8) {
                await executeAutoAction(result);
            };
            
            result
        };

        public func reportContent(
            contentId: Text,
            contentType: Text,
            reportedBy: Principal,
            reason: ModerationReason,
            description: Text
        ) : async Result.Result<Text, Text> {
            let reportId = generateReportId();
            let report : ModerationReport = {
                id = reportId;
                contentId = contentId;
                contentType = contentType;
                reportedBy = reportedBy;
                reason = reason;
                description = description;
                timestamp = Time.now();
                status = "pending";
                moderatorId = null;
                moderationAction = null;
                resolution = null;
            };
            
            moderationReports.put(reportId, report);
            
            // Auto-escalate if multiple reports for same content
            await checkForMultipleReports(contentId);
            
            #ok(reportId)
        };

        public func reviewReport(reportId: Text, moderatorId: Principal, action: ModerationAction, resolution: Text) : async Result.Result<(), Text> {
            switch (moderationReports.get(reportId)) {
                case (?report) {
                    let updated = {
                        report with
                        status = "reviewed";
                        moderatorId = ?moderatorId;
                        moderationAction = ?action;
                        resolution = ?resolution;
                    };
                    moderationReports.put(reportId, updated);
                    
                    // Execute the moderation action
                    await executeModerationAction(report.contentId, report.contentType, action, resolution);
                    
                    #ok()
                };
                case null #err("Report not found");
            }
        };

        public func getUserModerationHistory(userId: Principal) : async ?UserModerationHistory {
            userModerationHistory.get(userId)
        };

        public func getPendingReports(_moderatorId: Principal) : async [ModerationReport] {
            Array.filter<ModerationReport>(
                Array.map<(Text, ModerationReport), ModerationReport>(
                    Iter.toArray(moderationReports.entries()),
                    func((id, report)) = report
                ),
                func(report) = report.status == "pending"
            )
        };

        public func addModerationRule(rule: ModerationRule) : async Result.Result<(), Text> {
            moderationRules.put(rule.id, rule);
            #ok()
        };

        public func updateTrustScore(userId: Principal, adjustment: Float) : async Result.Result<(), Text> {
            switch (userModerationHistory.get(userId)) {
                case (?history) {
                    let newScore = Float.max(0.0, Float.min(100.0, history.trustScore + adjustment));
                    let updated = { history with trustScore = newScore };
                    userModerationHistory.put(userId, updated);
                };
                case null {
                    let newHistory : UserModerationHistory = {
                        userId = userId;
                        warnings = 0;
                        suspensions = 0;
                        bans = 0;
                        lastAction = null;
                        totalReports = 0;
                        totalViolations = 0;
                        trustScore = 100.0 + adjustment;
                    };
                    userModerationHistory.put(userId, newHistory);
                };
            };
            #ok()
        };

        public func addModerator(caller: Principal, moderatorId: Principal, permissions: [Text]) : async Result.Result<(), Text> {
            // Add a new moderator with specific permissions
            if (not isAdmin(caller)) {
                return #err("Unauthorized: Only admins can add moderators");
            };
            
            let moderatorInfo = {
                id = moderatorId;
                permissions = permissions;
                addedBy = caller;
                addedAt = Time.now();
                active = true;
            };
            
            moderators.put(moderatorId, moderatorInfo);
            #ok()
        };
        
        public func removeModerator(caller: Principal, moderatorId: Principal) : async Result.Result<(), Text> {
            // Remove a moderator
            if (not isAdmin(caller)) {
                return #err("Unauthorized: Only admins can remove moderators");
            };
            
            switch (moderators.get(moderatorId)) {
                case (?_) {
                    moderators.delete(moderatorId);
                    #ok()
                };
                case null #err("Moderator not found");
            }
        };
        
        public func updateModerationSettings(caller: Principal, _settings: {
            autoModerationEnabled: Bool;
            strictnessLevel: Float;
            autoRemoveThreshold: Float;
            escalationThreshold: Nat;
        }) : async Result.Result<(), Text> {
            // Update global moderation settings
            if (not isAdmin(caller)) {
                return #err("Unauthorized: Only admins can update settings");
            };
            
            // Store settings (in a real implementation, these would be persistent)
            // autoModerationEnabled := settings.autoModerationEnabled;
            // strictnessLevel := settings.strictnessLevel;
            // etc.
            
            #ok()
        };
        
        public func getModerationStats(caller: Principal) : async Result.Result<{
            totalReports: Nat;
            pendingReports: Nat;
            resolvedReports: Nat;
            autoModeratedContent: Nat;
            activeModerators: Nat;
        }, Text> {
            // Get comprehensive moderation statistics
            if (not (isModerator(caller) or isAdmin(caller))) {
                return #err("Unauthorized: Only moderators can view stats");
            };
            
            let totalReports = moderationReports.size();
            var pendingCount = 0;
            var resolvedCount = 0;
            
            for ((_, report) in moderationReports.entries()) {
                switch (report.status) {
                    case ("pending") pendingCount += 1;
                    case ("resolved") resolvedCount += 1;
                    case (_) {};
                };
            };
            
            let stats = {
                totalReports = totalReports;
                pendingReports = pendingCount;
                resolvedReports = resolvedCount;
                autoModeratedContent = autoModerationResults.size();
                activeModerators = moderators.size();
            };
            
            #ok(stats)
        };
        
        // Additional functions required by main.mo
        public func getModerationRules() : async [ModerationRule] {
            let rules = Buffer.Buffer<ModerationRule>(0);
            for ((_, rule) in moderationRules.entries()) {
                rules.add(rule);
            };
            Buffer.toArray(rules)
        };

        public func getAutoModerationResults(contentId: Text) : async ?AutoModerationResult {
            autoModerationResults.get(contentId)
        };

        public func updateModerationRule(ruleId: Text, updates: {
            name: ?Text;
            description: ?Text;
            severity: ?Nat;
            threshold: ?Float;
            enabled: ?Bool;
        }) : async Result.Result<(), Text> {
            switch (moderationRules.get(ruleId)) {
                case (?rule) {
                    let updatedRule = {
                        rule with
                        name = switch (updates.name) { case (?n) n; case null rule.name };
                        description = switch (updates.description) { case (?d) d; case null rule.description };
                        severity = switch (updates.severity) { case (?s) s; case null rule.severity };
                        threshold = switch (updates.threshold) { case (?t) t; case null rule.threshold };
                        enabled = switch (updates.enabled) { case (?e) e; case null rule.enabled };
                    };
                    moderationRules.put(ruleId, updatedRule);
                    #ok()
                };
                case null #err("Moderation rule not found");
            }
        };

        public func deleteModerationRule(ruleId: Text) : async Result.Result<(), Text> {
            switch (moderationRules.get(ruleId)) {
                case (?_) {
                    moderationRules.delete(ruleId);
                    #ok()
                };
                case null #err("Moderation rule not found");
            }
        };

        public func getUserTrustScore(userId: Principal) : async Float {
            switch (userModerationHistory.get(userId)) {
                case (?history) history.trustScore;
                case null 100.0; // Default trust score for new users
            }
        };

        public func escalateReport(reportId: Text, _priority: Text) : async Result.Result<(), Text> {
            switch (moderationReports.get(reportId)) {
                case (?report) {
                    // In a real implementation, you would update the report with priority
                    // For now, just return success
                    #ok()
                };
                case null #err("Report not found");
            }
        };

        public func getHighPriorityReports() : async [ModerationReport] {
            let highPriorityReports = Buffer.Buffer<ModerationReport>(0);
            for ((_, report) in moderationReports.entries()) {
                // In a real implementation, you would check the priority field
                // For now, return pending reports as high priority
                if (report.status == "pending") {
                    highPriorityReports.add(report);
                };
            };
            Buffer.toArray(highPriorityReports)
        };

        public func getReportsByStatus(status: Text) : async [ModerationReport] {
            let filteredReports = Buffer.Buffer<ModerationReport>(0);
            for ((_, report) in moderationReports.entries()) {
                if (report.status == status) {
                    filteredReports.add(report);
                };
            };
            Buffer.toArray(filteredReports)
        };

        public func getReportsByReason(reason: ModerationReason) : async [ModerationReport] {
            let filteredReports = Buffer.Buffer<ModerationReport>(0);
            for ((_, report) in moderationReports.entries()) {
                if (report.reason == reason) {
                    filteredReports.add(report);
                };
            };
            Buffer.toArray(filteredReports)
        };

        public func getModerationStatsPublic() : async {
            totalReports: Nat;
            pendingReports: Nat;
            resolvedReports: Nat;
            flaggedContent: Nat;
            averageConfidence: Float;
        } {
            let totalReports = moderationReports.size();
            var pendingCount = 0;
            var resolvedCount = 0;
            var totalConfidence = 0.0;
            var flaggedCount = 0;
            
            for ((_, report) in moderationReports.entries()) {
                switch (report.status) {
                    case ("pending") pendingCount += 1;
                    case ("resolved") resolvedCount += 1;
                    case (_) {};
                };
            };

            for ((_, result) in autoModerationResults.entries()) {
                if (result.flagged) {
                    flaggedCount += 1;
                };
                totalConfidence += result.confidence;
            };

            let avgConfidence = if (autoModerationResults.size() > 0) {
                totalConfidence / Float.fromInt(autoModerationResults.size())
            } else {
                0.0
            };

            {
                totalReports = totalReports;
                pendingReports = pendingCount;
                resolvedReports = resolvedCount;
                flaggedContent = flaggedCount;
                averageConfidence = avgConfidence;
            }
        };
    }
}
