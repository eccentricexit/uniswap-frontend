import React, { Suspense, lazy } from 'react'
import styled from 'styled-components'
import { BrowserRouter, Redirect, Route, Switch } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTelegram, faGithub, faTwitter } from '@fortawesome/free-brands-svg-icons'
import { faBullhorn } from '@fortawesome/free-solid-svg-icons'
import { toast } from 'react-toastify'

import Web3ReactManager from '../components/Web3ReactManager'
import Header from '../components/Header'
import NavigationTabs from '../components/NavigationTabs'

import 'react-toastify/dist/ReactToastify.css'
import './toast.css'

const Swap = lazy(() => import('./Swap'))
const Send = lazy(() => import('./Send'))
const Pool = lazy(() => import('./Pool'))

const HeaderWrapper = styled.div`
  ${({ theme }) => theme.flexRowNoWrap}
  width: 100%;
  justify-content: space-between;
`

const BodyWrapper = styled.div`
  ${({ theme }) => theme.flexRowNoWrap}
  width: 100%;
  justify-content: center;
  flex-grow: 1;
  flex-basis: 0;
  overflow: auto;
`

const Body = styled.div`
  width: 35rem;
  margin: 0.1rem 1.25rem;
`
const FooterWrapper = styled.div`
  width: 100%;
  height: 50px;
  background-color: ${({ theme }) => theme.klerosPurple}
  color: white;
  display: flex;
  align-items: center;
  justify-content: space-between;
`

const SocialLinksWrapper = styled.div`
  margin-right: 20px;
`
const SocialLink = styled.a`
  margin: 10px;
  color: white;
`

const KlerosLink = styled.a`
  margin-left: 20px;
  :visited {
    color: white;
  }
`

toast.configure({
  autoClose: false,
  position: 'bottom-right'
})

export default function App() {
  return (
    <>
      <Suspense fallback={null}>
        <HeaderWrapper>
          <Header />
        </HeaderWrapper>
        <BodyWrapper>
          <Body>
            <Web3ReactManager>
              <BrowserRouter>
                <NavigationTabs />
                {/* this Suspense is for route code-splitting */}
                <Suspense fallback={null}>
                  <Switch>
                    <Route exact strict path="/swap" component={Swap} />
                    <Route exact strict path="/send" component={Send} />
                    <Route
                      path={[
                        '/add-liquidity',
                        '/remove-liquidity',
                        '/create-exchange',
                        '/create-exchange/:tokenAddress?'
                      ]}
                      component={Pool}
                    />
                    <Redirect to="/swap" />
                  </Switch>
                </Suspense>
              </BrowserRouter>
            </Web3ReactManager>
          </Body>
        </BodyWrapper>
        <FooterWrapper>
          <KlerosLink href="https://kleros.io">Learn more</KlerosLink>
          <SocialLinksWrapper>
            <SocialLink href="https://t.me/kleros">
              <FontAwesomeIcon size="lg" icon={faTelegram} />
            </SocialLink>
            <SocialLink href="https://github.com/kleros">
              <FontAwesomeIcon size="lg" icon={faGithub} />
            </SocialLink>
            <SocialLink href="https://blog.kleros.io">
              <FontAwesomeIcon size="lg" icon={faBullhorn} />
            </SocialLink>
            <SocialLink href="https://twitter.com/kleros_io">
              <FontAwesomeIcon size="lg" icon={faTwitter} />
            </SocialLink>
          </SocialLinksWrapper>
        </FooterWrapper>
      </Suspense>
    </>
  )
}
