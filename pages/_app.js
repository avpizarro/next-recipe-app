import Link from 'next/link';
import '../styles/globals.css';

// import '@ionic/react/css/core.css';

function MyApp({ Component, pageProps })
{
  return (
    <>
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
    </>
  );
}

export default MyApp;
