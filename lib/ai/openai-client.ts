/**
 * OpenAI Client Wrapper
 * Handles AI generation requests
 */

const OPENAI_API_KEY = process.env.OPENAI_API_KEY

if (!OPENAI_API_KEY) {
  console.warn("OPENAI_API_KEY not set. AI features will not work.")
}

/**
 * Sanitize prompt to prevent injection attacks
 */
function sanitizePrompt(prompt: string): string {
  // Remove potential injection patterns
  // Limit length to prevent abuse
  const maxLength = 5000
  const sanitized = prompt
    .trim()
    .slice(0, maxLength)
    .replace(/[\x00-\x1F\x7F]/g, "") // Remove control characters
    .replace(/\s+/g, " ") // Normalize whitespace

  return sanitized
}

export async function generateWithOpenAI(
  prompt: string,
  options: {
    model?: string
    maxTokens?: number
    temperature?: number
    timeout?: number
  } = {}
): Promise<string> {
  if (!OPENAI_API_KEY) {
    throw new Error("OpenAI API key not configured")
  }

  // Validate and sanitize prompt
  if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
    throw new Error("Prompt is required and must be a non-empty string")
  }

  const sanitizedPrompt = sanitizePrompt(prompt)
  const { model = "gpt-4o-mini", maxTokens = 1000, temperature = 0.7, timeout = 30000 } = options

  // Validate options
  if (maxTokens < 1 || maxTokens > 4000) {
    throw new Error("maxTokens must be between 1 and 4000")
  }

  if (temperature < 0 || temperature > 2) {
    throw new Error("temperature must be between 0 and 2")
  }

  try {
    // Create AbortController for timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "user",
            content: sanitizedPrompt,
          },
        ],
        max_tokens: maxTokens,
        temperature: Math.max(0, Math.min(2, temperature)), // Clamp between 0 and 2
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: "Unknown error" } }))
      const errorMessage = error.error?.message || `HTTP ${response.status}: ${response.statusText}`
      
      // Handle specific error cases
      if (response.status === 429) {
        throw new Error("Rate limit exceeded. Please try again later.")
      }
      if (response.status === 401) {
        throw new Error("OpenAI API authentication failed")
      }
      if (response.status === 500) {
        throw new Error("OpenAI service temporarily unavailable")
      }
      
      throw new Error(errorMessage)
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content

    if (!content || typeof content !== "string") {
      throw new Error("Invalid response format from OpenAI API")
    }

    return content
  } catch (error: any) {
    if (error.name === "AbortError") {
      throw new Error("Request timeout. Please try again.")
    }
    console.error("OpenAI API error:", error)
    throw new Error(error.message || "Failed to generate content")
  }
}

export async function generateImageWithOpenAI(
  prompt: string,
  options: {
    size?: "256x256" | "512x512" | "1024x1024"
    n?: number
    timeout?: number
  } = {}
): Promise<string[]> {
  if (!OPENAI_API_KEY) {
    throw new Error("OpenAI API key not configured")
  }

  // Validate and sanitize prompt
  if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
    throw new Error("Prompt is required and must be a non-empty string")
  }

  const sanitizedPrompt = sanitizePrompt(prompt)
  const { size = "1024x1024", n = 1, timeout = 60000 } = options

  // Validate options
  if (n < 1 || n > 4) {
    throw new Error("n must be between 1 and 4")
  }

  const validSizes = ["256x256", "512x512", "1024x1024"]
  if (!validSizes.includes(size)) {
    throw new Error(`size must be one of: ${validSizes.join(", ")}`)
  }

  try {
    // Create AbortController for timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        prompt: sanitizedPrompt,
        n: Math.min(4, Math.max(1, n)), // Clamp between 1 and 4
        size,
        response_format: "url",
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: "Unknown error" } }))
      const errorMessage = error.error?.message || `HTTP ${response.status}: ${response.statusText}`
      
      // Handle specific error cases
      if (response.status === 429) {
        throw new Error("Rate limit exceeded. Please try again later.")
      }
      if (response.status === 401) {
        throw new Error("OpenAI API authentication failed")
      }
      if (response.status === 400) {
        throw new Error("Invalid prompt. Please try a different description.")
      }
      
      throw new Error(errorMessage)
    }

    const data = await response.json()
    
    if (!data.data || !Array.isArray(data.data)) {
      throw new Error("Invalid response format from OpenAI API")
    }

    const urls = data.data
      .map((item: any) => item?.url)
      .filter((url: any): url is string => typeof url === "string" && url.length > 0)

    if (urls.length === 0) {
      throw new Error("No images generated")
    }

    return urls
  } catch (error: any) {
    if (error.name === "AbortError") {
      throw new Error("Request timeout. Please try again.")
    }
    console.error("OpenAI Image API error:", error)
    throw new Error(error.message || "Failed to generate image")
  }
}

