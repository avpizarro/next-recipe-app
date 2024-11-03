import Link from 'next/link';
import '../styles/globals.css';
import { PreviewProvider } from '../lib/sanity.js';

// import '@ionic/react/css/core.css';

function MyApp({ Component, pageProps })
{
  const { preview } = pageProps;
  
  return (
    <>
      <PreviewProvider token={preview?.token}>
        <nav className="header">
          <div>
            <Link href="/">
              <h1>Alejandra's kitchen</h1>
            </Link>
          </div>
        </nav>
        <main>
          <Component {...pageProps} />
        </main>
      </PreviewProvider>
    </>
  );
}

export default MyApp;
