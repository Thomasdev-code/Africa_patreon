# AI Tools Module Implementation

## Overview
Complete AI Tools Module for creators with Pro subscription paywall, including thumbnail generation, post writing, title generation, and content ideas.

## Database Changes

### Prisma Schema Updates
- Added `subscriptionPlan` field to User model (default: "free")
- Added `aiCredits` field to User model (default: 0)
- Added `AiUsageHistory` model to track all AI tool usage

### Migration Required
After reviewing the changes, run:
```bash
npx prisma migrate dev --name add_ai_tools_module
npx prisma generate
```

## New Files Created

### Pages
- `app/creator/ai-tools/page.tsx` - Main AI tools dashboard
- `app/creator/ai-tools/thumbnail/page.tsx` - Thumbnail generator
- `app/creator/ai-tools/post-writer/page.tsx` - Post writer
- `app/creator/ai-tools/title-generator/page.tsx` - Title generator
- `app/creator/ai-tools/ideas-generator/page.tsx` - Ideas generator
- `app/creator/ai-tools/upgrade/page.tsx` - Pro upgrade page
- `app/admin/ai-config/page.tsx` - Admin AI configuration

### API Routes
- `app/api/ai/check-access/route.ts` - Check Pro access and credits
- `app/api/ai/thumbnail/route.ts` - Generate thumbnails
- `app/api/ai/post-writer/route.ts` - Generate posts
- `app/api/ai/title/route.ts` - Generate titles
- `app/api/ai/ideas/route.ts` - Generate content ideas
- `app/api/subscriptions/pro/create/route.ts` - Create Pro subscription
- `app/api/subscriptions/pro/webhook/route.ts` - Handle Pro subscription webhooks
- `app/api/admin/ai/grant-credits/route.ts` - Admin grant credits

### Libraries
- `lib/ai/check-pro-access.ts` - Pro access and credit management
- `lib/ai/openai-client.ts` - OpenAI API client wrapper
- `lib/ai/thumbnail-generator.ts` - Thumbnail generation logic
- `lib/ai/rate-limiter.ts` - Rate limiting for AI endpoints

### Components
- `components/ai/UpgradeBanner.tsx` - Paywall banner component
- `components/admin/AiConfigClient.tsx` - Admin AI config UI

## Features

### 1. Paywall System
- Non-Pro users see upgrade banner on all AI tool pages
- Pro subscription required to access AI tools
- Credits displayed prominently

### 2. Pro Subscription
- $9.99/month subscription
- Supports Stripe, Paystack, and Flutterwave
- 50 AI credits per month included
- Webhook handlers activate/deactivate Pro status

### 3. AI Tools
- **Thumbnail Generator**: Creates thumbnails with watermark support
- **Post Writer**: Generates posts with customizable tone and length
- **Title Generator**: Creates multiple title options
- **Ideas Generator**: Generates content ideas for any niche

### 4. Security & Rate Limiting
- All AI endpoints require Pro subscription
- Rate limiting: 20 requests per hour per creator
- Role-based access control (creator only)
- Credit deduction on successful generation

### 5. Admin Features
- View total AI usage statistics
- View Pro user count
- Grant credits manually to users
- View usage by tool type
- View recent usage logs

## Environment Variables Required

```env
OPENAI_API_KEY=your_openai_api_key_here
```

## Usage Flow

1. Creator navigates to `/creator/ai-tools`
2. If not Pro, sees upgrade banner
3. Clicks "Upgrade to Pro" → redirected to upgrade page
4. Selects payment provider → creates subscription
5. Webhook activates Pro status and grants 50 credits
6. Creator can now use AI tools (1 credit per use)
7. Credits deducted on successful generation
8. Usage logged in `AiUsageHistory`

## Webhook Integration

The Pro subscription webhook handler (`/api/subscriptions/pro/webhook`) processes:
- Successful payments → Activate Pro, grant 50 credits
- Cancellations → Deactivate Pro, set to free
- Failed payments → Handle appropriately

## Next Steps

1. Run Prisma migration: `npx prisma migrate dev --name add_ai_tools_module`
2. Generate Prisma client: `npx prisma generate`
3. Set `OPENAI_API_KEY` in environment variables
4. Test Pro subscription flow with each payment provider
5. Configure webhook URLs in payment provider dashboards:
   - Stripe: `/api/subscriptions/pro/webhook`
   - Paystack: `/api/subscriptions/pro/webhook`
   - Flutterwave: `/api/subscriptions/pro/webhook`

## Notes

- Thumbnail watermark processing is stubbed (TODO: implement with image processing library)
- Monthly credit reset needs to be implemented via cron job
- Consider adding credit purchase option for additional credits
- Rate limiting is per-creator, consider adding global limits

