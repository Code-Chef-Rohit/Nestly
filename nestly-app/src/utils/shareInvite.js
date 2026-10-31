import { Alert, Platform, Share } from "react-native";
import * as Clipboard from "expo-clipboard";

/**
 * Robust share invite function that works across Mobile (Android/iOS) and Web.
 * Includes automatic clipboard copy fallback so users are never blocked.
 */
export async function shareCommunityInvite(community, inviterName = "A neighbour") {
  if (!community?.id) {
    Alert.alert("Notice", "No community selected to share.");
    return;
  }

  // Deep link format that opens the app and web fallback link
  const deepLink = `nestly://join?communityId=${community.id}`;
  const webLink = `https://nestly.app/join?communityId=${community.id}`;

  const message =
    `🏡 Join our neighbourhood community "${community.name}" on Nestly!\n\n` +
    `Connect with neighbours, report local issues, and access trusted services.\n\n` +
    `Direct Link: ${deepLink}\n` +
    `Web Link: ${webLink}\n\n` +
    `(Or search for "${community.name}" in Nestly)`;

  // On Web: copy directly to clipboard and show toast/alert
  if (Platform.OS === "web") {
    try {
      if (navigator?.share) {
        await navigator.share({
          title: `Join ${community.name} on Nestly`,
          text: message,
          url: webLink,
        });
        return;
      }
    } catch (e) {
      // User cancelled or not supported
    }

    try {
      await Clipboard.setStringAsync(message);
      Alert.alert(
        "Invite Link Copied! 📋",
        `The invite link for "${community.name}" has been copied to your clipboard. Send it to your neighbours on WhatsApp or SMS!`
      );
      return;
    } catch (e) {
      console.warn("Clipboard error:", e);
    }
  }

  // On Native Mobile (Android & iOS):
  try {
    const result = await Share.share(
      Platform.select({
        ios: {
          message: message,
          url: webLink,
        },
        default: {
          title: `Join ${community.name} on Nestly`,
          message: message,
        },
      })
    );

    if (result.action === Share.dismissedAction) {
      // User dismissed dialog
    }
  } catch (error) {
    console.warn("Native share error, falling back to clipboard:", error.message);
    // Fallback: copy link to clipboard so sharing never fails
    await Clipboard.setStringAsync(message);
    Alert.alert(
      "Link Copied! 📋",
      `The invite link for "${community.name}" has been copied to your clipboard. You can paste it directly on WhatsApp or Messages.`
    );
  }
}
