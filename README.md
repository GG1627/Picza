# Picza - The Ultimate Campus Food Community Platform 🍕

![Picza Logo](images/logo1.svg)

> "Where every bite tells a story, and every meal connects a community" 🎓

## Overview

Picza is a revolutionary social platform that connects university students through their shared passion for food. Built specifically for Florida's leading universities (UF, FSU, UM), Picza transforms the campus dining experience by creating a vibrant community where students can discover, share, and celebrate their culinary journeys.

Think of us as Instagram meets Yelp, but specifically for your campus food adventures! 🎯

## Core Features

### 🎯 Social Discovery

- **Smart Feed**: Your personal foodie radar 📡
- **Interactive Posts**: Like, comment, and share your foodie moments
- **Custom Albums**: Your digital food diary 📔
- **Real-time Updates**: Never miss the latest campus food trends

### 👤 User Experience

- **Intelligent Profile System**
  - Your foodie identity, your way
  - Smart username management
  - School spirit meets foodie culture
  - Professional image handling
- **Seamless Navigation**
  - Smooth navigation experience
  - Beautiful transitions
  - Context-aware UI

### Design Excellence

- **Adaptive Theming**
  - Dark mode for night owls
  - Light mode for early birds
  - Colors that pop like your favorite hot sauce
  - Smooth transitions
- **Modern UI Components**
  - Clean, minimalist design
  - Responsive layouts
  - Gesture-based interactions
  - Professional animations

## Technical Architecture

### Frontend Stack

- **Framework**: React Native with Expo
- **Styling**: TailwindCSS with custom theming
- **State Management**: React Context API
- **Navigation**: Expo Router
- **UI Components**: Custom-built with Ionicons
- **Image Processing**: Expo Image Picker
- **Animations**: React Native Animated

### Backend Infrastructure

- **Authentication**: Supabase Auth
- **Database**: Supabase PostgreSQL
- **Storage**: Supabase Storage
- **API**: RESTful architecture
- **Security**: JWT-based authentication

## Development Setup

### Prerequisites

- Node.js (v14+)
- npm/yarn
- Expo CLI
- iOS Simulator/Android Studio
- Git

### Installation

1. **Clone Repository**

```bash
git clone https://github.com/GG1627/Picza.git
cd Picza
```

2. **Install Dependencies**

```bash
npm install --legacy-peer-deps
# or
yarn install --legacy-peer-deps
```

3. **Launch Development Server**

```bash
npx expo start --clear
```

## Project Architecture

```
picza/
├── app/                    # Application core
│   ├── (auth)/            # Authentication module
│   │   ├── login.tsx      # Login interface
│   │   ├── signup.tsx     # Registration flow
│   │   └── reset-password.tsx
│   ├── (main)/            # Main application module
│   │   ├── feed.tsx       # Content feed
│   │   ├── profile.tsx    # User profiles
│   │   ├── create-post.tsx
│   │   ├── competitions.tsx
│   │   └── _layout.tsx    # Navigation structure
│   └── index.tsx          # Application entry
├── lib/                    # Core utilities
│   ├── supabase.ts        # Database client
│   ├── useColorScheme.ts  # Theme management
│   └── fonts.ts           # Typography system
├── images/                 # Asset management
└── components/            # Reusable components
```

## Security Implementation

### Authentication

- University email verification
- Secure password management
- JWT-based session handling
- Rate-limited API endpoints

### Data Protection

- Encrypted data transmission
- Secure image upload pipeline
- Input validation and sanitization
- Protected API routes

### User Privacy

- Granular privacy controls
- Data retention policies
- GDPR compliance
- Regular security audits

## Quality Assurance

### Testing Strategy

- Unit testing
- Integration testing
- UI/UX testing
- Performance monitoring

### Code Quality

- ESLint configuration
- Prettier formatting
- TypeScript type checking
- Code review process

## Deployment

### Production Build

```bash
eas build --platform ios
eas build --platform android
```

### Release Management

- Semantic versioning
- Automated deployment
- Rollback procedures
- Performance monitoring

## Support

Need help with Picza? We're here to support you!

### Contact Information

- **Technical Support**: [gael.garcia@ufl.edu](mailto:gael.garcia@ufl.edu)
- **General Inquiries**: [gael.garcia@ufl.edu](mailto:gael.garcia@ufl.edu)
- **Bug Reports**: [gael.garcia@ufl.edu](mailto:gael.garcia@ufl.edu)

### Getting Help

1. **Check our documentation** - Most questions can be answered here
2. **Search existing issues** - Your problem might already have a solution
3. **Create a new issue** - For bugs or feature requests
4. **Email us directly** - For urgent matters or private concerns

### Response Times

- **Critical Issues**: Within 24 hours
- **General Support**: Within 48 hours
- **Feature Requests**: Within 1 week

## Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

## License

Proprietary - All rights reserved

## Acknowledgments

- University of Florida (Go Gators! 🐊)
- Florida State University (Go Noles! 🍢)
- University of Miami (Go Canes! 🌀)
- Supabase (our tech backbone)
- Expo Team (making mobile magic)
- React Native Community (the real MVPs)

---

© 2025 Picza. All rights reserved. 🍕 Made with love and probably a slice of pizza
