import React from 'react'
import styled, { css } from 'styled-components'
import { useWeb3Context, Connectors } from 'web3-react'
import { useTranslation } from 'react-i18next'
import { Link2 } from 'react-feather'
import { darken } from 'polished'

import Transaction from './Transaction'
import Copy from './Copy'
import Modal from '../Modal'

import { getEtherscanLink } from '../../utils'
import { Link } from '../../theme'

const { Connector } = Connectors

const Wrapper = styled.div`
  margin: 0;
  padding: 0;
  width: 100%;
  ${({ theme }) => theme.flexColumnNoWrap}
`

const UpperSection = styled.div`
  padding: 2rem;
  background-color: ${({ theme }) => theme.concreteGray};

  h5 {
    margin: 0;
    margin-bottom: 0.5rem;
    font-size: 1rem;
    font-weight: 400;
  }

  h5:last-child {
    margin-bottom: 0px;
  }

  h4 {
    margin-top: 0;
    font-weight: 500;
  }
`

const YourAccount = styled.div`
  h5 {
    margin: 0 0 1rem 0;
    font-weight: 400;
    color: ${({ theme }) => theme.doveGray};
  }

  h4 {
    margin: 0;
    font-weight: 500;
  }
`

const LowerSection = styled.div`
  ${({ theme }) => theme.flexColumnNoWrap}
  padding: 2rem;
  flex-grow: 1;
  overflow: auto;

  h5 {
    margin: 0;
    font-weight: 400;
    color: ${({ theme }) => theme.doveGray};
  }

  div:last-child {
    /* margin-bottom: 0; */
  }
`

const AccountControl = styled.div`
  ${({ theme }) => theme.flexRowNoWrap}
  align-items: center;
  min-width: 0;

  ${({ hasENS, isENS }) =>
    hasENS &&
    isENS &&
    css`
      margin-bottom: 0.75rem;
    `}
  font-weight: ${({ hasENS, isENS }) => (hasENS ? (isENS ? css`500` : css`400`) : css`500`)};
  font-size: ${({ hasENS, isENS }) => (hasENS ? (isENS ? css`1rem` : css`0.8rem`) : css`1rem`)};

  a:hover {
    text-decoration: underline;
  }

  a {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`

const TransactionListWrapper = styled.div`
  ${({ theme }) => theme.flexColumnNoWrap} /* margin: 0 0 1rem 0; */
`

const StyledLink = styled(Link)`
  color: ${({ hasENS, isENS, theme }) => (hasENS ? (isENS ? theme.royalBlue : theme.doveGray) : theme.royalBlue)};
`

const Text = styled.p`
  flex: 1 1 auto;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin: 0 0.5rem 0 0.25rem;
  font-size: 0.83rem;
`

const Link2Icon = styled(Link2)`
  margin-left: 0.25rem;
  margin-right: 0.5rem;
  width: 16px;
  height: 16px;
`

const Web3StatusGeneric = styled.button`
  ${({ theme }) => theme.flexRowNoWrap}
  font-size: 0.9rem;
  align-items: center;
  padding: 0.5rem;
  border-radius: 2rem;
  box-sizing: border-box;
  cursor: pointer;
  user-select: none;
  :focus {
    outline: none;
  }

  @media only screen and (max-width: 395px) {
    width: 16vw;
  }
`

const Web3StatusConnect = styled(Web3StatusGeneric)`
  background-color: ${({ theme }) => theme.royalBlue};
  color: ${({ theme }) => theme.white};
  border: 1px solid ${({ theme }) => theme.royalBlue};
  font-weight: 500;
  :hover,
  :focus {
    background-color: ${({ theme }) => darken(0.1, theme.royalBlue)};
  }
`

export default function WalletModal({
  isOpen,
  error,
  onDismiss,
  pendingTransactions,
  confirmedTransactions,
  ENSName,
  setError
}) {
  const { account, networkId, connectorName, setConnector } = useWeb3Context()
  const { t } = useTranslation()

  function renderTransactions(transactions, pending) {
    return (
      <TransactionListWrapper>
        {transactions.map((hash, i) => {
          return <Transaction key={i} hash={hash} pending={pending} />
        })}
      </TransactionListWrapper>
    )
  }

  function wrappedOnDismiss() {
    onDismiss()
  }

  function requestLogin() {
    setConnector('Injected', { suppressAndThrowErrors: true }).catch(error => {
      if (error.code === Connector.errorCodes.UNSUPPORTED_NETWORK) {
        setError(error)
      }
    })
    onDismiss()
  }

  function getWalletDisplay() {
    if (connectorName === 'Network' && (window.ethereum || window.web3) && !error)
      return (
        <UpperSection>
          <h4>Permission required</h4>
          <h5>Uniswap.Ninja uses your account information to display your balances.</h5>
          <br />
          <Web3StatusConnect onClick={requestLogin}>
            <Text>{t('Connect')}</Text>
            <Link2Icon />
          </Web3StatusConnect>
        </UpperSection>
      )
    else if (error) {
      return (
        <UpperSection>
          <h4>Wrong Network</h4>
          <h5>Please connect to the main Ethereum network.</h5>
        </UpperSection>
      )
    } else if (account) {
      return (
        <>
          <UpperSection>
            <YourAccount>
              <h5>Your Account</h5>
              {ENSName && (
                <AccountControl hasENS={!!ENSName} isENS={true}>
                  <StyledLink hasENS={!!ENSName} isENS={true} href={getEtherscanLink(networkId, ENSName, 'address')}>
                    {ENSName} ↗{' '}
                  </StyledLink>

                  <Copy toCopy={ENSName} />
                </AccountControl>
              )}

              <AccountControl hasENS={!!ENSName} isENS={false}>
                <StyledLink hasENS={!!ENSName} isENS={false} href={getEtherscanLink(networkId, account, 'address')}>
                  {account} ↗{' '}
                </StyledLink>

                <Copy toCopy={account} />
              </AccountControl>
            </YourAccount>
          </UpperSection>
          {!!pendingTransactions.length || !!confirmedTransactions.length ? (
            <LowerSection>
              <h5>Recent Transactions</h5>
              {renderTransactions(pendingTransactions, true)}
              {renderTransactions(confirmedTransactions, false)}
            </LowerSection>
          ) : (
            <LowerSection>
              <h5>Your transactions will appear here...</h5>
            </LowerSection>
          )}
        </>
      )
    } else {
      return (
        <UpperSection>
          <h4>No Ethereum account found</h4>
          <h5>Please visit this page in a Web3 enabled browser.</h5>
          <h5>
            <Link href={'https://ethereum.org/use/#_3-what-is-a-wallet-and-which-one-should-i-use'}>Learn more ↗</Link>
          </h5>
        </UpperSection>
      )
    }
  }

  return (
    <Modal isOpen={isOpen} onDismiss={wrappedOnDismiss} minHeight={null}>
      <Wrapper>{getWalletDisplay()}</Wrapper>
    </Modal>
  )
}
