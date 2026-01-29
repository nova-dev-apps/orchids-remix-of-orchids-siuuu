import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const PrivacyPolicy = () => {
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
          <h1 className="text-2xl font-semibold text-foreground mb-1">Privacy Policy for Nova</h1>
          <p className="text-muted-foreground text-sm mb-6">Effective Date: August 27, 2025</p>

          <div className="space-y-4 text-sm">
            <div>
              <h3 className="font-semibold mb-2">1. Data We Access</h3>
              <p>Nova AI accesses the following Google user data when permissions are granted:</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Gmail (reading and sending emails)</li>
                <li>Google Drive (reading and writing files)</li>
                <li>Google Calendar (viewing and creating events)</li>
                <li>Google Contacts / People API (reading contacts)</li>
                <li>Google Docs, Sheets, Slides (reading and editing documents)</li>
                <li>Google Tasks (viewing and managing tasks)</li>
                <li>Google Keep (reading and writing notes)</li>
                <li>User profile information (name, email, basic account info)</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">2. How We Use the Data</h3>
              <p>Nova AI uses Google user data only to perform user-requested AI automation tasks, including:</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Drafting and sending emails</li>
                <li>Organizing files in Google Drive</li>
                <li>Scheduling and managing calendar events</li>
                <li>Managing contacts</li>
                <li>Editing and creating documents</li>
                <li>Managing tasks and notes</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">3. Storage and Sharing</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>Data is processed temporarily to complete the requested automation tasks.</li>
                <li>Data is not sold or shared with third parties.</li>
                <li>Data is only stored if explicitly required to complete a user task.</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">4. AI / Automation Disclosure</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>Google user data is processed solely for user-initiated automation.</li>
                <li>User data is not used for AI model training.</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">5. Privacy by Design</h3>
              <p>
                Nova is built on the principle of Data Minimization. We believe
                that your desktop is your private space. Our architecture
                ensures that we only process the minimum information required
                to execute your requested automations.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">
                6. Confidential Processing (Not "E2EE")
              </h3>
              <p>
                While data is being analyzed by the AI brain, it is protected
                by Industry-Standard TLS Encryption in transit.
              </p>
              <div className="mt-2 space-y-2">
                <p>
                  <strong>Volatile Memory:</strong> Your screenshots are
                  processed in "volatile memory" (RAM) and are never written
                  to a permanent disk on our servers.
                </p>
                <p>
                  <strong>Instant Purge:</strong> Once a coordinate is
                  identified (e.g., "Click the Submit button"), the visual
                  data is instantly deleted from the processing stream.
                </p>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">7. Zero-Knowledge Intent</h3>
              <p>
                Nova operates on a Zero-Knowledge Architecture regarding your
                identity.
              </p>
              <div className="mt-2 space-y-2">
                <p>
                  <strong>Anonymized IDs:</strong> We do not link your PC
                  activities to your personal name or email. We use a
                  Randomized User ID to communicate with the AI brain.
                </p>
                <p>
                  <strong>No Training:</strong> We use professional-tier API
                  agreements that legally prohibit the AI models from using
                  your data to train future versions of the AI.
                </p>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">8. Local Sovereignty</h3>
              <p>
                Because Nova is a Local Agent (.exe), you retain 100% control:
              </p>
              <div className="mt-2 space-y-2">
                <p>
                  <strong>Local Execution:</strong> The actual "clicking" and
                  "typing" happen on your machine, not in the cloud.
                </p>
                <p>
                  <strong>The Kill-Switch:</strong> You can stop any
                  automation instantly using the "Stop" button or by closing
                  the local application.
                </p>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">9. No Data Monetization</h3>
              <p>
                We are a subscription-based service ($135/mo). You are the
                customer, not the product. We do not sell, rent, or share your
                data with advertisers or third-party data brokers.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Contact Us</h3>
              <p>
                If you have any questions about this Privacy Policy, please
                contact us at <strong>nova.platforms.ai@gmail.com</strong>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
