import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const Terms = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="w-full max-w-4xl mx-auto px-4 py-8">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-nova-pink hover:text-nova-coral transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <div className="bg-card border border-border rounded-lg p-6 md:p-8 shadow-[var(--shadow-card)]">
          <h1 className="text-2xl font-semibold text-foreground mb-1">Terms and Conditions for Nova</h1>
          <p className="text-muted-foreground text-sm mb-6">Effective Date: August 27, 2025</p>

          <div className="space-y-4 text-sm">
            <p>Welcome to Nova. These Terms and Conditions govern your use of Nova's platform, services, and content. By using Nova, you agree to these Terms.</p>
            
            <div>
              <h3 className="font-semibold mb-1">1. Eligibility</h3>
              <p>You must be at least 18 years old to use Nova. By using Nova, you confirm that you meet this requirement.</p>
            </div>

            <div>
              <h3 className="font-semibold mb-1">2. Account Registration</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>You must provide accurate and complete information when creating a Nova account.</li>
                <li>You are responsible for maintaining the confidentiality of your login credentials.</li>
                <li>You are fully responsible for all activities under your account.</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-1">3. Subscriptions and Payments</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>Certain features of Nova require a paid subscription.</li>
                <li>Subscriptions renew automatically unless canceled before renewal.</li>
                <li>By subscribing, you authorize Nova to charge your payment method.</li>
                <li>If a payment fails, access to Nova may be suspended or terminated.</li>
                <li>Payments are non-refundable.</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-1">4. License of Use</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>Nova grants you a limited, non-transferable license to use the platform.</li>
                <li>You may not copy, modify, distribute, or reverse-engineer Nova.</li>
                <li>You may not use Nova for unlawful or harmful purposes.</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-1">5. User Content</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>You retain ownership of content you upload to Nova.</li>
                <li>You are responsible for ensuring your content complies with laws and does not infringe rights.</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-1">6. Prohibited Conduct</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>You may not attempt to disrupt or damage Nova's systems.</li>
                <li>You may not impersonate others or misrepresent your affiliation.</li>
                <li>You may not use Nova to distribute harmful, illegal, or abusive material.</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-1">7. Intellectual Property</h3>
              <p>All rights in Nova's software, design, and brand remain with Nova.</p>
            </div>

            <div>
              <h3 className="font-semibold mb-1">8. Limitation of Liability</h3>
              <p>Nova is provided "as is." We are not responsible for any actions taken by the AI on your device, including data loss or software issues. You agree to supervise the agent and use the "Stop" button if necessary. Our total liability is limited to the amount you paid for your current subscription month ($135).</p>
            </div>

            <div className="pt-4 border-t">
              <p>For more information contact (nova.platforms.ai@gmail.com)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Terms;
