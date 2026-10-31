import { Alert, Platform, Share } from "react-native";
import * as Clipboard from "expo-clipboard";

export async function shareCommunityInvite(community, inviterName = "A neighbour") {
  if (!community?.id) {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.alert("Please join or select a community first to share it.");
    } else {
      Alert.alert("Notice", "Please join or select a community first to share it.");
    }
    return;
  }

  // The link that someone can click to join this specific community
  // If hosted on your domain or local web, use origin; otherwise default to nestly:// or web
  let origin = "https://nestly.app";
  if (Platform.OS === "web" && typeof window !== "undefined" && window.location?.origin) {
    origin = window.location.origin;
  }

  const shareUrl = `${origin}/?communityId=${encodeURIComponent(community.id)}`;
  const deepLink = `nestly://join?communityId=${encodeURIComponent(community.id)}`;

  const shareText =
    `🏡 Join our community "${community.name}" on Nestly!\n\n` +
    `Tap to join: ${shareUrl}\n` +
    `(App link: ${deepLink})`;

  // ==========================================
  // WEB BROWSER IMPLEMENTATION
  // ==========================================
  if (Platform.OS === "web") {
    // 1. Try modern navigator.share (works on mobile web & supported browsers)
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `Join ${community.name} on Nestly`,
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch (err) {
        // User cancelled share or dismissed dialog; if error wasn't AbortError, fall through to clipboard
        if (err.name === "AbortError") return;
      }
    }

    // 2. Reliable Clipboard Copy for Web (Desktop / Laptops)
    let copied = false;
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareText);
        copied = true;
      }
    } catch (e) {
      // Fallback below
    }

    if (!copied) {
      try {
        await Clipboard.setStringAsync(shareText);
        copied = true;
      } catch (e) {
        // Fallback for older browsers
        try {
          const textarea = document.createElement("textarea");
          textarea.value = shareText;
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand("copy");
          document.body.removeChild(textarea);
          copied = true;
        } catch (err) {
          console.warn("Clipboard copy error:", err);
        }
      }
    }

    // Always show clear browser alert / feedback
    if (typeof window !== "undefined") {
      window.alert(
        `Invite Link Copied! 📋\n\nThe link for "${community.name}" has been copied to your clipboard.\n\nPaste it into WhatsApp, SMS, or Telegram to invite your neighbours!`
      );
    }
    return;
  }

  // ==========================================
  // MOBILE APP (ANDROID / IOS) IMPLEMENTATION
  // ==========================================
  try {
    const result = await Share.share({
      title: `Join ${community.name} on Nestly`,
      message: shareText,
      url: shareUrl, // Used by iOS native share sheet
    });

    if (result.action === Share.dismissedAction) {
      return;
    }
  } catch (error) {
    console.warn("Share error, copying to clipboard:", error.message);
    await Clipboard.setStringAsync(shareText);
    Alert.alert(
      "Link Copied! 📋",
      `The invite link for "${community.name}" has been copied to your clipboard. Paste it in WhatsApp or Messages to invite neighbours.`
    );
  }
}
