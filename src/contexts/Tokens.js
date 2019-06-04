import React, { createContext, useContext, useReducer, useMemo, useCallback, useEffect } from 'react'
import { useWeb3Context } from 'web3-react'
import { ethers } from 'ethers'

import { isAddress, getTokenDecimals, getTokenExchangeAddressFromFactory, safeAccess } from '../utils'

import getT2CRTokens from '../utils/get-t2cr-tokens'

const NAME = 'name'
const SYMBOL = 'symbol'
const DECIMALS = 'decimals'
const EXCHANGE_ADDRESS = 'exchangeAddress'
const SYMBOL_MULTIHASH = 'symbolMultihash'
const ADDRESS = 'address'

const UPDATE = 'UPDATE'

const ETH = {
  ETH: {
    [NAME]: 'Ethereum',
    [SYMBOL]: 'ETH',
    [DECIMALS]: 18,
    [EXCHANGE_ADDRESS]: null
  }
}

const TokensContext = createContext()

function useTokensContext() {
  return useContext(TokensContext)
}

function reducer(state, { type, payload }) {
  switch (type) {
    case UPDATE: {
      const { networkId, tokenAddress, name, symbol, decimals, exchangeAddress, symbolMultihash } = payload
      return {
        ...state,
        [networkId]: {
          ...(safeAccess(state, [networkId]) || {}),
          [tokenAddress]: {
            [NAME]: name,
            [SYMBOL]: symbol,
            [SYMBOL_MULTIHASH]: symbolMultihash,
            [DECIMALS]: decimals,
            [EXCHANGE_ADDRESS]: exchangeAddress
          }
        }
      }
    }
    default: {
      throw Error(`Unexpected action type in TokensContext reducer: '${type}'.`)
    }
  }
}

export default function Provider({ children }) {
  const [state, dispatch] = useReducer(reducer, { 1: {} })

  const update = useCallback((networkId, tokenAddress, name, symbol, symbolMultihash, decimals, exchangeAddress) => {
    dispatch({
      type: UPDATE,
      payload: { networkId, tokenAddress, name, symbol, symbolMultihash, decimals, exchangeAddress }
    })
  }, [])

  const { library, networkId } = useWeb3Context()

  useEffect(() => {
    const fetchFromT2CR = async () => {
      if (library) {
        const tokens = (await getT2CRTokens(library, networkId)).map(
          token => ({
            [SYMBOL]: token[0],
            [ADDRESS]: token[1],
            [NAME]: token[2],
            [SYMBOL_MULTIHASH]: token[3],
            [DECIMALS]: null,
            [EXCHANGE_ADDRESS]: null
          }),
          {}
        )
        tokens.forEach(token => {
          update(networkId, token[ADDRESS], token[NAME], token[SYMBOL], token[SYMBOL_MULTIHASH])
        })
      }
    }
    fetchFromT2CR()
  }, [library, networkId, update])

  return (
    <TokensContext.Provider value={useMemo(() => [state, { update }], [state, update])}>
      {children}
    </TokensContext.Provider>
  )
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
    [SYMBOL_MULTIHASH]: symbolMultihash
  } = safeAccess(allTokensInNetwork, [tokenAddress]) || {}

  useEffect(() => {
    if (
      isAddress(tokenAddress) &&
      (decimals === undefined || exchangeAddress === undefined) &&
      (networkId || networkId === 0) &&
      library
    ) {
      let stale = false

      const decimalsPromise = getTokenDecimals(tokenAddress, library).catch(() => null)
      const exchangeAddressPromise = getTokenExchangeAddressFromFactory(tokenAddress, networkId, library).catch(
        () => null
      )

      Promise.all([decimalsPromise, exchangeAddressPromise]).then(([resolvedDecimals, resolvedExchangeAddress]) => {
        if (!stale) {
          update(
            networkId,
            tokenAddress,
            name ? name : '',
            symbol ? symbol : '---',
            symbolMultihash ? symbolMultihash : '',
            resolvedDecimals,
            resolvedExchangeAddress
          )
        }
      })

      return () => {
        stale = true
      }
    }
  }, [tokenAddress, name, symbol, decimals, exchangeAddress, symbolMultihash, networkId, library, update])

  return { name, symbol, decimals, exchangeAddress, symbolMultihash }
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
