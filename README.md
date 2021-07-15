This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

[![Edit bitcoin-yield-tracker](https://codesandbox.io/static/img/play-codesandbox.svg)](https://codesandbox.io/s/github/Michael-Neuman/bitcoin-yield-tracker/tree/main/?fontsize=14&hidenavigation=1&theme=dark)

## Getting Started

First, install dependencies:

```bash
npm install
```

Then, run the development server:

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

To add additional yield opportunities, add a file to the `opportunities` directory following the format below:
```
---
name: 'Description of yield opportunity.  Could include information like network, application and token.'
api: 'URL of API endpoint that provides interest rate available from yield opportunity.'
link: 'URL that provides more details of yield opportunity.'
category: 'Categorization of opportunity used to filter results.  Examples: DeFi, CeFi'
json_path_rate: 'JSON path of API response that contains the interest rate.  See https://github.com/dchester/jsonpath for usage.'
---
```