// import GraphQLClient from './gql-client'
import _get from 'lodash.get'

async function fetchProducts(cursor = '', productsPerPage = 250) {
    const cursorString = cursor ? `after: "${cursor}"` : ''
    const query = `{
    collections(first: 250) {
      edges {
        node {
          id
          title
          handle
          descriptionHtml
          products(first: 250) {
            edges {
              node {
                id
              }
            }
          }
        }
      }
    }
    products(first: 250) {
      edges {
        node {
          title
          id
          vendor
          options(first: 250) {
            name
            values
          }
          variants(first: 250) {
            edges {
              node {
                id
                title
                price {
                  amount
                }
              }
            }
            pageInfo {
              hasNextPage
            }
          }
        }
        cursor
      }
      pageInfo {
        hasNextPage
      }
    }
}
`

    const res = await fetch(`https://${wshopVars.domain}/api/2022-10/graphql.json`, {
        method: 'POST',
        headers: new Headers({
            'Content-Type': 'application/graphql',
            'X-Shopify-Storefront-Access-Token': wshopVars.apiKey
        }),
        body: query
    })
        .then(res => {
            if (!res.ok) {
                throw Error(response.statusText)
            }
            return res.json()
        })
        .catch(e => console.error(e))

    return res
}

export default async function(evt) {
    let hasNextPage = true
    let products = []
    let collections = []
    let cursor = ''
    let i = 0

    while (hasNextPage) {
        const res = await fetchProducts(cursor)

        let edges = _get(res, 'data.products.edges', [])

        // get next round of product results
        products = products.concat(edges.map(n => n.node))

        // this will only get the first 250 collections, which seems like a safe bet!
        if (collections.length == 0) {
            const collectionEdges = _get(res, 'data.collections.edges', [])
            collections = collectionEdges.map(e => e.node)
        }

        hasNextPage = _get(
            res,
            'data.products.pageInfo.hasNextPage',
            false
        )

        cursor = edges.length ? edges[edges.length - 1].cursor : ''
    }

    return { products, collections }
}
