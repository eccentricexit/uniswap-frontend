import _arbitrableAddressList from '../constants/abis/arbitrable-address-list.json'
import _tokensView from '../constants/abis/tokens-view.json'
import _exchangeView from '../constants/abis/exchange-view.json'
import { T2CR_ADDRESSES, ERC20_BADGE_ADDRESSES, TOKENS_VIEW_ADDRESSES, EXCHANGE_VIEW_ADDRESSES, FACTORY_ADDRESSES } from '../constants/index'
import { getContract } from './index'

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

    addresses.forEach(address => {
      if (!tokensInfo[address].exchangeAddress)
        delete tokensInfo[address]
    })

    return Object.keys(tokensInfo).map(address => [
      tokensInfo[address].ticker,
      tokensInfo[address].addr,
      tokensInfo[address].name,
      tokensInfo[address].symbolMultihash,
      tokensInfo[address].exchangeAddress
    ])
  } catch (err) {
    if (err.message.slice && err.message.slice(0, 14) === 'call exception') // This is an issue with infura. Simply try again.
      return getTokensWithBadge(library, networkId)
    else {
      console.error(err)
      return []
    }
  }
}
