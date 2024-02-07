import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import to from 'await-to-js'
import { css } from 'goober'
import { useNodeSocket, useNodeSocketSubscribe } from '@xelis/sdk/react/daemon'
import { RPCEvent } from '@xelis/sdk/daemon/types'
import { usePageLoad } from 'g45-react/hooks/usePageLoad'
import { useServerData } from 'g45-react/hooks/useServerData'
import Age from 'g45-react/components/age'
import { useLang } from 'g45-react/hooks/useLang'
import useQueryString from 'g45-react/hooks/useQueryString'
import hashIt from 'hash-it'

import { formatSize, formatXelis, groupBy, reduceText } from '../../utils'
import Pagination, { getPaginationRange } from '../../components/pagination'
import TableFlex from '../../components/tableFlex'
import { daemonRPC } from '../../hooks/nodeRPC'
import { slideX } from '../../style/animate'
import PageTitle from '../../layout/page_title'
import { getBlockColor } from '../dag/blockColor'
import useTheme from '../../hooks/useTheme'
import { getBlockType } from '../dag'

const style = {
  container: css`
    h1 {
      margin: 1.5em 0 .5em 0;
      font-weight: bold;
      font-size: 2em;
    }

    > :nth-child(2) {
      margin-bottom: 1em;
    }
  `,
  animateBlock: css`
    ${slideX({ from: `100%`, to: `0%`, duration: `0.4s` })}
  `
}

export function loadBlocks_SSR({ pageState, defaultBlocks = [] }) {
  const defaultResult = { totalBlocks: 0, blocks: defaultBlocks, err: null, loaded: false }

  return useServerData(`func:loadBlocks(${hashIt(pageState)})`, async () => {
    const result = Object.assign({}, defaultResult)

    const [err, res1] = await to(daemonRPC.getTopoHeight())
    result.err = err
    if (err) return result


    const topoheight = res1.result
    let pagination = getPaginationRange(pageState)
    let startTopoheight = Math.max(0, topoheight - pagination.end)
    let endTopoheight = topoheight - pagination.start

    const [err2, res2] = await to(daemonRPC.getBlocksRangeByTopoheight({
      start_topoheight: startTopoheight,
      end_topoheight: endTopoheight,
    }))
    result.err = err2
    if (err2) return result

    result.totalBlocks = topoheight + 1
    result.blocks = res2.result.reverse()
    result.loaded = true

    return result
  }, defaultResult)
}

function Blocks() {
  const { firstPageLoad } = usePageLoad()
  const [err, setErr] = useState()
  const [loading, setLoading] = useState()
  const [query, setQuery] = useQueryString()
  const { t } = useLang()
  const { theme } = useTheme()

  const [pageState, _setPageState] = useState(() => {
    const page = parseInt(query.page) || 1
    const size = parseInt(query.size) || 20
    return { page, size }
  })

  const setPageState = useCallback((value) => {
    _setPageState(value)
    setQuery(value)
  }, [])

  const serverResult = loadBlocks_SSR({ pageState })
  const [blockCount, setBlockCount] = useState(serverResult.totalBlocks)
  const [blocks, setBlocks] = useState(serverResult.blocks)
  const nodeSocket = useNodeSocket()
  const [newBlock, setNewBlock] = useState()
  const [info, setInfo] = useState({})

  const loadBlocks = useCallback(async () => {
    if (nodeSocket.readyState !== WebSocket.OPEN) return

    setErr(null)
    setLoading(true)

    const resErr = (err) => {
      setBlocks([])
      setBlockCount(0)
      setErr(err)
      setLoading(false)
    }

    let pagination = getPaginationRange(pageState)

    const [err1, topoheight] = await to(nodeSocket.daemon.methods.getTopoHeight())
    if (err1) return resErr(err1)

    // reverse pager range
    let startTopoheight = Math.max(0, topoheight - pagination.end)
    let endTopoheight = topoheight - pagination.start

    const [err2, blocks] = await to(nodeSocket.daemon.methods.getBlocksRangeByTopoheight({
      start_topoheight: startTopoheight,
      end_topoheight: endTopoheight
    }))
    if (err2) return resErr(err2)

    setBlockCount(topoheight + 1)
    setBlocks(blocks.reverse())
    setLoading(false)
  }, [pageState, nodeSocket.readyState])

  const loadInfo = useCallback(async () => {
    if (nodeSocket.readyState !== WebSocket.OPEN) return

    const [err, info] = await to(nodeSocket.daemon.methods.getInfo())
    if (err) return setErr(err)
    setInfo(info)
  }, [nodeSocket.readyState])

  useNodeSocketSubscribe({
    event: RPCEvent.NewBlock,
    onData: (_, newBlock) => {
      // don't add new block if we're not on first page
      if (pageState.page > 1) return

      loadInfo()
      setBlocks((blocks) => {
        if (blocks.findIndex(block => block.hash === newBlock.hash) !== -1) return blocks

        blocks.unshift(newBlock)
        if (blocks.length > pageState.size) {
          blocks.pop()
        }

        setNewBlock(newBlock)
        setBlockCount((count) => count + 1)
        return [...blocks]
      })
    }
  }, [pageState])

  useNodeSocketSubscribe({
    event: RPCEvent.BlockOrdered,
    onData: (_, data) => {
      // dont't update blocks if we are not on first page
      if (pageState.page > 1) return

      const { topoheight, block_hash, block_type } = data
      setBlocks((blocks) => blocks.map(block => {
        if (block.hash === block_hash) {
          block.topoheight = topoheight
          block.block_type = block_type
        }
        return block
      }))
    }
  }, [pageState])

  useEffect(() => {
    if (firstPageLoad && serverResult.loaded) return
    loadBlocks()
  }, [loadBlocks, firstPageLoad])

  useEffect(() => {
    loadBlocks()
  }, [pageState])

  const heightBlocks = useMemo(() => {
    return [...groupBy(blocks, (b) => b.height).entries()]
  }, [blocks])

  return <div className={style.container}>
    <PageTitle title={t('Blocks')} subtitle={t(`{} mined blocks`, [blockCount.toLocaleString()])}
      metaDescription={t('List of mined blocks. Access block heights, timestamps and transaction counts.')} />
    <TableFlex data={blocks} rowKey="hash" err={err} loading={loading} emptyText={t('No blocks')}
      rowClassName={(block) => {
        if (newBlock && block.hash === newBlock.hash) return style.animateBlock
        return null
      }}
      headers={[
        {
          key: 'topoheight',
          title: t('Topo'),
          render: (value) => <Link to={`/blocks/${value}`}>{value}</Link>
        },
        {
          key: 'block_type',
          title: t('Type'),
          render: (_, block) => {
            const blockType = getBlockType(block, info.stableheight, heightBlocks)
            const color = getBlockColor(theme, blockType)
            return <span style={{ color }}>{blockType}</span>
          }
        },
        {
          key: 'txs_hashes',
          title: t('Txs'),
          render: (value) => (value || []).length
        },
        {
          key: 'timestamp',
          title: t('Age'),
          render: (value) => <Age timestamp={value} update format={{ secondsDecimalDigits: 0 }} />
        },
        {
          key: 'total_size_in_bytes',
          title: t('Size'),
          render: (value) => formatSize(value)
        },
        {
          key: 'hash',
          title: t('Hash'),
          render: (value) => <Link to={`/blocks/${value}`}>{reduceText(value)}</Link>
        },
        {
          key: 'total_fees',
          title: t('Fees'),
          render: (value) => formatXelis(value)
        },
        {
          key: 'miner',
          title: t('Miner'),
          render: (value) => {
            return <Link to={`/accounts/${value}`}>{reduceText(value, 0, 7)}</Link>
          }
        },
        {
          key: 'reward',
          title: t('Reward'),
          render: (value) => formatXelis(value)
        }
      ]}
    />
    <Pagination state={pageState} setState={setPageState} countText={t('blocks')} count={blockCount} />
  </div>
}

export default Blocks
