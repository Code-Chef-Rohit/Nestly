# Nestly Mobile Application 📱

> **Hyper-Local Neighbourhood Care & Community Services**

The React Native (Expo) frontend for **Nestly**, connecting neighbours, local civic services, and verified home professionals.

---

## ⚡ Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Run the OwnPay backend server (in a separate terminal)
node server/ownpay-server.js

# 3. Start Expo development server
npx expo start
```

---

## 📦 Key Screens

1. **AuthScreen**: Resident authentication with email/password and session persistence.
2. **LocationSelectionScreen**: GPS auto-detection and locality search.
3. **JoinCommunityScreen**: Search and join residential societies or create a new community.
4. **HomeScreen**: Resident dashboard with live community stats, emergency helpline bar, and quick actions.
5. **CommunityFeedScreen**: Categorized neighbour updates, notice board, and discussion posts.
6. **CreatePostScreen**: Post creation with category tags.
7. **ReportIssueScreen**: Maintenance and issue reporting with priority selectors (Normal, Important, Urgent SOS).
8. **ServicesScreen**: Real-time directory of verified local services (plumbing, electrical, cleaning, senior care).
9. **AddServiceScreen**: Provider registration with 10-digit phone validation, ₹99 verification deposit, and OwnPay UPI checkout.
10. **ProfileScreen**: Resident account management, community switcher, and live backend connection status.

---

## 🔒 Environment Configuration

Create a `.env` file in this directory:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_ADMIN_UPI_ID=your_upi@bank
EXPO_PUBLIC_ADMIN_PAYEE_NAME=Nestly Platform
EXPO_PUBLIC_SERVICE_LISTING_FEE=99
EXPO_PUBLIC_COMMISSION_PERCENT=10
EXPO_PUBLIC_OWNPAY_ENDPOINT=http://localhost:4000
EXPO_PUBLIC_OWNPAY_API_KEY=nestly_ownpay_live_secret_key
```

---

## 🛡️ Architecture & Verification

- **Direct UPI Protocol**: Interacts natively with installed UPI apps (`upi://pay`) or OwnPay hosted gateway.
- **Cache Invalidation**: TanStack Query automatically refetches and syncs changes across active tabs.
- **Senior Accessibility**: Standard 48px+ touch targets, high-contrast text, and simple navigation flows.
