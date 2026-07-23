import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy | Utility Hub',
  description: 'Learn about how we protect your data with 100% client-side processing.',
};

export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-16 space-y-8">
      <Link href="/" className="text-blue-600 font-semibold hover:underline text-sm mb-4 inline-block">
        ← Back to Home
      </Link>
      <h1 className="text-4xl font-black text-black">Privacy Policy</h1>
      <p className="text-slate-500 text-sm">Last updated: {new Date().toLocaleDateString()}</p>
      
      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6 text-slate-700 leading-relaxed">
        <section className="space-y-3">
          <h2 className="text-2xl font-bold text-black">1. 100% Client-Side Processing</h2>
          <p>
            At UtilityHub, your privacy is our absolute priority. Unlike traditional file conversion websites, 
            <strong> we do not upload your files to our servers.</strong> All processing (compressing, converting, cropping) 
            happens locally directly within your web browser using client-side JavaScript.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-bold text-black">2. Data Collection</h2>
          <p>
            Because everything processes on your device, we do not store, view, or analyze your documents, images, or PDFs. 
            Your files never leave your computer or mobile device.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-bold text-black">3. Analytics & Cookies</h2>
          <p>
            We may use basic analytics (such as Google Analytics) to understand website traffic and improve our tools. 
            This data is anonymized and does not contain personal information or file data.
          </p>
        </section>
      </div>
    </div>
  );
}