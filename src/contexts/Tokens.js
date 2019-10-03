import React, { createContext, useContext, useReducer, useMemo, useCallback, useEffect, useState } from 'react'
import { useWeb3Context } from 'web3-react'
import { ethers } from 'ethers'
import { isAddress, getTokenDecimals, getTokenExchangeAddressFromFactory, safeAccess, getTokenInfo } from '../utils'
import getTokensWithBadge from '../utils/get-tokens-with-badge'
import decimalsDictionary from '../utils/decimals-dictionary'

const NAME = 'name'
const SYMBOL = 'symbol'
const DECIMALS = 'decimals'
const EXCHANGE_ADDRESS = 'exchangeAddress'
const SYMBOL_MULTIHASH = 'symbolMultihash'
const ADDRESS = 'address'
const MISSING_ERC20_BADGE = 'missingERC20Badge'
const MISSING_DECIMALS = 'missingDecimals'
const HAS_TRUE_CRYPTOSYS_BADGE = 'hasTrueCryptoSysBadge'

const UPDATE = 'UPDATE'
const SET_FETCHING = 'SET_FETCHING'

const ETH = {
  ETH: {
    [NAME]: 'Ethereum',
    [SYMBOL]: 'ETH',
    [DECIMALS]: 18,
    [EXCHANGE_ADDRESS]: null,
    [MISSING_ERC20_BADGE]: false,
    [MISSING_DECIMALS]: false,
    [HAS_TRUE_CRYPTOSYS_BADGE]: false
  }
}

const TokensContext = createContext()

function useTokensContext() {
  return useContext(TokensContext)
}

function reducer(state, { type, payload }) {
  switch (type) {
    case UPDATE: {
      const {
        networkId,
        tokenAddress,
        name,
        symbol,
        decimals,
        exchangeAddress,
        symbolMultihash,
        missingERC20Badge,
        missingDecimals,
        hasTrueCryptoSysBadge
      } = payload
      return {
        ...state,
        [networkId]: {
          ...(safeAccess(state, [networkId]) || {}),
          [tokenAddress]: {
            [NAME]: name,
            [SYMBOL]: symbol,
            [SYMBOL_MULTIHASH]: symbolMultihash,
            [DECIMALS]: decimals,
            [EXCHANGE_ADDRESS]: exchangeAddress,
            [MISSING_ERC20_BADGE]: missingERC20Badge,
            [MISSING_DECIMALS]: missingDecimals,
            [HAS_TRUE_CRYPTOSYS_BADGE]: hasTrueCryptoSysBadge
          }
        }
      }
    }
    case SET_FETCHING: {
      return {
        ...state,
        isFetching: payload
      }
    }
    default: {
      throw Error(`Unexpected action type in TokensContext reducer: '${type}'.`)
    }
  }
}

const UNISWAP_NINJA_TOKENS_CACHE_KEY = 'UNISWAP_NINJA_TOKENS_CACHE'

export default function Provider({ children }) {
  const { library, networkId } = useWeb3Context()

  let cachedTokens
  if (networkId)
    cachedTokens = window.localStorage.getItem(`${UNISWAP_NINJA_TOKENS_CACHE_KEY}@network${networkId}`)

  const initialState = { 1: {}, 42: {} }
  if (cachedTokens) {
    cachedTokens = JSON.parse(cachedTokens)
    initialState[networkId] = cachedTokens
  }

  const [state, dispatch] = useReducer(reducer, initialState)
  const [loadedFromCache, setLoadedFromCache] = useState()
  const [fetched, setFetched] = useState()

  const update = useCallback(
    (networkId, tokenAddress, name, symbol, symbolMultihash, decimals, exchangeAddress, missingERC20Badge, missingDecimals, hasTrueCryptoSysBadge) => {
      dispatch({
        type: UPDATE,
        payload: {
          networkId,
          tokenAddress,
          name,
          symbol,
          symbolMultihash,
          decimals,
          exchangeAddress,
          missingERC20Badge,
          missingDecimals,
          hasTrueCryptoSysBadge
        }
      })
    },
    []
  )

  useEffect(() => {
    if (loadedFromCache || !cachedTokens || !networkId) return

    Object.keys(cachedTokens).forEach(address => {
      update(
        networkId,
        cachedTokens[address][ADDRESS],
        cachedTokens[address][NAME],
        cachedTokens[address][SYMBOL],
        cachedTokens[address][SYMBOL_MULTIHASH],
        cachedTokens[address][DECIMALS],
        cachedTokens[address][EXCHANGE_ADDRESS],
        cachedTokens[address][MISSING_ERC20_BADGE],
        cachedTokens[address][MISSING_DECIMALS],
        cachedTokens[address][HAS_TRUE_CRYPTOSYS_BADGE]
      )
    })

    setLoadedFromCache(true)
  }, [cachedTokens, loadedFromCache, networkId, update])

  const setFetching = isFetching =>
    dispatch({
      type: SET_FETCHING,
      payload: isFetching
    })

  useEffect(() => {
    // Fetch tokens from t2cr.
    ;(async () => {
      if (!library || state.isFetching || fetched ) return
      setFetching(true)
      const tokens = (await getTokensWithBadge(library, networkId)).map(
        token => ({
          [SYMBOL]: token[0],
          [ADDRESS]: token[1],
          [NAME]: token[2],
          [SYMBOL_MULTIHASH]: token[3],
          [EXCHANGE_ADDRESS]: token[4],
          [MISSING_ERC20_BADGE]: false,
          [MISSING_DECIMALS]: null,
          [DECIMALS]: token[5],
          [HAS_TRUE_CRYPTOSYS_BADGE]: token[6]
        }),
        {}
      )
      window.localStorage.setItem(
        `${UNISWAP_NINJA_TOKENS_CACHE_KEY}@network${networkId}`,
        JSON.stringify(tokens.reduce((acc, curr) => ({...acc, [curr[ADDRESS]]: curr}),{}))
      )
      tokens.forEach(token => {
        update(
          networkId,
          token[ADDRESS],
          token[NAME],
          token[SYMBOL],
          token[SYMBOL_MULTIHASH],
          token[DECIMALS],
          token[EXCHANGE_ADDRESS],
          token[MISSING_ERC20_BADGE],
          token[MISSING_DECIMALS],
          token[HAS_TRUE_CRYPTOSYS_BADGE]
        )
      })
      setFetching(false)
      setFetched(true)
    })()
  }, [fetched, initialState, library, networkId, state, state.isFetching, update])

  return (
    <TokensContext.Provider value={useMemo(() => [state, { update }], [state, update])}>
      {children}
    </TokensContext.Provider>
  )
}

export function useFetchingTokens() {
  const [state] = useTokensContext()
  return state.isFetching
}

export function useTokenDetails(tokenAddress) {
  const { networkId, library } = useWeb3Context()

  const [state, { update }] = useTokensContext()
  const allTokensInNetwork = { ...ETH, ...(safeAccess(state, [networkId]) || {}) }
  const {
    [NAME]: name,
    [SYMBOL]: symbol,
    [DECIMALS]: decimals,
    [EXCHANGE_ADDRESS]: exchangeAddress,
    [SYMBOL_MULTIHASH]: symbolMultihash,
    [MISSING_DECIMALS]: missingDecimals,
    [HAS_TRUE_CRYPTOSYS_BADGE]: hasTrueCryptoSysBadge
  } = safeAccess(allTokensInNetwork, [tokenAddress]) || {}

  useEffect(() => {
    if (
      isAddress(tokenAddress) &&
      (decimals === undefined || exchangeAddress === undefined) &&
      (networkId || networkId === 0) &&
      library
    ) {
      let stale = false

      const decimalsPromise = !decimals ? getTokenDecimals(tokenAddress, library).catch(() => null) : null
      const exchangeAddressPromise = !exchangeAddress ? getTokenExchangeAddressFromFactory(tokenAddress, networkId, library).catch(
        () => null
      ) : null

      let tokenInfoPromise
      if (!name || !symbol || !symbolMultihash) {
        tokenInfoPromise = getTokenInfo(tokenAddress, library, networkId)
      }
      Promise.all([decimalsPromise, exchangeAddressPromise, tokenInfoPromise]).then(
        ([resolvedDecimals, resolvedExchangeAddress, resolvedTokenInfo]) => {
          let tokenInfoName
          let tokenInfoTicker
          let tokenInfoSymbolMultihash
          let missingDecimals = false
          if (resolvedTokenInfo) {
            tokenInfoName = resolvedTokenInfo.name
            tokenInfoTicker = resolvedTokenInfo.ticker
            tokenInfoSymbolMultihash = resolvedTokenInfo.symbolMultihash
          }

          if (!resolvedDecimals) {
            // The token contract does not have the `decimals()` function.
            // We check against a hardcoded dictionary in this case and warn the user.
            resolvedDecimals = decimalsDictionary[tokenAddress]
          }
          if (!resolvedDecimals) {
            // If we do not have the number of decimals in the token dictionary either,
            // we mark this token as missing decimals prevent the user from trading it.
            missingDecimals = true
          }

          if (!stale) {
            update(
              networkId,
              tokenAddress,
              name || tokenInfoName || '',
              symbol || tokenInfoTicker || '---',
              symbolMultihash || tokenInfoSymbolMultihash || '',
              decimals || resolvedDecimals,
              resolvedExchangeAddress,
              !!resolvedTokenInfo,
              missingDecimals,
              hasTrueCryptoSysBadge
            )
          }
        }
      )
      return () => {
        stale = true
      }
    }
  }, [tokenAddress, name, symbol, decimals, exchangeAddress, symbolMultihash, networkId, missingDecimals, library, update, hasTrueCryptoSysBadge])

  return { name, symbol, decimals, exchangeAddress, symbolMultihash, missingDecimals, hasTrueCryptoSysBadge }
}

export function useAllTokenDetails(requireExchange = false) {
  const { networkId } = useWeb3Context()

  const [state] = useTokensContext()
  const tokenDetails = { ...ETH, ...(safeAccess(state, [networkId]) || {}) }

  return requireExchange
    ? Object.keys(tokenDetails)
        .filter(
          tokenAddress =>
            tokenAddress === 'ETH' ||
            (safeAccess(tokenDetails, [tokenAddress, EXCHANGE_ADDRESS]) &&
              safeAccess(tokenDetails, [tokenAddress, EXCHANGE_ADDRESS]) !== ethers.constants.AddressZero)
        )
        .reduce((accumulator, tokenAddress) => {
          accumulator[tokenAddress] = tokenDetails[tokenAddress]
          return accumulator
        }, {})
    : tokenDetails
}
