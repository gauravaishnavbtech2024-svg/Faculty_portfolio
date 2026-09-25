import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Faculty Portfolio Portal',
  description: 'Easily convert faculty CVs into accessible, structured web portfolios.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                // Suppress browser-extension attribute mutations (e.g. Bitdefender bis_skin_checked)
                if (typeof window !== 'undefined') {
                  const cleanup = function() {
                    const elements = document.querySelectorAll('[bis_skin_checked], [bis_register]');
                    for (let i = 0; i < elements.length; i++) {
                      elements[i].removeAttribute('bis_skin_checked');
                      elements[i].removeAttribute('bis_register');
                    }
                  };
                  cleanup();
                  const observer = new MutationObserver(function(mutations) {
                    for (let i = 0; i < mutations.length; i++) {
                      const m = mutations[i];
                      if (m.type === 'attributes' && m.attributeName && m.attributeName.startsWith('bis_')) {
                        m.target.removeAttribute(m.attributeName);
                      }
                    }
                  });
                  observer.observe(document.documentElement, {
                    attributes: true,
                    subtree: true,
                    attributeFilter: ['bis_skin_checked', 'bis_register']
                  });
                }
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-white text-slate-900 antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
