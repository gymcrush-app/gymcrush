# Supabase Local Development Setup

This guide walks you through setting up Supabase locally before creating a project in the dashboard.

## Prerequisites

1. **Docker Desktop** - Supabase CLI uses Docker to run local services
   - Download: https://www.docker.com/products/docker-desktop
   - Make sure Docker is running before starting Supabase

2. **Supabase CLI** - Install globally
   ```bash
   npm install -g supabase
   ```

## Step 1: Initialize Supabase in Your Project

If you haven't already, initialize Supabase in your project:

```bash
cd /Users/chrischidgey/dev/gymcrush
supabase init
```

This creates a `supabase/config.toml` file with local configuration.

## Step 2: Start Supabase Local Services

Start all Supabase services (PostgreSQL, PostgREST, GoTrue, Storage, etc.):

```bash
supabase start
```

This will:
- Pull Docker images (first time only, ~5-10 minutes)
- Start all services
- Display connection details including:
  - API URL: `http://127.0.0.1:54321`
  - Anon Key: `eyJhbGc...` (copy this)
  - Service Role Key: `eyJhbGc...` (keep secret)
  - DB URL: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`

**Save these credentials!** You'll need the API URL and Anon Key for your `.env` file.

## Step 3: Configure Your .env File

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Then update it with your local Supabase credentials:

```env
EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-from-step-2
EXPO_PUBLIC_GOOGLE_PLACES_API_KEY=your-google-places-api-key
```

**Note**: For Google Places API key setup:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Places API (New)
4. Create an API key
5. Restrict the API key:
   - Application restrictions: Android/iOS app bundle IDs
   - API restrictions: Places API only
6. Add the key to your `.env` file as `EXPO_PUBLIC_GOOGLE_PLACES_API_KEY`

## Step 4: Run Database Migrations

Apply the initial schema migration:

```bash
supabase db reset
```

This will:
- Drop and recreate the database
- Run all migrations in `supabase/migrations/`
- Apply the schema from `00001_initial_schema.sql`

Alternatively, to just apply new migrations without resetting:

```bash
supabase migration up
```

## Step 5: (Optional) Seed Development Data

If you have seed data in `supabase/seed.sql`:

```bash
supabase db seed
```

Or manually:

```bash
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -f supabase/seed.sql
```

## Step 6: Verify Setup

1. **Check services are running:**
   ```bash
   supabase status
   ```

2. **Open Supabase Studio** (local dashboard):
   ```bash
   supabase studio
   ```
   This opens http://localhost:54323 in your browser where you can:
   - View tables
   - Run SQL queries
   - Manage auth users
   - Test API endpoints

3. **Test the connection** from your app:
   - Start your Expo app: `npm start`
   - Try signing up/logging in
   - Check Supabase Studio to see if data appears

## Step 7: Generate TypeScript Types

Generate types from your local database:

```bash
supabase gen types typescript --local > types/database.ts
```

This updates `types/database.ts` with your actual schema types.

## Common Commands

```bash
# Start services
supabase start

# Stop services
supabase stop

# View status
supabase status

# View logs
supabase logs

# Reset database (drops all data, reruns migrations)
supabase db reset

# Create a new migration
supabase migration new migration_name

# Apply pending migrations
supabase migration up

# Open Studio dashboard
supabase studio

# Generate types
supabase gen types typescript --local > types/database.ts
```

## Troubleshooting

### Docker not running
- Make sure Docker Desktop is running
- Check: `docker ps` should show running containers

### Port conflicts
- If ports 54321-54323 are in use, Supabase will try alternative ports
- Check `supabase status` for actual ports

### Reset everything
```bash
supabase stop
supabase start
supabase db reset
```

### View logs for debugging
```bash
supabase logs
# Or for specific service:
supabase logs --service postgres
supabase logs --service api
```

## Next Steps: Deploy to Production

Once you're ready to deploy:

1. **Create a Supabase project** in the dashboard: https://supabase.com/dashboard
2. **Link your local project:**
   ```bash
   supabase link --project-ref your-project-ref
   ```
3. **Push migrations:**
   ```bash
   supabase db push
   ```
4. **Update .env** with production credentials:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-production-anon-key
   ```

## Local vs Production

- **Local**: Use for development, testing migrations, rapid iteration
- **Production**: Use for actual app deployment, real users, backups

You can switch between them by updating your `.env` file.
