import { RouterProvider, createBrowserRouter } from 'react-router-dom'
import { Helmet, HelmetProvider } from 'react-helmet-async'

import Layout from './layout'
import { ThemeProvider } from './context/useTheme'
import { NodeSocketProvider } from './context/useNodeSocket'
import { SettingsProvider } from './context/useSettings'
import { OverlayProvider } from './context/useOverlay'
import { SupabaseProvider } from './hooks/useSupabase'

import Block from './pages/block'
import Blocks from './pages/blocks'
import Home from './pages/home'
import NotFound from './pages/notFound'
import TxPool from './pages/txPool'
import Transaction from './pages/transaction'
import DAG from './pages/dag'
import Stats from './pages/stats'
import StatsTable from './pages/stats/table'
import StatsChart from './pages/stats/chart'
import IndexedTransactions from './pages/indexed/transactions'
import IndexedBlocks from './pages/indexed/blocks'

const router = createBrowserRouter([
  {
    children: [
      {
        element: <Layout />,
        children: [
          {
            path: '/',
            element: <Home />,
          },
          {
            path: '/blocks',
            element: <Blocks />,
          },
          {
            path: '/block/:id',
            element: <Block />
          },
          {
            path: '/txpool',
            element: <TxPool />
          },
          {
            path: `/tx/:hash`,
            element: <Transaction />
          },
          {
            path: `/indexed`,
            children: [{
              path: `/indexed/blocks`,
              element: <IndexedBlocks />
            }, {
              path: `/indexed/txs`,
              element: <IndexedTransactions />
            }]
          },
          {
            path: `/stats`,
            element: <Stats />,
            children: [{
              index: true,
              element: <StatsTable />
            },
            {
              path: `/stats/chart`,
              element: <StatsChart />
            }]
          },
          {
            path: '*',
            element: <NotFound />
          }
        ]
      },
      {
        path: `/dag`,
        element: <DAG />
      }
    ]
  }
])

function App() {
  return <ThemeProvider>
    <HelmetProvider>
      <Helmet titleTemplate="%s · Xelis Explorer" />
      <SupabaseProvider>
        <SettingsProvider>
          <NodeSocketProvider>
            <OverlayProvider>
              <RouterProvider router={router} />
            </OverlayProvider>
          </NodeSocketProvider>
        </SettingsProvider>
      </SupabaseProvider>
    </HelmetProvider>
  </ThemeProvider>
}

export default App
