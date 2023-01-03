import
    {
        createClient,
    } from "next-sanity";

import { PortableText as PortableTextComponent } from '@portabletext/react';

import { definePreview } from 'next-sanity/preview';

import createImageUrlBuilder from '@sanity/image-url';

const config = {
    projectId: "bn64ftjo",
    dataset: "production",
    apiVersion: "2021-03-25",
    token: process.env.SANITY_WRITE_TOKEN,
    usedCdn: true,
};

export const sanityClient = createClient(config);

export const usePreview = definePreview(config);

export const urlFor = (source) => createImageUrlBuilder(config).image(source);

// export const PortableText = PortableTextComponent(
//     {
//    ...config,
//    serializers: {},
// });

export const PortableText = (props) => <PortableTextComponent value={props.value} />

