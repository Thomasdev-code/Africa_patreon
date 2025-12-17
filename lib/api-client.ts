/**
 * API client utility with better error handling
 */

export async function apiFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  })

  // Check if response is HTML (error page) instead of JSON
  const contentType = response.headers.get("content-type")
  if (contentType && !contentType.includes("application/json")) {
    const text = await response.text()
    console.error("API returned non-JSON response:", {
      url,
      status: response.status,
      contentType,
      preview: text.substring(0, 200),
    })
    throw new Error(
      `API returned ${contentType} instead of JSON. Status: ${response.status}`
    )
  }

  return response
}

export async function apiJson<T = any>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await apiFetch(url, options)
  return response.json()
}

