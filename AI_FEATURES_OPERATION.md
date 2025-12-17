# How AI Features Operate in Africa Patreon SaaS

## Overview

The AI features provide creators with AI-powered content creation tools including:
- **Thumbnail Generator** - Creates eye-catching thumbnails using DALL-E
- **Post Writer** - Generates engaging social media posts
- **Title Generator** - Creates compelling, click-worthy titles
- **Content Ideas Generator** - Suggests content ideas for your niche

---

## Architecture & Flow

### 1. **Access Control System**

```
User → Check Pro Subscription → Verify Credits → Rate Limit Check → Execute AI Tool
```

#### Access Requirements:
- **Pro Subscription**: User must have `subscriptionPlan = "pro"` in database
- **AI Credits**: User must have `aiCredits > 0` (1 credit per tool usage)
- **Role**: Only creators can access AI tools
- **Rate Limit**: Max 20 requests per hour per creator

#### Access Check Flow:
```typescript
1. User requests AI tool
2. System checks: session.user.role === "creator"
3. System checks: subscriptionPlan === "pro"
4. System checks: aiCredits >= 1
5. System checks: rate limit (20/hour)
6. If all pass → Execute AI generation
```

---

### 2. **Credit System**

#### Credit Management:
- **Initial Credits**: Pro users get 50 credits monthly
- **Credit Cost**: 1 credit per AI tool usage
- **Deduction**: Credits are deducted atomically (using transactions) only after successful generation
- **Reset**: Credits reset monthly on billing date
- **No Rollover**: Unused credits don't carry over

#### Credit Deduction Flow:
```typescript
1. Check if user has enough credits (>= 1)
2. Execute AI generation
3. If successful:
   - Log usage in AiUsageHistory
   - Deduct 1 credit atomically (transaction)
   - Return result to user
4. If failed:
   - Log error in AiUsageHistory
   - Don't deduct credits
   - Return error to user
```

---

### 3. **Rate Limiting**

#### Protection Against Abuse:
- **Limit**: 20 AI requests per hour per creator
- **Window**: Rolling 1-hour window
- **Tracking**: Uses `AiUsageHistory` table to count recent requests
- **Graceful Fallback**: If rate limit check fails, allows request (with logging)

#### Rate Limit Check:
```typescript
1. Query AiUsageHistory for requests in last hour
2. Count requests where createdAt >= (now - 1 hour)
3. If count < 20 → Allow request
4. If count >= 20 → Return 429 error with reset time
```

---

### 4. **AI Tool Execution Flow**

#### Complete Request Flow:

```
┌─────────────────────────────────────────────────────────────┐
│ 1. User submits request (e.g., "Generate post about X")    │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Authentication & Authorization Check                     │
│    - Verify user session                                    │
│    - Check role === "creator"                               │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Pro Subscription Check                                   │
│    - Query user.subscriptionPlan                            │
│    - Must be "pro"                                          │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Credit Check                                             │
│    - Query user.aiCredits                                   │
│    - Must be >= 1                                           │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Rate Limit Check                                         │
│    - Count AiUsageHistory in last hour                       │
│    - Must be < 20                                           │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. Input Validation & Sanitization                          │
│    - Validate input format                                   │
│    - Sanitize prompt (remove control chars, limit length)    │
│    - Validate parameters (tone, length, count, etc.)         │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. OpenAI API Call                                          │
│    - Build prompt with user input                            │
│    - Call OpenAI API with timeout (30s text, 60s images)    │
│    - Handle errors (429, 401, 500, timeout)                 │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│ 8. Log Usage (Always)                                       │
│    - Create AiUsageHistory record                            │
│    - Log: userId, toolType, input, output, success, error   │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│ 9. Deduct Credits (Only if successful)                      │
│    - Atomic transaction to decrement aiCredits              │
│    - Prevent negative credits                                │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│ 10. Return Result to User                                    │
│     - Success: Return generated content                      │
│     - Error: Return user-friendly error message              │
└─────────────────────────────────────────────────────────────┘
```

---

### 5. **Individual AI Tools**

#### A. **Post Writer** (`/api/ai/post-writer`)
**Purpose**: Generate engaging social media posts

**Input Parameters**:
- `topic` (required): The topic/subject of the post
- `tone` (optional): "professional" | "casual" | "friendly" | "formal" | "humorous"
- `length` (optional): "short" | "medium" | "long"

**Process**:
1. Build prompt: "Write a [tone] social media post about '[topic]'"
2. Call OpenAI GPT-4o-mini with appropriate maxTokens
3. Return generated post content

**Example**:
```json
Input: {
  "topic": "How to grow your audience",
  "tone": "professional",
  "length": "medium"
}

Output: {
  "success": true,
  "content": "Growing your audience requires consistency..."
}
```

---

#### B. **Title Generator** (`/api/ai/title`)
**Purpose**: Generate compelling, click-worthy titles

**Input Parameters**:
- `topic` (required): The topic to generate titles for
- `count` (optional): Number of titles (1-20, default: 5)

**Process**:
1. Build prompt: "Generate [count] compelling titles for '[topic]'"
2. Call OpenAI GPT-4o-mini
3. Parse titles (split by newlines, remove numbering)
4. Return array of titles

**Example**:
```json
Input: {
  "topic": "Social media marketing tips",
  "count": 5
}

Output: {
  "success": true,
  "titles": [
    "10 Social Media Marketing Tips That Actually Work",
    "The Ultimate Guide to Social Media Marketing",
    ...
  ]
}
```

---

#### C. **Content Ideas Generator** (`/api/ai/ideas`)
**Purpose**: Generate content ideas for a specific niche

**Input Parameters**:
- `niche` (required): The creator's niche/topic area
- `count` (optional): Number of ideas (1-30, default: 10)

**Process**:
1. Build prompt: "Generate [count] content ideas for '[niche]' niche"
2. Call OpenAI GPT-4o-mini
3. Parse ideas (split by newlines, remove numbering)
4. Return array of ideas

**Example**:
```json
Input: {
  "niche": "fitness and health",
  "count": 10
}

Output: {
  "success": true,
  "ideas": [
    "5-minute morning workout routine",
    "Healthy meal prep ideas for busy professionals",
    ...
  ]
}
```

---

#### D. **Thumbnail Generator** (`/api/ai/thumbnail`)
**Purpose**: Generate eye-catching thumbnails using DALL-E

**Input Parameters**:
- `prompt` (required): Description of the thumbnail to generate
- `watermarkText` (optional): Text to watermark on image

**Process**:
1. Enhance prompt: "Create professional thumbnail for: [prompt]"
2. Call OpenAI DALL-E API
3. Generate image (1024x1024)
4. Return image URL (watermark processing TODO)

**Example**:
```json
Input: {
  "prompt": "Fitness workout thumbnail with vibrant colors",
  "watermarkText": "MyChannel"
}

Output: {
  "success": true,
  "imageUrl": "https://oaidalleapiprodscus..."
}
```

---

### 6. **Security & Safety Features**

#### Input Sanitization:
- **Prompt Cleaning**: Removes control characters, normalizes whitespace
- **Length Limits**: 
  - Topic/Niche: Max 500 characters
  - Thumbnail prompt: Max 1000 characters
  - Watermark: Max 100 characters
- **Parameter Validation**: All enum values validated
- **Numeric Ranges**: All counts/limits validated

#### Error Handling:
- **Timeout Protection**: 30s for text, 60s for images
- **API Error Handling**: Specific messages for 429, 401, 500 errors
- **Graceful Degradation**: Logging failures don't break requests
- **Transaction Safety**: Credit operations are atomic

---

### 7. **Database Schema**

#### Relevant Models:

**User Model**:
```prisma
model User {
  aiCredits        Int      @default(0)
  subscriptionPlan String   @default("free")
  aiUsageHistory   AiUsageHistory[]
}
```

**AiUsageHistory Model**:
```prisma
model AiUsageHistory {
  id          String   @id @default(cuid())
  userId      String
  toolType    String   // "post-writer" | "title" | "ideas" | "thumbnail"
  creditsUsed Int      @default(0)
  input       Json     // User input parameters
  output      Json?    // Generated output
  success     Boolean
  errorMessage String?
  createdAt   DateTime @default(now())
  user        User     @relation(fields: [userId], references: [id])
}
```

---

### 8. **Admin Features**

#### Grant Credits (`/api/admin/ai/grant-credits`):
- **Access**: Admin only
- **Function**: Add credits to any user
- **Process**: Atomic transaction to increment credits
- **Use Case**: Support, promotions, compensation

---

### 9. **User Experience Flow**

#### For Free Users:
1. See AI Tools card in dashboard
2. Click "Upgrade to Unlock AI Tools"
3. Redirected to upgrade page
4. After upgrading to Pro → Access granted

#### For Pro Users:
1. See AI Tools card showing "Pro" badge
2. See remaining credits count
3. Click "Open AI Tools"
4. Select tool (Thumbnail, Post Writer, etc.)
5. Fill in form and submit
6. See loading state
7. Receive generated content
8. Credits decremented automatically

---

### 10. **Monitoring & Analytics**

#### Usage Tracking:
- All AI tool usage logged in `AiUsageHistory`
- Tracks: user, tool type, input, output, success/failure
- Can analyze: most used tools, success rates, error patterns

#### Credit Management:
- Track credit usage per user
- Monitor credit depletion
- Admin can grant additional credits

---

## Key Production Features

✅ **Database Resilience**: All queries use `executeWithReconnect`  
✅ **Atomic Operations**: Credit operations use transactions  
✅ **Input Validation**: All inputs validated and sanitized  
✅ **Timeout Protection**: API calls won't hang indefinitely  
✅ **Error Handling**: Graceful error handling throughout  
✅ **Security**: Prompt sanitization and input limits  
✅ **Rate Limiting**: Prevents abuse (20/hour)  
✅ **Logging**: Structured logging for all operations  

---

## Environment Variables Required

```env
OPENAI_API_KEY=sk-...  # OpenAI API key for GPT-4 and DALL-E
```

---

## Cost Considerations

- **OpenAI Costs**:
  - GPT-4o-mini: ~$0.15 per 1M input tokens, $0.60 per 1M output tokens
  - DALL-E 3: ~$0.04 per image (1024x1024)
- **Credit System**: Limits usage to control costs
- **Rate Limiting**: Prevents excessive API calls

---

## Future Enhancements

- [ ] Watermark processing for thumbnails
- [ ] Credit purchase system
- [ ] Usage analytics dashboard
- [ ] Custom AI model fine-tuning
- [ ] Batch generation options
- [ ] Template system for posts

