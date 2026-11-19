// sanity.config.js
import {defineConfig} from 'sanity'
import { structureTool } from 'sanity/structure'
import {schemaTypes} from './studio/schemas/schema'

export default defineConfig({
  name: 'default',
  title: 'Alejandra Kitchen',
  projectId: 'bn64ftjo',
  dataset: 'production',
  plugins: [
    structureTool(),
  ],
  schema: {
    types: schemaTypes,
  },
})