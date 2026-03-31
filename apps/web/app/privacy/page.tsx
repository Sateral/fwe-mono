import { Metadata } from "next";
import Container from "@/components/container";

export const metadata: Metadata = {
  title: "Privacy Policy | Free Will Eats",
  description: "Privacy Policy for Free Will Eats meal prep service.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="bg-background min-h-screen py-12 sm:py-16">
      <Container>
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-8">
            Privacy Policy
          </h1>

          <p className="text-gray-600 mb-8">Last updated: March 31, 2026</p>

          <div className="prose prose-gray max-w-none space-y-8">
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                1. Introduction
              </h2>
              <p className="text-gray-600 leading-relaxed">
                Free Will Eats (&quot;we,&quot; &quot;our,&quot; or
                &quot;us&quot;) is committed to protecting your privacy. This
                Privacy Policy explains how we collect, use, and safeguard your
                information when you use our website and meal prep ordering
                services.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                2. Information We Collect
              </h2>

              <h3 className="text-lg font-medium text-gray-800 mt-6 mb-3">
                Account Information
              </h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                When you create an account, we collect:
              </p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2">
                <li>Your name</li>
                <li>Email address</li>
                <li>
                  Password (stored securely using industry-standard hashing)
                </li>
              </ul>

              <h3 className="text-lg font-medium text-gray-800 mt-6 mb-3">
                Profile and Delivery Information
              </h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                To fulfill your orders, you may optionally provide:
              </p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2">
                <li>Phone number (for delivery updates)</li>
                <li>Delivery address (street, city, postal code)</li>
                <li>
                  Delivery notes (e.g., buzzer codes or special instructions)
                </li>
              </ul>

              <h3 className="text-lg font-medium text-gray-800 mt-6 mb-3">
                Dietary Preferences
              </h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                To personalize your experience, you may optionally share:
              </p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2">
                <li>Dietary goals (e.g., fat loss, muscle gain)</li>
                <li>Food restrictions, allergies, or dislikes</li>
                <li>Meal preferences</li>
              </ul>

              <h3 className="text-lg font-medium text-gray-800 mt-6 mb-3">
                Order Information
              </h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                When you place an order, we collect:
              </p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2">
                <li>Meal selections and quantities</li>
                <li>Ingredient substitutions and modifications</li>
                <li>Special requests or notes</li>
                <li>Delivery or pickup preference</li>
                <li>Order history</li>
              </ul>

              <h3 className="text-lg font-medium text-gray-800 mt-6 mb-3">
                Guest Checkout
              </h3>
              <p className="text-gray-600 leading-relaxed">
                If you check out as a guest without creating an account, we
                collect your name, email address, and delivery preference to
                process your order.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                3. Information We Do Not Collect
              </h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                We want to be clear about what we don&apos;t collect:
              </p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2">
                <li>
                  <strong>Credit card numbers</strong> - Payment information is
                  handled directly by Stripe, our payment processor. We never
                  see or store your full card details.
                </li>
                <li>
                  <strong>Location data</strong> - We do not track your GPS or
                  precise location.
                </li>
                <li>
                  <strong>Browsing behavior analytics</strong> - We do not use
                  third-party analytics or tracking tools.
                </li>
                <li>
                  <strong>Third-party tracking cookies</strong> - We do not use
                  advertising cookies or share data with ad networks.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                4. How We Use Your Information
              </h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                We use the information we collect to:
              </p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2">
                <li>Process and fulfill your meal prep orders</li>
                <li>Communicate with you about your orders</li>
                <li>Manage your account and preferences</li>
                <li>
                  Personalize meal recommendations based on your dietary
                  preferences
                </li>
                <li>Improve our services and menu offerings</li>
                <li>Prevent fraud and ensure secure transactions</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                5. Cookies We Use
              </h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                We use a limited number of essential cookies to provide our
                services:
              </p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2">
                <li>
                  <strong>Shopping cart cookies</strong> - To remember items in
                  your cart (expires after 14 days)
                </li>
                <li>
                  <strong>Authentication cookies</strong> - To keep you signed
                  in to your account
                </li>
                <li>
                  <strong>Guest checkout cookies</strong> - To remember your
                  details during guest checkout (expires after 14 days)
                </li>
              </ul>
              <p className="text-gray-600 leading-relaxed mt-4">
                All our cookies are first-party, HttpOnly, and secure. We do not
                use any third-party or advertising cookies.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                6. Information Sharing
              </h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                We share your information only with the following third party:
              </p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2">
                <li>
                  <strong>Stripe</strong> - Our payment processor receives your
                  email, name, and order total to process payments securely.
                  Stripe&apos;s privacy policy can be found at{" "}
                  <a
                    href="https://stripe.com/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    stripe.com/privacy
                  </a>
                  .
                </li>
              </ul>
              <p className="text-gray-600 leading-relaxed mt-4">
                We do not sell, rent, or trade your personal information to any
                other third parties.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                7. Data Security
              </h2>
              <p className="text-gray-600 leading-relaxed">
                We implement appropriate security measures to protect your
                personal information, including encrypted connections (HTTPS),
                secure cookie handling, and rate limiting on sensitive
                operations. Passwords are hashed using industry-standard
                algorithms and are never stored in plain text.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                8. Data Retention
              </h2>
              <p className="text-gray-600 leading-relaxed">
                We retain your account information and order history for as long
                as your account is active or as needed to provide you services.
                If you wish to delete your account, please contact us and we
                will remove your personal information from our systems, except
                where retention is required for legal or legitimate business
                purposes (such as maintaining financial records).
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                9. Your Rights
              </h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                You have the right to:
              </p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2">
                <li>Access the personal information we hold about you</li>
                <li>Correct inaccurate information in your profile</li>
                <li>Request deletion of your account and personal data</li>
                <li>Withdraw consent for optional data collection</li>
              </ul>
              <p className="text-gray-600 leading-relaxed mt-4">
                To exercise these rights, please contact us using the
                information below.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                10. Changes to This Policy
              </h2>
              <p className="text-gray-600 leading-relaxed">
                We may update this Privacy Policy from time to time. We will
                notify you of any significant changes by posting the new policy
                on this page and updating the &quot;Last updated&quot; date.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                11. Contact Us
              </h2>
              <p className="text-gray-600 leading-relaxed">
                If you have any questions about this Privacy Policy or our data
                practices, please contact us at:{" "}
                <a
                  href="https://www.instagram.com/freewilleats/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  @freewilleats on Instagram
                </a>
              </p>
            </section>
          </div>
        </div>
      </Container>
    </div>
  );
}
