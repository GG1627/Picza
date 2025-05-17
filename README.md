# Picza - UF Food Community App

Picza is a modern food community application designed specifically for UF, UM, FSU students. The app helps students discover, share, and connect over food experiences on campus.

## Features

- 🔐 **Secure Authentication**

  - UF email-based authentication (@ufl.edu)(etc.)
  - Secure password management
  - Password reset functionality

- 🍕 **Food Discovery**

  - Browse food options on campus
  - View detailed food information
  - Filter and search capabilities

- 👥 **Community Features**
  - User profiles
  - Social interactions
  - Food recommendations

## Tech Stack

- **Frontend**: React Native with Expo
- **Styling**: TailwindCSS
- **Authentication**: Supabase Auth
- **Database**: Supabase
- **Navigation**: Expo Router
- **Icons**: Ionicons

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Expo CLI
- iOS Simulator (for Mac) or Android Studio (for Android development)

## Installation

1. Clone the repository:

```bash
git clone [repository-url]
cd picza - NOTE: Rename the porject
```

2. Install dependencies:

```bash
npm install
# or
yarn install
```

3. Set up environment variables:
   Create a `.env` file in the root directory and add your Supabase credentials:

```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Start the development server:

```bash
npx expo start
```

## Project Structure

```
picza/
├── app/                    # Main application code
│   ├── (auth)/            # Authentication screens
│   │   ├── login.tsx
│   │   ├── signup.tsx
│   │   └── reset-password.tsx
│   ├── (main)/            # Main app screens
│   └── index.tsx          # Entry point
├── lib/                    # Utility functions and configurations
│   └── supabase.ts        # Supabase client configuration
├── images/                 # Static images and assets
└── components/            # Reusable components
```

## Development

### Running the App

- For iOS:

```bash
npx expo start --ios
```

- For Android:

```bash
npx expo start --android
```

### Building for Production

1. Configure app.json with your app details
2. Run the build command:

```bash
eas build --platform ios
# or
eas build --platform android
```

## Security

- All authentication is handled through Supabase
- UF email verification required for registration
- Secure password reset flow
- Protected API routes

## License

This project is licensed under a Proprietary License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- University of Florida
- Supabase
- Expo Team
- React Native Community

## Support

For support, email [your-email] or open an issue in the repository.

---

Made with ❤️ for UF Students
