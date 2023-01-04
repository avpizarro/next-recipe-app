import { useState } from 'react';
import { useRouter } from 'next/router';
// import { IonButton } from '@ionic/react';

import
{
  sanityClient,
  urlFor,
  PortableText,
} from '../../lib/sanity';
import React from 'react';

const recipeQuery = `*[_type == "recipe" && slug.current == $slug][0]{
    _id,
    name,
    slug,
    url,
    mainImage,
    instructions,
    likes
}`;

export default function OneRecipe({ data })
{

  const router = useRouter()

  if (router.isFallback)
  {
    return <div>Loading...</div>

  }

  return (

    <article className="recipe">

      <h1>{data?.recipe?.name}</h1>

      <h6 className="webpage-link">

        <a className="webpage-link" href={data?.recipe?.url}>Link here</a>

      </h6>

      <main className="content">

        <img src={urlFor(data?.recipe?.mainImage).width(1000).url()} alt={data?.recipe?.name} />

        <div className="breakdown">

          <div className="ingredients">

            <PortableText
              value={data?.recipe?.instructions}
            />

          </div>

        </div>

      </main>

      {/* <IonDatetime displayFormat="MM/DD/YYYY" placeholder="Select Date"></IonDatetime> */}
      {/* <IonButton fill="clear">Start</IonButton> */}

    </article>

  );
}

export async function getStaticPaths()
{
  const paths = await sanityClient.fetch(
    `*[_type == "recipe" && defined(slug.current)]{
            "params": {
                "slug": slug.current
            }
        }`
  );
  return {
    paths,
    fallback: true,
  };
}

export async function getStaticProps({ params })
{
  const { slug } = params;
  const recipe = await sanityClient.fetch(recipeQuery, { slug });
  return { props: { data: { recipe }, preview: true, revalidate: 10 } };
}
