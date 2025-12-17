/**
 * Example test for signup API
 * Run with: npm test
 */

import { describe, it, expect } from "@jest/globals"

describe("Signup API", () => {
  it("should reject admin role at signup", async () => {
    const response = await fetch("http://localhost:3000/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "test@example.com",
        password: "password123",
        role: "admin",
      }),
    })

    const data = await response.json()
    expect(response.status).toBe(400)
    expect(data.error).toContain("Invalid role")
  })

  it("should accept fan role at signup", async () => {
    const email = `fan${Date.now()}@example.com`
    const response = await fetch("http://localhost:3000/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password: "password123",
        role: "fan",
      }),
    })

    expect(response.status).toBe(201)
    const data = await response.json()
    expect(data.role).toBe("fan")
  })

  it("should accept creator role at signup", async () => {
    const email = `creator${Date.now()}@example.com`
    const response = await fetch("http://localhost:3000/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password: "password123",
        role: "creator",
      }),
    })

    expect(response.status).toBe(201)
    const data = await response.json()
    expect(data.role).toBe("creator")
  })
})

