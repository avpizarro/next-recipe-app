import Link from 'next/link';
import '../styles/globals.css';

// import '@ionic/react/css/core.css';

function MyApp({ Component, pageProps })
{
  return (
    <>
      <nav className="header">
        <div>
          <Link className="home-link" href="/">
            <h1>Alejandra&apos;s kitchen</h1>
          </Link>
        </div>
          <h6 className="webpage-link">
            <Link className="webpage-link" href="/admin/sign-in">Admin</Link>
          </h6>
      </nav>
      <main>
        <Component {...pageProps} />
      </main>
    </>
  );
}

export default MyApp;
