import HashMap "mo:base/HashMap";
import Array "mo:base/Array";
import Time "mo:base/Time";
import Result "mo:base/Result";
import Principal "mo:base/Principal";
import Text "mo:base/Text";
import Nat "mo:base/Nat";
import Int "mo:base/Int";

module NotificationManager {
    public type NotificationType = {
        #NewFollower;
        #NewSubscriber;
        #StreamStarted;
        #VideoLiked;
        #VideoCommented;
        #GiftReceived;
        #RaidReceived;
        #SystemAnnouncement;
        #ModerationAlert;
    };

    public type NotificationPriority = {
        #Low;
        #Medium;
        #High;
        #Critical;
    };

    public type Notification = {
        id: Text;
        recipient: Principal;
        sender: ?Principal;
        notificationType: NotificationType;
        title: Text;
        message: Text;
        priority: NotificationPriority;
        data: ?Text; // JSON metadata
        read: Bool;
        timestamp: Int;
        expiresAt: ?Int;
    };

    public type NotificationPreferences = {
        userId: Principal;
        emailNotifications: Bool;
        pushNotifications: Bool;
        streamStartNotifications: Bool;
        socialNotifications: Bool;
        systemNotifications: Bool;
        marketingNotifications: Bool;
        quietHours: {
            enabled: Bool;
            startTime: Nat; // Hour of day (0-23)
            endTime: Nat;   // Hour of day (0-23)
        };
    };

    public type PushSubscription = {
        userId: Principal;
        endpoint: Text;
        keys: {
            p256dh: Text;
            auth: Text;
        };
        deviceType: Text;
        lastUsed: Int;
    };

    public class NotificationManager() {
        private var notifications = HashMap.HashMap<Text, Notification>(0, Text.equal, Text.hash);
        private var userNotifications = HashMap.HashMap<Principal, [Text]>(0, Principal.equal, Principal.hash);
        private var preferences = HashMap.HashMap<Principal, NotificationPreferences>(0, Principal.equal, Principal.hash);
        private var pushSubscriptions = HashMap.HashMap<Principal, [PushSubscription]>(0, Principal.equal, Principal.hash);

    public func sendNotification(
        _caller: Principal,
        recipient: Principal,
        sender: ?Principal,
        notificationType: NotificationType,
        title: Text,
        message: Text,
        priority: NotificationPriority,
        data: ?Text
    ) : async Result.Result<Text, Text> {
        let notificationId = generateNotificationId();
        let notification : Notification = {
            id = notificationId;
            recipient = recipient;
            sender = sender;
            notificationType = notificationType;
            title = title;
            message = message;
            priority = priority;
            data = data;
            read = false;
            timestamp = Time.now();
            expiresAt = null;
        };

        // Store notification
        notifications.put(notificationId, notification);
        
        // Add to user's notification list
        switch (userNotifications.get(recipient)) {
            case (?existing) {
                userNotifications.put(recipient, Array.append(existing, [notificationId]));
            };
            case null {
                userNotifications.put(recipient, [notificationId]);
            };
        };

        // Send push notification if enabled
        await sendPushNotification(recipient, notification);
        
        #ok(notificationId)
    };

    public func getUserNotifications(userId: Principal, limit: Nat, offset: Nat) : [Notification] {
        switch (userNotifications.get(userId)) {
            case (?notificationIds) {
                let totalSize = notificationIds.size();
                if (offset >= totalSize) {
                    []
                } else {
                    // Use a simple loop approach to avoid arithmetic traps
                    let endIndex = if (offset + limit > totalSize) totalSize else offset + limit;
                    var results : [Notification] = [];
                    var i = offset;
                    while (i < endIndex) {
                        switch (notifications.get(notificationIds[i])) {
                            case (?notification) {
                                results := Array.append(results, [notification]);
                            };
                            case null {};
                        };
                        i += 1;
                    };
                    results
                }
            };
            case null [];
        }
    };

    public func markAsRead(_caller: Principal, notificationId: Text) : async Result.Result<(), Text> {
        switch (notifications.get(notificationId)) {
            case (?notification) {
                let updated = { notification with read = true };
                notifications.put(notificationId, updated);
                #ok()
            };
            case null #err("Notification not found");
        }
    };

    public func updatePreferences(_caller: Principal, userId: Principal, prefs: NotificationPreferences) : async Result.Result<(), Text> {
        preferences.put(userId, prefs);
        #ok()
    };

    public func subscribeToPush(_caller: Principal, userId: Principal, subscription: PushSubscription) : async Result.Result<(), Text> {
        switch (pushSubscriptions.get(userId)) {
            case (?existing) {
                let updated = Array.append(existing, [subscription]);
                pushSubscriptions.put(userId, updated);
            };
            case null {
                pushSubscriptions.put(userId, [subscription]);
            };
        };
        #ok()
    };

    public func broadcastAnnouncement(_caller: Principal, _title: Text, _message: Text) : async Result.Result<(), Text> {
        // Send announcement to all users
        // This would iterate through all users and send notifications
        #ok()
    };

    private func sendPushNotification(_userId: Principal, _notification: Notification) : async () {
        // Send push notification to user's devices
        // This would integrate with push notification service
    };

        private func generateNotificationId() : Text {
            // Generate unique notification ID
            Int.toText(Time.now())
        };
    };
}