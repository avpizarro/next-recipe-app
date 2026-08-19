import
{
  createClient,
} from "next-sanity";

import { PortableText as PortableTextComponent } from '@portabletext/react';

import { createImageUrlBuilder } from '@sanity/image-url';

const config = {
  projectId: "bn64ftjo",
  dataset: "production",
  apiVersion: "2021-03-25",
  useCdn: true,
};

export const sanityClient = createClient(config);

export const urlFor = (source) => createImageUrlBuilder(config).image(source);
export const PortableText = (props) => <PortableTextComponent value={props.value} />
