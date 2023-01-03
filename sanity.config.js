// sanity.config.js
import {defineConfig} from 'sanity'
import {deskTool} from 'sanity/desk'
import {schemaTypes} from './schemas/schema'

export default defineConfig({
  name: 'Create new project',
  title: 'Alejandra Kitchen',
  projectId: 'bn64ftjo',
  dataset: 'production',
  plugins: [
    deskTool(),
  ],
  schema: {
    types: schemaTypes,
  },
})