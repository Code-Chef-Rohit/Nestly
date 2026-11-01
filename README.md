# Nestly 🏡
> **Your Neighbourhood. Your Community. Connected & Verified.**

Nestly is a modern, mobile-first neighbourhood engagement and local services platform designed for residential societies, apartment complexes, and local neighbourhoods. Built with a focus on simplicity, community trust, and **senior accessibility**, Nestly empowers neighbours to communicate, report maintenance issues, hire verified local professionals, and reach emergency helplines in one touch.

---

## 🌟 Key Features

### 🏘️ Hyper-Local Neighbourhood Communities
- **Real-Time Feed**: Post community updates, ask questions, share notices, and connect with verified neighbours.
- **Neighbourhood Search & Join**: Auto-detect your location or search by area/pincode to join or create your society.
- **Invite Neighbours**: One-tap WhatsApp and SMS invite links with auto-filled neighbourhood invite codes.

### 🛠️ Verified Local Services & Monetization
- **Direct Service Directory**: Discover trusted local service providers (electricians, plumbers, carpenters, cleaning, senior assistance, cooking).
- **Service Registration**: Providers list their services with a one-time verification deposit and platform protection terms.
- **10% Platform Protection**: Transparent booking breakdown with 10% platform protection fee and direct booking confirmations.
- **10-Digit Verified Contact**: Direct calling and WhatsApp integration for instant service coordination.

### 💳 OwnPay Payment & UPI Engine
- **Self-Hosted OwnPay Microservice**: Integrated with the open-source [OwnPay](https://github.com/own-pay/ownpay) v0.2.0+ Merchant REST API specification.
- **Zero-Intermediary Gateway Fees**: Direct settlement into payee bank accounts via UPI (NPCI standard).
- **Universal Mobile Support**: Native deep-linking for Google Pay, PhonePe, Paytm, BHIM, and bank UPI apps with instant QR fallback for desktop web.

### 🚨 Emergency SOS & Senior Assistance
- **One-Touch Helplines**: Immediate access to Ambulance (108), Senior Citizen Helpline (14567), Police (112), Fire Station (101), and Gate Security.
- **Accessible UI/UX**: Large typography, high-contrast color palettes, 48px+ touch targets, and tactile visual feedback designed for all age groups.

### 📋 Civic Maintenance & Issue Tracking
- **Step-by-Step Reporting**: Report maintenance issues (water, electricity, lifts, garbage, security) with urgency levels (Normal, Important, Urgent SOS).
- **Ticket Tracking**: Status pipeline tracking (`Reported` → `Assigned` → `In Progress` → `Resolved`).

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Mobile App** | React Native, Expo (SDK 52), React Navigation |
| **Data & Caching** | TanStack React Query v5, AsyncStorage |
| **Backend & Database** | Supabase (PostgreSQL), Row Level Security (RLS) |
| **Payments** | OwnPay Payment Engine, NPCI UPI Intent Protocol |
| **Icons & Assets** | Expo Vector Icons (Ionicons), Custom Nestly Design System |

---

## 🚀 Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/Code-Chef-Rohit/Nestly.git
cd Nestly/nestly-app
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env` file in the `nestly-app` directory:
```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
EXPO_PUBLIC_ADMIN_UPI_ID=your_upi_id@bank
EXPO_PUBLIC_ADMIN_PAYEE_NAME=Nestly Platform
EXPO_PUBLIC_SERVICE_LISTING_FEE=99
EXPO_PUBLIC_COMMISSION_PERCENT=10
EXPO_PUBLIC_OWNPAY_ENDPOINT=http://localhost:4000
EXPO_PUBLIC_OWNPAY_API_KEY=your_secret_key
```

### 4. Run the OwnPay Payment Microservice
```bash
node server/ownpay-server.js
```

### 5. Launch the Mobile App
```bash
npx expo start
```
- Press `a` for Android emulator
- Press `w` for Web browser
- Scan the terminal QR code with **Expo Go** on Android or iOS

---

## 📁 Repository Structure

```
Nestly/
├── nestly-app/
│   ├── assets/                # Official Nestly logos, icons, and splash screens
│   ├── database/              # PostgreSQL schema & Row Level Security policies
│   ├── server/                # Self-hosted OwnPay payment microservice
│   └── src/
│       ├── components/        # PostCard, IssueCard, ServiceCard, QuickActionButton
│       ├── config/            # Supabase cloud client configuration
│       ├── constants/         # Category definitions and metadata
│       ├── context/           # AuthContext (session, auth state, active community)
│       ├── navigation/        # Stack & Bottom Tab navigators
│       ├── screens/           # Core app screens (Home, Feed, Services, Issues, Profile)
│       ├── theme/             # Design tokens (colors, shadows, radii)
│       └── utils/             # Payment utilities, UPI intent builders, invite sharing
├── LICENSE                    # Apache-2.0 License
└── README.md                  # Project documentation
```

---

## 📄 License
This project is licensed under the Apache License 2.0. See the [LICENSE](LICENSE) file for details.
