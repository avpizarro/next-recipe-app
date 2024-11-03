import
{
  createClient,
} from "next-sanity";

import { PortableText as PortableTextComponent } from '@portabletext/react';

import { LiveQueryProvider } from 'next-sanity/preview';

import { useMemo } from 'react';

import createImageUrlBuilder from '@sanity/image-url';

const config = {
  projectId: "bn64ftjo",
  dataset: "production",
  apiVersion: "2021-03-25",
  token: process.env.SANITY_WRITE_TOKEN,
  useCdn: true,
};

export const sanityClient = createClient(config);

export const urlFor = (source) => createImageUrlBuilder(config).image(source);

export const PreviewProvider = ({ children, token }) =>
{
  const client = useMemo(() => createClient({ ...config, token }), [token]);
  return <LiveQueryProvider client={client}>{children}</LiveQueryProvider>;
}
export const PortableText = (props) => <PortableTextComponent value={props.value} />

