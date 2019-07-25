import _arbitrableAddressList from '../constants/abis/arbitrable-address-list.json'
import _tokensView from '../constants/abis/tokens-view.json'
import { T2CR_ADDRESSES, ERC20_BADGE_ADDRESSES, TOKENS_VIEW_ADDRESSES } from '../constants/index'
import { getContract, getTokenDecimals, getTokenExchangeAddressFromFactory } from './index'

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
    const addressesWithBadge = (await arbitrableAddressList.queryAddresses(ZERO_ADDRESS, 100, filter, true))[0].filter(
      address => address !== ZERO_ADDRESS
    )
    const tokenIDs = (await tokensView.getTokensIDsForAddresses(T2CR_ADDRESSES[networkId], addressesWithBadge)).filter(tokenID => tokenID !== ZERO_ID)
    const tokensInfo = (await tokensView.getTokens(T2CR_ADDRESSES[networkId], tokenIDs))
      .filter(tokenInfo => tokenInfo[3] !== '0x0000000000000000000000000000000000000000')
      .reduce((acc, curr) => ({
        ...acc,
        [curr[3]]: curr
      }), {})

    await Promise.all(
      Object.keys(tokensInfo).map(async address => {
        try {
          tokensInfo[address].decimals = await getTokenDecimals(address, library)
          tokensInfo[address].exchangeAddress = await getTokenExchangeAddressFromFactory(address, networkId, library)
          return null
        } catch (err) {
          console.warn('Could not fetch token information for token of address ' + address)
        }
      })
    )
    Object.keys(tokensInfo).forEach(address => {
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
