import Link from 'next/link';
import '../styles/globals.css';
import {PreviewSuspense} from 'next-sanity/preview'

function MyApp({ Component, pageProps })
{
  return (
    <>
      <PreviewSuspense fallback="loading...">
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
      </PreviewSuspense>
    </>
  );
}

export default MyApp;
