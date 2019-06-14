import _arbitrableAddressList from '../constants/abis/arbitrable-address-list.json'
import _arbitrableTokenList from '../constants/abis/arbitrable-token-list.json'
import { T2CR_ADDRESSES, ERC20_BADGE_ADDRESSES } from '../constants/index'
import { getContract, getTokenDecimals, getTokenExchangeAddressFromFactory } from './index'

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'
const ZERO_ID = '0x0000000000000000000000000000000000000000000000000000000000000000'
const filter = [false, true, false, true, false, true, false, false]

export default async (library, networkId) => {
  const arbitrableTokenList = getContract(T2CR_ADDRESSES[networkId], _arbitrableTokenList, library, ZERO_ADDRESS)
  const arbitrableAddressList = getContract(
    ERC20_BADGE_ADDRESSES[networkId],
    _arbitrableAddressList,
    library,
    ZERO_ADDRESS
  )

  const addressesWithBadge = (await arbitrableAddressList.queryAddresses(ZERO_ADDRESS, 100, filter, true))[0].filter(
    address => address !== ZERO_ADDRESS
  )

  const submissions = (await Promise.all(
    addressesWithBadge.map(async address => {
      const tokenIDsForAddr = (await arbitrableTokenList.queryTokens(ZERO_ID, 100, filter, true, address))[0].filter(
        ID => ID !== ZERO_ID
      )

      let decimals
      let exchangeAddress
      try {
        decimals = await getTokenDecimals(address, library)
        exchangeAddress = await getTokenExchangeAddressFromFactory(address, networkId, library)
      } catch (err) {
        console.warn('Could not fetch token information for token of address ' + address)
        return null
      }

      if (tokenIDsForAddr.length === 0) return null
      return {
        ID: tokenIDsForAddr[0],
        decimals,
        exchangeAddress
      }
    })
  )).filter(item => !!item)

  const tokenData = (await Promise.all(
    submissions.map(async ({ ID, decimals, exchangeAddress }) => ({
      ...(await arbitrableTokenList.getTokenInfo(ID)),
      decimals,
      exchangeAddress
    }))
  )).reduce((acc, submission) => {
    if (acc[submission.addr]) acc[submission.addr].push(submission)
    else acc[submission.addr] = [submission]
    return acc
  }, {})

  return Object.keys(tokenData).map(address => [
    tokenData[address][0].ticker,
    address,
    tokenData[address][0].name,
    tokenData[address][0].symbolMultihash,
    tokenData[address][0].decimals,
    tokenData[address][0].exchangeAddress
  ])
}
