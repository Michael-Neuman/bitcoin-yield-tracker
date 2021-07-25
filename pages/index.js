import Head from 'next/head'
import styles from '../styles/Home.module.css'
import { getOpportunities } from '../lib/opportunities'
import useSWR from 'swr'

const fetcher = (...args) => fetch(...args).then(res => res.json())
var jp = require('jsonpath')

export async function getStaticProps() {
    const allOpportunities = getOpportunities()
    return {
        props: {
            allOpportunities
        }
    }
}

export default function Home({ allOpportunities }) {
  return (
    <div className={styles.container}>
      <Head>
        <title>Bitcoin Yield Tracker</title>
        <meta name="description" content="Tracks DeFi and CeFi Bitcoin yield opportunities." />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <h1 className={styles.title}>
          Bitcoin Yield Tracker
        </h1>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Category</th>
              <th>Rate</th>
            </tr>
          </thead>
          <tbody>
          {allOpportunities.map((opp) => (
            <tr key={opp.id}>
              <td><a href={opp.link}>{opp.name}</a></td>
              <td>{opp.category}</td>
              <td><Rate opp={opp}/></td>
            </tr>
          ))}
          </tbody>
        </table>
      </main>
      <div className={styles.footer}>
          <a href="https://github.com/Michael-Neuman/bitcoin-yield-tracker">Provide feedback or contribute</a>
      </div>
    </div>
  )
}

export function Rate(props) {
    const endpoint = (typeof props.opp.api !== 'undefined' ? props.opp.api : '/api/yield/' + props.opp.id)
    const { data, error } = useSWR(endpoint, fetcher)

    // Parse the rate data from response.
    if (!error && typeof data !== 'undefined') {
        if (typeof props.opp.json_path_rate !== 'undefined') {
            return Math.round(jp.query(data, props.opp.json_path_rate) * 10000) / 100 + '%'
        }
    }

    return ''
}