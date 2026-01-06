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
        "Accept payments from fans across Africa with cards, bank transfers, and mobile money. Secure payouts, instant subscription updates, and platform fee included.",
    },
    {
      icon: "📊",
      title: "Real-Time Earnings Dashboard",
      description:
        "Watch your income grow in real-time. Track subscriptions, revenue, referral bonuses, and subscriber growth with detailed analytics.",
    },
    {
      icon: "🔒",
      title: "Secure & Reliable Payouts",
      description:
        "Bank-level security with encrypted transactions. Your earnings are safe and payouts are processed securely and on time.",
    },
    {
      icon: "🌍",
      title: "Global Reach, Local Payments",
      description:
        "Connect with supporters worldwide while accepting local payment methods. Reach a global audience and get paid in your preferred currency.",
    },
    {
      icon: "🎨",
      title: "Customizable Tiers & Pricing",
      description:
        "Create multiple subscription tiers with different benefits. Set your own prices, unlock exclusive content, and maximize your earnings per subscriber.",
    },
    {
      icon: "💬",
      title: "Build Your Community",
      description:
        "Engage with supporters through direct messages, exclusive posts, and community features. Grow your audience and increase retention.",
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

      {/* Referral Hook Section */}
      <section className="py-12 bg-gradient-to-r from-[#0d3b2e] to-[#1a1a1a] border-b border-[#f4c430]/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <div className="inline-flex items-center gap-2 bg-[#f4c430]/10 border border-[#f4c430]/30 rounded-full px-6 py-3 mb-4">
              <span className="text-2xl">🎁</span>
              <p className="text-white font-semibold text-lg">
                Share your page & earn bonuses for every fan you bring
              </p>
            </div>
            <p className="text-gray-300 text-sm max-w-2xl mx-auto mb-4">
              Get rewarded when your referrals subscribe. Build your audience and increase your earnings with our referral program.
            </p>
            <Link
              href="/signup"
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-[#f4c430] to-[#ffd700] text-[#1a1a1a] font-bold rounded-lg hover:shadow-lg transition-all duration-300 transform hover:scale-105"
            >
              Start Earning Today →
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Dashboard/Earnings Visual Section */}
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
              See Your Earnings Grow in Real-Time
            </h2>
            <p className="text-xl text-gray-600 font-light max-w-2xl mx-auto">
              Track subscriptions, revenue, and growth all in one place
            </p>
          </motion.div>

          {/* Dashboard Mockup */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-8 md:p-12 shadow-2xl border border-gray-200"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-xl p-6 shadow-lg">
                <div className="text-3xl font-bold text-[#0d3b2e] mb-2">KES 45,000</div>
                <div className="text-sm text-gray-600">Monthly Revenue</div>
                <div className="text-xs text-green-600 mt-2">↑ 23% from last month</div>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-lg">
                <div className="text-3xl font-bold text-[#0d3b2e] mb-2">127</div>
                <div className="text-sm text-gray-600">Active Subscribers</div>
                <div className="text-xs text-green-600 mt-2">↑ 12 new this week</div>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-lg">
                <div className="text-3xl font-bold text-[#0d3b2e] mb-2">KES 8,500</div>
                <div className="text-sm text-gray-600">Referral Bonuses</div>
                <div className="text-xs text-green-600 mt-2">From 15 referrals</div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Recent Activity</h3>
                <span className="text-xs text-gray-500">Last 7 days</span>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0d3b2e] to-[#f4c430] flex items-center justify-center text-white font-semibold text-sm">
                      JD
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">John Doe subscribed</div>
                      <div className="text-xs text-gray-500">Premium Tier</div>
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-green-600">+KES 2,000</div>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0d3b2e] to-[#f4c430] flex items-center justify-center text-white font-semibold text-sm">
                      SM
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">Sarah M. subscribed</div>
                      <div className="text-xs text-gray-500">Basic Tier</div>
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-green-600">+KES 500</div>
                </div>
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0d3b2e] to-[#f4c430] flex items-center justify-center text-white font-semibold text-sm">
                      AK
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">Alex K. subscribed</div>
                      <div className="text-xs text-gray-500">Premium Tier</div>
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-green-600">+KES 2,000</div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

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
              Everything You Need to Earn From Your Fans
            </h2>
            <p className="text-xl text-gray-600 font-light max-w-2xl mx-auto">
              Powerful tools and features designed to help you grow your audience and maximize your earnings
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
              Ready to Turn Your Talent Into Income?
            </h2>
            <p className="text-xl text-gray-300 font-light mb-8">
              Join hundreds of African creators earning from their passion. Start your journey today and get your first subscribers within days.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
              <Link
                href="/signup"
                className="px-10 py-5 bg-gradient-to-r from-[#f4c430] to-[#ffd700] text-[#1a1a1a] font-bold text-lg rounded-xl shadow-2xl hover:shadow-[#f4c430]/50 transition-all duration-300 transform hover:scale-105 border-2 border-transparent hover:border-[#ffd700]"
              >
                Start Earning Today
              </Link>
              <Link
                href="/discover"
                className="px-10 py-5 bg-white/10 backdrop-blur-sm text-white font-bold text-lg rounded-xl border-2 border-white/40 hover:bg-white/20 hover:border-white/60 transition-all duration-300 transform hover:scale-105"
              >
                Discover Creators
              </Link>
            </div>
            <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                <span>No setup fees</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                <span>Instant payouts</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                <span>24/7 support</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  )
}
