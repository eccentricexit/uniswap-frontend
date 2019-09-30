import _arbitrableAddressList from '../constants/abis/arbitrable-address-list.json'
import _tokensView from '../constants/abis/tokens-view.json'
import _exchangeView from '../constants/abis/exchange-view.json'
import _erc20 from '../constants/abis/erc20.json'
import { getContract } from './index'
import {
  T2CR_ADDRESSES,
  ERC20_BADGE_ADDRESSES,
  TOKENS_VIEW_ADDRESSES,
  EXCHANGE_VIEW_ADDRESSES,
  FACTORY_ADDRESSES,
  TRUE_CRYPTOSYSTEM_BADGE_ADDRESSES
} from '../constants/index'
import decimalsDictionary from './decimals-dictionary.js';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'
const ZERO_ID = '0x0000000000000000000000000000000000000000000000000000000000000000'
const filter = [false, true, false, true, false, true, false, false]

export default async function getTokensWithBadge(library, networkId) {
  try {
    const erc20Badge = getContract(
      ERC20_BADGE_ADDRESSES[networkId],
      _arbitrableAddressList,
      library,
      ZERO_ADDRESS
    )
    const trueCryptosystemBadge = getContract(
      TRUE_CRYPTOSYSTEM_BADGE_ADDRESSES[networkId],
      _arbitrableAddressList,
      library,
      ZERO_ADDRESS
    )
    const tokensView = getContract(TOKENS_VIEW_ADDRESSES[networkId], _tokensView, library, ZERO_ADDRESS)
    const exchangeView = getContract(EXCHANGE_VIEW_ADDRESSES[networkId], _exchangeView, library, ZERO_ADDRESS)
    const [addrWithERC20Badge, addrWithTrueCryptosysBadge] = await Promise.all([
      (async () => {
        let hasMore = true
        let lastAddress = ZERO_ADDRESS
        let addresses = []
        while (hasMore) {
          const result = await erc20Badge.queryAddresses(ZERO_ADDRESS, 1000, filter, true)
          addresses = addresses.concat(result[0].filter(
            address => address !== ZERO_ADDRESS
          ))
          hasMore = result.hasMore
          lastAddress = addresses.length > 0 ? addresses[addresses.length - 1] : lastAddress
        }

        return addresses
      })(),
      (async () => {
        let hasMore = true
        let lastAddress = ZERO_ADDRESS
        let addresses = []
        while (hasMore) {
          const result = await trueCryptosystemBadge.queryAddresses(ZERO_ADDRESS, 1000, filter, true)
          addresses = addresses.concat(result[0].filter(
            address => address !== ZERO_ADDRESS
          ))
          hasMore = result.hasMore
          lastAddress = addresses.length > 0 ? addresses[addresses.length - 1] : lastAddress
        }
        return addresses
      })()
    ])

    const tokenIDs = (await tokensView.getTokensIDsForAddresses(T2CR_ADDRESSES[networkId], addrWithERC20Badge)).filter(tokenID => tokenID !== ZERO_ID)
    let tokensInfo = (await tokensView.getTokens(
      T2CR_ADDRESSES[networkId],
      tokenIDs
    ))
      .filter(tokenInfo => tokenInfo[3] !== ZERO_ADDRESS)
      .map(tokenInfo => ({...tokenInfo, 6: tokenInfo[6].toNumber(), decimals: tokenInfo.decimals.toNumber() }))
      .map(tokenInfo => {
        // Set decimals from dictionary, if available.
        // This is done because some token contracts (like DGD) may not implement the decimals() function.
        if (decimalsDictionary[tokenInfo[3]])
          tokenInfo.decimals = decimalsDictionary[tokenInfo[3]]
        return tokenInfo
      })


    // `tokensView.getTokens` returns 0 in the decimals field if
    // the queried token does not have the `decimals` function.
    // Iterate the list to detect if this is the case for a token
    // and if so, use 18 decimal places as default.
    tokensInfo.filter(tokenInfo => tokenInfo.decimals === '0')
      .forEach(async (tokenInfo, i) => {
        const erc20Token = getContract(
          tokenInfo.addr,
          _erc20,
          library,
          ZERO_ADDRESS
        )
        try {
          const decimals = await erc20Token.decimals()
          tokensInfo[i].decimals = decimals
        } catch {
          console.warn(`Token ${tokenInfo.addr} does
            not implement the 'decimals()' function.
            Falling back to the default, 18 decimal places.`
          )
          tokensInfo[i].decimals = '18'
        }
      })

    tokensInfo = tokensInfo.reduce((acc, curr) => ({
      ...acc,
      [curr[3]]: curr
    }), {})

    const addresses = Object.keys(tokensInfo)
    const exchangeAddresses = (await exchangeView.getExchanges(FACTORY_ADDRESSES[networkId], addresses)).slice(0, addresses.length)
    addresses.forEach((address, i) => {
      if (exchangeAddresses[i] !== ZERO_ADDRESS) tokensInfo[address].exchangeAddress = exchangeAddresses[i]
    })

    addresses.forEach(address => {
      if (!tokensInfo[address].exchangeAddress)
        delete tokensInfo[address]
    })

    addrWithTrueCryptosysBadge.forEach(address => {
      tokensInfo[address].hasTrueCryptoSysBadge = true
    })

    return Object.keys(tokensInfo).map(address => [
      tokensInfo[address].ticker,
      tokensInfo[address].addr,
      tokensInfo[address].name,
      tokensInfo[address].symbolMultihash,
      tokensInfo[address].exchangeAddress,
      tokensInfo[address].decimals,
      tokensInfo[address].hasTrueCryptoSysBadge
    ])
  } catch (err) {
    console.error(err)
    return []
  }
}
