import './server-only';
import { createClient } from 'next-sanity';

export function getWriteClient() {
  if (!process.env.SANITY_WRITE_TOKEN) throw new Error('SANITY_WRITE_TOKEN is required for recipe imports.');
  return createClient({ projectId: 'bn64ftjo', dataset: 'production', apiVersion: '2021-03-25',
    useCdn: false, token: process.env.SANITY_WRITE_TOKEN });
}
