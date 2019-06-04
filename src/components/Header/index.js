import React from 'react'
import styled from 'styled-components'

import { Link } from '../../theme'
import logo from '../../assets/images/logo.png'
import Web3Status from '../Web3Status'
import { darken } from 'polished'

const HeaderElement = styled.div`
  margin: 1.25rem;
  display: flex;
  min-width: 0;
`

const Title = styled.div`
  display: flex;
  align-items: center;

  #image {
    font-size: 1.5rem;
    margin-right: 1rem;
  }

  #link {
    text-decoration-color: ${({ theme }) => theme.wisteriaPurple};
  }

  #title {
    display: inline;
    font-size: 1rem;
    font-weight: 500;
    color: ${({ theme }) => theme.wisteriaPurple};
    margin: 0 10px;
    :hover {
      color: ${({ theme }) => darken(0.2, theme.wisteriaPurple)};
    }
  }
`

const Logo = styled.img`
  width: 30px;
  height: 30px;
`

const ExtraLink = styled.h1`
  display: inline;
  font-size: 1rem;
  font-weight: 500;
  color: ${({ theme }) => theme.klerosPurple};
  margin: 0 10px;
  :hover {
    color: ${({ theme }) => darken(0.2, theme.wisteriaPurple)};
  }
`

export default function Header() {
  return (
    <>
      <HeaderElement>
        <Title>
          <Logo alt="Uniswap Ninja Logo" src={logo} />
          <Link id="link" href="https://uniswap.io">
            <h1 id="title">Uniswap.Ninja</h1>
          </Link>
          <Link href="https://docs.uniswap.io/">
            <ExtraLink>Docs</ExtraLink>
          </Link>
          <Link href="https://kleros.io">
            <ExtraLink>Kleros Integration</ExtraLink>
          </Link>
        </Title>
      </HeaderElement>

      <HeaderElement>
        <Web3Status />
      </HeaderElement>
    </>
  )
}
