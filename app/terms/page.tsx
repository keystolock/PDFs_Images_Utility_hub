import Link from 'next/link';

export const metadata = {
  title: 'Terms of Service | Paperless',
  description: 'Terms of Service for using Paperless tools.',
};

export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-16 space-y-8">
      <Link href="/" className="text-blue-600 font-semibold hover:underline text-sm mb-4 inline-block">
        ← Back to Home
      </Link>
      <h1 className="text-4xl font-black text-black">Terms of Service</h1>
      <p className="text-slate-500 text-sm">Last updated: {new Date().toLocaleDateString()}</p>
      
      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6 text-slate-700 leading-relaxed">
        <section className="space-y-3">
          <h2 className="text-2xl font-bold text-black">1. Acceptance of Terms</h2>
          <p>
            By accessing and using Paperless, you accept and agree to be bound by the terms and provision of this agreement. 
            If you do not agree to abide by these terms, please do not use this service.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-bold text-black">2. Use of Tools</h2>
          <p>
            Our tools are provided "as is" and free of charge. While we strive for accuracy in file compression, conversion, 
            and modifications, we do not guarantee the output will be entirely error-free. It is your responsibility to verify 
            critical documents before official use.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-bold text-black">3. Limitation of Liability</h2>
          <p>
            Paperless and its creators shall not be held liable for any direct, indirect, incidental, or consequential damages 
            resulting from the use or inability to use our services, including data loss or file corruption.
          </p>
        </section>
      </div>
    </div>
  );
}