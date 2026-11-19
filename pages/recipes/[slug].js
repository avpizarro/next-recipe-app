import { useState } from 'react';
import { useRouter } from 'next/router';
// import { IonButton } from '@ionic/react';

import
{
  sanityClient,
  urlFor,
} from '../../lib/sanity';
import React from 'react';

import { PortableText } from '@portabletext/react';

const recipeQuery = `*[_type == "recipe" && status == "published" && slug.current == $slug][0]{
    _id,
    name,
    slug,
    url,
    mainImage,
    ingredientGroups[]{
      _key, title,
      ingredients[]{ _key, rawText, wholeNumber, fraction, unit, "name": ingredient->name }
    },
    ingredient[]{
      _key,
      rawText,
      wholeNumber,
      fraction,
      unit,
      "name": ingredient->name
    },
    instructions,
    likes
}`;

function ingredientLabel(item) {
  // Imports retain the original line, including units the simple parser cannot
  // represent. Studio-created entries instead use their referenced name.
  if (item.rawText?.trim()) return item.rawText.trim();
  if (!item.name) return '';
  const quantity = [item.wholeNumber || '', item.fraction].filter(Boolean).join(' ');
  return [quantity, item.unit, item.name].filter(Boolean).join(' ');
}

export default function OneRecipe({ data })
{

  const router = useRouter()

  if (router.isFallback)
  {
    return <div>Loading...</div>

  }

  // New recipes store groups; old flat records remain an untitled group.
  const groups = (data?.recipe?.ingredientGroups?.length ? data.recipe.ingredientGroups
    : [{ title: null, ingredients: data?.recipe?.ingredient || [] }])
    .filter(Boolean).map((group) => ({ ...group,
      ingredients: (group.ingredients || []).filter(Boolean)
        .map((item) => ({ key: item._key, label: ingredientLabel(item) })).filter((item) => item.label),
    })).filter((group) => group.ingredients.length);


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

            {groups.length > 0 && <section aria-labelledby="ingredients-heading">
              <h2 id="ingredients-heading">Ingredients</h2>
              {groups.map((group, index) => <div key={group._key || index}>
                {group.title && <h3>{group.title}</h3>}
                <ul>{group.ingredients.map((item, itemIndex) => <li key={item.key || itemIndex}>{item.label}</li>)}</ul>
              </div>)}
            </section>}

            {/* Older recipes already contain headings and ingredient lists in
                Portable Text. Keep that content intact until it is migrated. */}
            {groups.length > 0 && <h2>Instructions</h2>}

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
    `*[_type == "recipe" && status == "published" && defined(slug.current)]{
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
  if (!recipe) return { notFound: true, revalidate: 10 };
  return { props: { data: { recipe } }, revalidate: 10 };
}
