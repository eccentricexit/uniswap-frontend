import _arbitrableAddressList from '../constants/abis/arbitrable-address-list.json'
import _tokensView from '../constants/abis/tokens-view.json'
import _exchangeView from '../constants/abis/exchange-view.json'
import { T2CR_ADDRESSES, ERC20_BADGE_ADDRESSES, TOKENS_VIEW_ADDRESSES, EXCHANGE_VIEW_ADDRESSES, FACTORY_ADDRESSES } from '../constants/index'
import { getContract, getTokenDecimals } from './index'

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'
const ZERO_ID = '0x0000000000000000000000000000000000000000000000000000000000000000'
const filter = [false, true, false, true, false, true, false, false]

export default async function getTokensWithBadge(library, networkId) {
  try {
    const arbitrableAddressList = getContract(
      ERC20_BADGE_ADDRESSES[networkId],
      _arbitrableAddressList,
      library,
      ZERO_ADDRESS
    )
    const tokensView = getContract(TOKENS_VIEW_ADDRESSES[networkId], _tokensView, library, ZERO_ADDRESS)
    const exchangeView = getContract(EXCHANGE_VIEW_ADDRESSES[networkId], _exchangeView, library, ZERO_ADDRESS)
    const addressesWithBadge = (await arbitrableAddressList.queryAddresses(ZERO_ADDRESS, 100, filter, true))[0].filter(
      address => address !== ZERO_ADDRESS
    )
    const tokenIDs = (await tokensView.getTokensIDsForAddresses(T2CR_ADDRESSES[networkId], addressesWithBadge)).filter(tokenID => tokenID !== ZERO_ID)
    const tokensInfo = (await tokensView.getTokens(T2CR_ADDRESSES[networkId], tokenIDs))
      .filter(tokenInfo => tokenInfo[3] !== ZERO_ADDRESS)
      .reduce((acc, curr) => ({
        ...acc,
        [curr[3]]: curr
      }), {})

    const addresses = Object.keys(tokensInfo)
    const exchangeAddresses = (await exchangeView.getExchanges(FACTORY_ADDRESSES[networkId], addresses)).slice(0, addresses.length)
    addresses.forEach((address, i) => {
      if (exchangeAddresses[i] !== ZERO_ADDRESS) tokensInfo[address].exchangeAddress = exchangeAddresses[i]
    })

    // We can't fetch all token decimal places information at once (as done with exchange addresses and token information)
    // because some tokens do not implement the decimals() function.
    // We can't use assembly with STATICCALL (as done in EIP-165) to detect this as contracts with function callbacks can
    // cause false positives.
    await Promise.all(
      addresses.map(async address => {
        try {
          tokensInfo[address].decimals = await getTokenDecimals(address, library)
          return null
        } catch (err) {
          console.warn('Could not fetch token information for token of address ' + address)
        }
      })
    )
    addresses.forEach(address => {
      if (!tokensInfo[address].decimals || !tokensInfo[address].exchangeAddress)
        delete tokensInfo[address]
    })

    return Object.keys(tokensInfo).map(address => [
      tokensInfo[address].ticker,
      tokensInfo[address].addr,
      tokensInfo[address].name,
      tokensInfo[address].symbolMultihash,
      tokensInfo[address].decimals,
      tokensInfo[address].exchangeAddress
    ])
  } catch (err) {
    if (err.slice && err.slice(0, 14) === 'call exception') return getTokensWithBadge(library, networkId)
    // This is an issue with infura. Simply try again.
    else {
      console.error(err)
      return []
    }
  }
}
