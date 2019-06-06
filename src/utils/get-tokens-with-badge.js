import _arbitrableAddressList from '../constants/abis/arbitrable-address-list.json'
import _arbitrableTokenList from '../constants/abis/arbitrable-token-list.json'
import { T2CR_ADDRESSES, ERC20_BADGE_ADDRESSES } from '../constants/index'
import { getContract } from './index'

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

  const submissionIDs = [].concat(
    ...(await Promise.all(
      addressesWithBadge.map(address =>
        arbitrableTokenList
          .queryTokens(ZERO_ID, 100, filter, true, address)
          .then(res => res[0].filter(ID => ID !== ZERO_ID))
      )
    ))
  )

  const tokenData = (await Promise.all(submissionIDs.map(ID => arbitrableTokenList.getTokenInfo(ID)))).reduce(
    (acc, submission) => {
      if (acc[submission.addr]) acc[submission.addr].push(submission)
      else acc[submission.addr] = [submission]
      return acc
    },
    {}
  )

  return Object.keys(tokenData).map(address => [
    tokenData[address][0].ticker,
    address,
    tokenData[address][0].name,
    tokenData[address][0].symbolMultihash
  ])
}
