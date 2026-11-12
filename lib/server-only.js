// Pages Router API routes do not use React Server Component import conditions.
// Fail immediately if a component accidentally imports server auth modules.
if (typeof window !== 'undefined') {
  throw new Error('Server authentication modules must not be imported in the browser.');
}
