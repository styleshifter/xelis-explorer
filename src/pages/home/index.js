import Button from '../../components/button'
import { Link, useNavigate } from 'react-router-dom'
import useNodeSocket, { useNodeSocketSubscribe } from '../../context/useNodeSocket'
import { useCallback, useEffect, useMemo, useState } from 'react'
import useNodeRPC from '../../hooks/useNodeRPC'
import bytes from 'bytes'
import Age from '../../components/age'
import { formatHashRate, formatXelis, groupBy, reduceText } from '../../utils'
import { Helmet } from 'react-helmet-async'
import to from 'await-to-js'
import Chart from '../../components/chart'
import useSupabase from '../../hooks/useSupabase'

function ExplorerSearch() {
  const navigate = useNavigate()

  const search = useCallback((e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    const searchValue = formData.get(`search`)
    if (searchValue === ``) return

    if (searchValue.length === 64) {
      return navigate(`/tx/${searchValue}`)
    }

    const height = parseInt(searchValue)
    if (!isNaN(height)) {
      return navigate(`/block/${height}`)
    }
  }, [])

  return <form onSubmit={search}>
    <div className="explorer-search">
      <div className="explorer-search-title">Xelis Explorer</div>
      <div className="explorer-search-form">
        <input type="text" name="search" placeholder="Search block, transaction or address"
          autoComplete="off" autoCapitalize="off" />
        <Button type="submit" icon="search" iconLocation="right" iconProps={{ style: { rotate: `90deg` } }}>
          Search
        </Button>
      </div>
    </div>
  </form>
}

function RecentBlocks() {
  const nodeRPC = useNodeRPC()

  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState()
  const [blocks, setBlocks] = useState([])
  const [animateBlocks, setAnimateBlocks] = useState(false) // make sure to not animate on pageload and only when we get a new block

  const loadRecentBlocks = useCallback(async () => {
    setLoading(true)

    const resErr = (err) => {
      setLoading(false)
      setErr(err)
    }

    const [err1, topoheight] = await to(nodeRPC.getTopoHeight())
    if (err1) return resErr(err1)

    const [err2, blocks] = await to(nodeRPC.getBlocks(topoheight - 10, topoheight))
    if (err2) return resErr(err2)
    setLoading(false)

    setBlocks(blocks.reverse())
  }, [])

  useEffect(() => {
    loadRecentBlocks()
  }, [loadRecentBlocks])

  useNodeSocketSubscribe({
    event: `NewBlock`,
    onData: (newBlock) => {
      setBlocks((blocks) => {
        if (blocks.findIndex(block => block.hash === newBlock.hash) !== -1) return blocks
        return [newBlock, ...blocks]
      })
      setAnimateBlocks(true)
    }
  }, [])

  useNodeSocketSubscribe({
    event: `BlockOrdered`,
    onData: (data) => {
      const { topoheight, block_hash } = data
      setBlocks((blocks) => blocks.map(block => {
        if (block.hash === block_hash) block.topoheight = topoheight
        return block
      }))
    }
  }, [])

  /*
  const blocks = useMemo(() => {
    const blocks = [...newBlocks, ...lastBlocks]
    // TEMP FIX - remove duplicate blocks (blockDAG can have block at same height)
    return blocks.filter((item, index, self) => {
      return index === self.findIndex(o => {
        return o.height === item.height
      })
    })
  }, [newBlocks, lastBlocks])*/

  useEffect(() => {
    if (blocks.length >= 10) {
      blocks.pop()
      setBlocks(blocks)
    }
  }, [blocks])

  if (loading || err) return null

  return <div className="recent-blocks">
    <div className="recent-blocks-title">Recent Blocks</div>
    {/*<div className="recent-blocks-items">
      {blocks.map((item, index) => {
        const txCount = item.txs_hashes.length
        const size = bytes.format(item.total_size_in_bytes || 0)
        const stableHeight = blocks[0].height - 8
        const statusClassName = item.height <= stableHeight ? `stable` : `mined`
        const key = index + Math.random() // random key to force re-render and repeat animation

        return <Link to={`/block/${item.height}`} key={key} className={`recent-blocks-item`}>
          <div className={`recent-blocks-item-status ${statusClassName}`} />
          <div className="recent-blocks-item-title">Block {item.height}</div>
          <div className="recent-blocks-item-value">{txCount} txs | {size}</div>
          <div className="recent-blocks-item-time">
            <Age timestamp={item.timestamp} update format={{ secondsDecimalDigits: 0 }} />
          </div>
          <div>{item.topoheight}</div>
        </Link>
      })}
    </div>*/}

    <div className="recent-blocks-items">
      {[...groupBy(blocks, (b) => b.height).entries()].map((entry, index) => {
        const [height, groupBlocks] = entry
        const key = index + Math.random() // random key to force re-render and repeat animation


        return <div className={`recent-blocks-group ${animateBlocks ? `animate` : ``}`} key={key}>
          <div className="recent-blocks-group-items">
            {groupBlocks.map((block) => {
              const txCount = block.txs_hashes.length
              const size = bytes.format(block.total_size_in_bytes || 0)

              let statusClassName = `mined`
              switch (block.block_type) {
                case 'Sync':
                case 'Side':
                  statusClassName = `stable`
              }

              return <Link to={`/block/${block.hash}`} key={block.hash} className={`recent-blocks-item`}>
                <div className={`recent-blocks-item-status ${statusClassName}`} />
                <div className="recent-blocks-item-title">Block {block.topoheight}</div>
                <div className="recent-blocks-item-value">{txCount} txs | {size}</div>
                <div className="recent-blocks-item-miner">{reduceText(block.miner)}</div>
                <div className="recent-blocks-item-time">
                  <Age timestamp={block.timestamp} update format={{ secondsDecimalDigits: 0 }} />
                </div>
              </Link>
            })}
          </div>
          <div className="recent-blocks-group-title">
            Height {height}
          </div>
        </div>
      })}
    </div>
  </div>
}

function HomeMiniChart(props) {
  const { data } = props

  const chartConfig = useMemo(() => {
    return {
      type: 'line',
      data,
      options: {
        maintainAspectRatio: false,
        elements: {
          point: {
            radius: 0
          }
        },
        plugins: {
          legend: {
            display: false
          },
        },
        scales: {
          y: {
            display: false,
            beginAtZero: false
          },
          x: {
            display: false
          }
        }
      }
    }
  }, [data])

  return <Chart config={chartConfig} className="home-stats-chart" />
}

function Stats() {
  const nodeSocket = useNodeSocket()

  const [info, setInfo] = useState({})
  const [err, setErr] = useState()

  const supabase = useSupabase()
  const [loading, setLoading] = useState(true)
  const [list, setList] = useState([])

  const loadStats = useCallback(async () => {
    setLoading(true)
    const query = supabase
      .rpc(`get_stats`, { interval: `hour` })
      .order(`time`, { ascending: false })

    const { error, data } = await query.range(0, 10)
    setLoading(false)
    if (error) return setErr(error)
    setList(data.reverse())
  }, [supabase])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  const loadInfo = useCallback(async () => {
    const [err, info] = await to(nodeSocket.sendMethod(`get_info`))
    if (err) return setErr(err)
    setInfo(info)
  }, [nodeSocket])

  useNodeSocketSubscribe({
    event: `NewBlock`,
    onLoad: loadInfo,
    onData: loadInfo
  }, [])

  const statsChart = useCallback(({ key, color }) => {
    const labels = list.map((item) => item.time)
    const data = list.map((item) => item[key])
    return {
      labels,
      datasets: [{
        data,
        borderColor: '#1870cb',
        borderWidth: 4,
        tension: .3
      }]
    }
  }, [list])

  const stats = useMemo(() => {

    return [
      {
        title: `Total supply`, value: formatXelis(info.native_supply)
      },
      { title: `Tx pool`, value: `${info.mempool_size} tx` },
      { title: `TPS`, value: `?` },
      {
        title: `Hash rate`, value: formatHashRate(info.difficulty / 15),
        stats: statsChart({ key: `block_count` })
      },
      {
        title: `Total txs`, value: `?`,
        stats: statsChart({ key: `tx_count` })
      },

      {
        title: `Difficulty`, value: info.difficulty,
        stats: statsChart({ key: `avg_difficulty` })
      },
      {
        title: `Avg block size`, value: `?`,
        stats: statsChart({ key: `avg_block_size` })
      },
      {
        title: `Avg block time`, value: `?`,
        stats: statsChart({ key: `avg_block_time` })
      },
      {
        title: `Blockchain size`, value: `?`,
        stats: statsChart({ key: `sum_size` })
      }
    ]
  }, [info, statsChart])

  if (loading || err) return null

  return <div className="home-stats">
    <div className="home-stats-title">Realtime Stats</div>
    <div className="home-stats-items">
      {stats.map((item) => {
        return <div key={item.title} className="home-stats-item">
          <div className="home-stats-item-title">{item.title}</div>
          <div className="home-stats-item-value">{item.value}</div>
          {item.stats && <HomeMiniChart data={item.stats} />}
        </div>
      })}
    </div>
  </div>
}

function P2PStatus() {
  const [err, setErr] = useState()
  const [p2pStatus, setP2PStatus] = useState()
  const nodeSocket = useNodeSocket()

  const loadP2PStatus = useCallback(async () => {
    const [err, p2pStatus] = await to(nodeSocket.sendMethod(`p2p_status`))
    if (err) return setErr(err)
    setP2PStatus(p2pStatus)
  }, [nodeSocket])

  useNodeSocketSubscribe({
    event: `NewBlock`,
    onLoad: loadP2PStatus,
    onData: loadP2PStatus
  }, [])

  return <div>{JSON.stringify(p2pStatus)}</div>
}

function Home() {
  return <div>
    <Helmet>
      <title>Home</title>
    </Helmet>
    <ExplorerSearch />
    <P2PStatus />
    <RecentBlocks />
    <Stats />
  </div>
}

export default Home
