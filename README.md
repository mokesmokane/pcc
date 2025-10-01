# Podcast Club - Local-First React Native App Template

A production-ready React Native template for building a local-first podcast app with social features. Built with TypeScript, WatermelonDB for local data, and Supabase for cloud sync.

## 🏗 Architecture

This template implements a **local-first** architecture where:
- The device database is the source of truth for the UI
- All reads are from local DB (instant UI)
- Writes are optimistic with an outbox pattern
- Background sync engine handles cloud synchronization
- Works fully offline with automatic sync when online

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your Supabase credentials

# iOS
npm run ios

# Android
npm run android
```

## 📁 Project Structure

```
/app
  /components      # Reusable UI components
  /screens        # Screen components
  /navigation     # Navigation configuration
  /hooks          # Custom React hooks
  /services       # Business logic layer
    /auth         # Authentication with Supabase
    /sync         # Sync engine and conflict resolution
    /playback     # Audio playback service
    /download     # Download manager
    /supabase     # Supabase client wrapper
  /data           # Data layer
    /repositories # Repository pattern implementations
  /db             # Database schema and models
  /state          # UI-only state (Zustand)
  /types          # TypeScript type definitions
  /config         # App configuration
```

## 🎯 Key Features

### Local-First Architecture
- **WatermelonDB** for reactive local database
- **Repository pattern** for data access
- **Optimistic updates** with rollback support
- **Outbox pattern** for reliable sync

### Sync Engine
- Automatic background sync
- Conflict resolution strategies
- Delta sync with change tokens
- Real-time updates via Supabase

### Services
- **Auth**: Supabase authentication with secure token storage
- **Playback**: Audio playback with background support
- **Downloads**: Resumable downloads with progress tracking
- **Network**: Manages API calls and real-time subscriptions

### Conflict Resolution
- Server-wins for catalog data
- Max-value for playback progress
- Operation-based for social features
- Custom resolvers per entity type

## 🛠 Development

```bash
# Type checking
npm run typecheck

# Linting
npm run lint
npm run lint:fix

# Testing
npm test
npm run e2e:test:ios

# Mock server
npm run mock:server
```

## 📦 Dependencies

### Core
- `react-native` - Mobile framework
- `expo` - Development platform
- `@nozbe/watermelondb` - Local database
- `@supabase/supabase-js` - Backend services
- `zustand` - UI state management

### Audio & Downloads
- `react-native-track-player` - Audio playback
- `react-native-fs` - File system access
- `react-native-background-fetch` - Background tasks

### Navigation
- `@react-navigation/native` - Navigation
- `@react-navigation/native-stack` - Stack navigator

## 🔧 Configuration

Environment variables (`.env`):
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
APP_FEATURE_DOWNLOADS=true
APP_FEATURE_OFFLINE_MODE=true
```

## 📝 Next Steps

1. **Set up Supabase**
   - Create project at supabase.com
   - Add your credentials to `.env`
   - Create database schema matching local models

2. **Define your schema**
   - Update `/app/db/schema.ts` with your tables
   - Create model classes extending WatermelonDB models
   - Update repositories for your entities

3. **Implement features**
   - Add screens for your podcast features
   - Implement social interactions
   - Customize conflict resolution rules

4. **Testing**
   - Add unit tests for repositories
   - Add integration tests for sync
   - Test offline scenarios

## 📖 Documentation

See [AGENTS.md](./AGENTS.md) for detailed architecture guidelines and development patterns.

## 🤝 Contributing

This is a template project. Fork it and make it your own!

## 📄 License

MIT