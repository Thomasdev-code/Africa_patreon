"use client"

import { motion } from "framer-motion"
import Hero from "@/components/Hero"
import FeatureCard from "@/components/FeatureCard"
import Footer from "@/components/Footer"
import TrendingCreators from "@/components/TrendingCreators"
import Link from "next/link"

export default function Home() {
  const features = [
    {
      icon: "💳",
      title: "Multiple Payment Options",
      description:
        "Accept payments via Stripe, Paystack, Flutterwave, and M-Pesa. Support fans from across Africa and the world.",
    },
    {
      icon: "📊",
      title: "Real-Time Analytics",
      description:
        "Track your earnings, subscriber growth, and content performance with detailed analytics dashboard.",
    },
    {
      icon: "🔒",
      title: "Secure & Reliable",
      description:
        "Bank-level security with encrypted transactions and fraud protection. Your data and payments are safe.",
    },
    {
      icon: "🌍",
      title: "Global Reach",
      description:
        "Connect with supporters worldwide. Accept payments in multiple currencies and reach a global audience.",
    },
    {
      icon: "🎨",
      title: "Customizable Tiers",
      description:
        "Create multiple subscription tiers with different benefits. Set your own prices and perks.",
    },
    {
      icon: "💬",
      title: "Direct Communication",
      description:
        "Engage with your supporters through direct messages, exclusive posts, and community features.",
    },
  ]

  const testimonials = [
    {
      name: "Sarah Kariuki",
      role: "Content Creator",
      quote:
        "Africa Patreon has transformed how I monetize my content. The multiple payment options mean my fans in Kenya can easily support me with M-Pesa!",
      avatar: "SK",
    },
    {
      name: "Tunde Adebayo",
      role: "Podcaster",
      quote:
        "The platform is intuitive and the analytics help me understand my audience better. I've grown my subscriber base by 300% in 6 months.",
      avatar: "TA",
    },
    {
      name: "Mariam Diallo",
      role: "Digital Artist",
      quote:
        "As an artist, having multiple payment gateways means I can reach supporters across Africa and beyond. The platform handles everything seamlessly.",
      avatar: "MD",
    },
  ]

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <Hero />

      {/* Trending Creators Section */}
      <TrendingCreators />

      {/* Top Creators Section */}
      <section className="py-20 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="flex flex-col md:flex-row md:items-end md:justify-between gap-6"
          >
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
                Discover Top African and Global Creators
              </h2>
              <p className="text-slate-200/80 max-w-2xl">
                Follow your favorite voices across art, music, tech, and culture.
                Be the first to know when they drop something new.
              </p>
            </div>
            <Link
              href="/discover"
              className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10 hover:border-white/40 transition-all duration-200 backdrop-blur-sm"
            >
              Explore all creators
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Why Creators Choose Africa Patreon
            </h2>
            <p className="text-xl text-gray-600 font-light max-w-2xl mx-auto">
              Everything you need to build and grow your creator business
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <FeatureCard
                key={index}
                icon={feature.icon}
                title={feature.title}
                description={feature.description}
                delay={index * 0.1}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              What Creators Say
            </h2>
            <p className="text-xl text-gray-600 font-light max-w-2xl mx-auto">
              Join thousands of creators building sustainable income streams
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-gray-50 rounded-2xl p-8 shadow-lg"
              >
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#0d3b2e] to-[#f4c430] flex items-center justify-center text-white font-semibold mr-4">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">
                      {testimonial.name}
                    </h4>
                    <p className="text-sm text-gray-600">{testimonial.role}</p>
                  </div>
                </div>
                <p className="text-gray-700 font-light italic">
                  "{testimonial.quote}"
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-[#0d3b2e] to-[#1a1a1a]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Ready to Start Your Creator Journey?
            </h2>
            <p className="text-xl text-gray-300 font-light mb-8">
              Join hundreds of African creators building sustainable income
              streams today.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/signup"
                className="px-8 py-4 bg-gradient-to-r from-[#f4c430] to-[#ffd700] text-[#1a1a1a] font-semibold rounded-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
              >
                Get Started Free
              </Link>
              <Link
                href="/discover"
                className="px-8 py-4 bg-white/10 backdrop-blur-sm text-white font-semibold rounded-xl border-2 border-white/20 hover:bg-white/20 transition-all duration-300"
              >
                Explore Creators
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  )
}
