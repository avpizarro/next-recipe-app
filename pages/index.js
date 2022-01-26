import Head from 'next/head';
import Link from 'next/link';
import { sanityClient, urlFor } from "../lib/sanity";

const recipesQuery = `*[_type == "recipe"]{
  _id,
  name,
  slug,
  mainImage
}`;


export default function Home({ recipes }) {
  return (
    <div>
      <Head>
        <title>Alejandra's Kitchen</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <h1>Welcome to Alejandra's Kitchen</h1>
      <ul className="recipes-list">
        {recipes?.length > 0 && recipes.map((recipe) => (
        <li key={recipe._id} className="recipe-card">
          <Link href={`/recipes/${recipe.slug.current}`}>
          <a>
            <img src={urlFor(recipe.mainImage).url()} alt={recipe.name}/>
            <span>{recipe.name}</span>
          </a>
            </Link>
        </li>
            ))}
      </ul>

    </div>
  );
}

export async function getStaticProps() {
  const recipes = await sanityClient.fetch(recipesQuery)
  return { props: { recipes }, revalidate: 10 };
}
